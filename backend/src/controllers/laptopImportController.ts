
import { Request, Response } from "express";
import { logCallFailureSafely } from "../utils/eventLogger";
import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { parse } from "csv-parse/sync";

import Product from "../models/Product";
import Inventory from "../models/Inventory";

const DEFAULT_STOCK = 60;
const DEFAULT_RESERVED = 0;
const DEFAULT_WAREHOUSE = "Main Warehouse";

const numericFields = new Set([
  "price",
  "rating",
  "cpu_core_count",
  "cpu_thread_count",
  "cpu_p_cores",
  "cpu_e_cores",
  "cpu_lp_e_cores",
  "ram_gb",
  "storage_gb",
  "display_width_px",
  "display_height_px",
  "display_size_inch",
  "gpu_vram_gb",
  "warranty_years",
]);

type CsvRow = Record<string, string>;

type SpecificationValue = string | number | null;

const makeSku = (brand: string, model: string): string => {
  const hash = createHash("sha256")
    .update(`${brand.toLowerCase()}:${model.toLowerCase()}`)
    .digest("hex")
    .slice(0, 20)
    .toUpperCase();

  return `LAPCSV-${hash}`;
};

const convertSpecifications = (
  row: CsvRow
): Record<string, SpecificationValue> => {
  const specifications: Record<string, SpecificationValue> = {};

  for (const [key, rawValue] of Object.entries(row)) {
    const value = (rawValue ?? "").trim();

    if (value === "") {
      specifications[key] = null;
      continue;
    }

    if (numericFields.has(key)) {
      const numberValue = Number(value);

      specifications[key] = Number.isFinite(numberValue)
        ? numberValue
        : null;
    } else {
      specifications[key] = value;
    }
  }

  return specifications;
};

const makeDescription = (
  brand: string,
  model: string,
  specs: Record<string, SpecificationValue>
): string => {
  const details: string[] = [`${brand} ${model}`];

  if (specs.cpu_brand && specs.cpu_model) {
    const cpu = [
      specs.cpu_brand,
      specs.cpu_series,
      specs.cpu_model,
    ]
      .filter(Boolean)
      .join(" ");

    details.push(`Processor: ${cpu}`);
  }

  if (specs.ram_gb !== null && specs.ram_gb !== undefined) {
    details.push(`RAM: ${specs.ram_gb} GB`);
  }

  if (specs.storage_gb !== null && specs.storage_gb !== undefined) {
    details.push(`Storage: ${specs.storage_gb} GB`);
  }

  if (
    specs.display_size_inch !== null &&
    specs.display_size_inch !== undefined
  ) {
    details.push(`Display: ${specs.display_size_inch} inches`);
  }

  if (specs.os_name) {
    details.push(`Operating system: ${specs.os_name}`);
  }

  return details.join(" | ");
};

export const importLaptopCsv = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const csvPath = path.resolve(
      __dirname,
      "../../data/laptopinfo.csv"
    );

    if (!fs.existsSync(csvPath)) {
      res.status(404).json({
        success: false,
        message: "Laptop CSV not found.",
        expectedPath: csvPath,
      });
      return;
    }

    const csvText = fs.readFileSync(csvPath, "utf8");

    const rows = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      trim: true,
    }) as CsvRow[];

    if (rows.length === 0) {
      res.status(400).json({
        success: false,
        message: "The CSV file contains no data rows.",
      });
      return;
    }

    const productOperations: Array<{
      updateOne: {
        filter: { sku: string };
        update: {
          $set: Record<string, unknown>;
          $setOnInsert: { sku: string };
        };
        upsert: true;
      };
    }> = [];

    const skippedRows: number[] = [];
    const seenSkus = new Set<string>();

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];

      const brand = (row.brand ?? "").trim();
      const model = (row.model ?? "").trim();
      const price = Number(row.price);

      if (
        !brand ||
        !model ||
        row.price?.trim() === "" ||
        !Number.isFinite(price) ||
        price < 0
      ) {
        skippedRows.push(index + 2);
        continue;
      }

      const sku = makeSku(brand, model);

      if (seenSkus.has(sku)) {
        skippedRows.push(index + 2);
        continue;
      }

      seenSkus.add(sku);

      const specifications = convertSpecifications(row);

      productOperations.push({
        updateOne: {
          filter: { sku },
          update: {
            $set: {
              name: model,
              description: makeDescription(
                brand,
                model,
                specifications
              ),
              category: row.device_category?.trim() || "Laptop",
              price,
              specifications,
            },
            $setOnInsert: { sku },
          },
          upsert: true,
        },
      });
    }

    if (productOperations.length === 0) {
      res.status(400).json({
        success: false,
        message: "No valid laptop rows were found.",
        skippedRows: skippedRows.length,
      });
      return;
    }

    // Create or update products in batches.
    // The deterministic SKU prevents duplicate catalogue entries.
    const productResult = await Product.bulkWrite(
      productOperations,
      { ordered: false }
    );

    const skus = productOperations.map(
      (operation) => operation.updateOne.filter.sku
    );

    const importedProducts = await Product.find({
      sku: { $in: skus },
    }).select("_id sku");

    if (importedProducts.length !== productOperations.length) {
      throw new Error(
        "Some imported products could not be retrieved from MongoDB."
      );
    }

    // Set stock defaults only when inventory does not already exist.
    // Existing stock and reserved quantities are never overwritten.
    const inventoryOperations = importedProducts.map((product) => ({
      updateOne: {
        filter: { product: product._id },
        update: {
          $setOnInsert: {
            product: product._id,
            stock: DEFAULT_STOCK,
            reserved: DEFAULT_RESERVED,
            warehouse: DEFAULT_WAREHOUSE,
          },
        },
        upsert: true,
      },
    }));

    const inventoryResult = await Inventory.bulkWrite(
      inventoryOperations,
      { ordered: false }
    );

    res.status(200).json({
      success: true,
      message: "Laptop catalogue imported successfully.",
      csvRows: rows.length,
      validRows: productOperations.length,
      skippedRows: skippedRows.length,
      productRecordsCreated: productResult.upsertedCount,
      productRecordsUpdated: productResult.modifiedCount,
      inventoryRecordsCreated: inventoryResult.upsertedCount,
      defaultStockPerNewInventory: DEFAULT_STOCK,
      defaultReserved: DEFAULT_RESERVED,
      stockPreservedOnReimport: true,
    });
  } catch (error) {
    console.error("Laptop CSV import error:", error);
    await logCallFailureSafely(
      "unavailable",
      "Laptop catalogue import failed",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to import laptop catalogue.",
      error:
        error instanceof Error
          ? error.message
          : "Unknown error",
    });
  }
};
