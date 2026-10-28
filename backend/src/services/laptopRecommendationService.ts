import Product from "../models/Product";
import Inventory from "../models/Inventory";

export interface LaptopRecommendationInput {
  useCase?: string;
  brand?: string;
  budget?: number;
  quantity?: number;
  limit?: number;
}

interface LaptopCandidate {
  product: {
    _id: string;
    name: string;
    sku?: string;
    description?: string;
    category?: string;
    price: number;
    specifications: Record<string, unknown>;
  };
  brand: string;
  availableStock: number;
  canFulfill: boolean | null;
  score: number;
  reasons: string[];
}

const normalize = (value: unknown): string =>
  String(value ?? "").toLowerCase().trim();

const getSpecification = (
  specs: Record<string, unknown>,
  keys: string[]
): unknown => {
  for (const key of keys) {
    const value = specs[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return undefined;
};

const getSpecificationText = (
  specs: Record<string, unknown>,
  patterns: RegExp[]
): string => {
  return Object.entries(specs)
    .filter(([key, value]) =>
      patterns.some((pattern) => pattern.test(key)) &&
      value !== null &&
      value !== undefined &&
      value !== ""
    )
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" ");
};

const getNumber = (
  specs: Record<string, unknown>,
  keys: string[]
): number | undefined => {
  const value = getSpecification(specs, keys);

  if (value === undefined) {
    return undefined;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : undefined;
};

const getBrand = (
  specs: Record<string, unknown>,
  description?: string
): string => {
  const brand = getSpecification(specs, ["brand"]);

  if (brand) {
    return String(brand);
  }

  // Imported descriptions begin with the brand and model.
  return description?.split(" ")[0] ?? "Unknown";
};

const scoreLaptop = (
  name: string,
  description: string,
  specs: Record<string, unknown>,
  price: number,
  brand: string,
  input: LaptopRecommendationInput
): { score: number; reasons: string[] } => {
  let score = 0;
  const reasons: string[] = [];

  const cpu = getSpecificationText(specs, [
    /cpu_brand/,
    /cpu_series/,
    /cpu_model/,
    /processor/,
  ]);

  const gpu = getSpecificationText(specs, [
    /gpu/,
    /graphics/,
    /video_card/,
  ]);

  const ram = getNumber(specs, ["ram_gb"]);
  const storage = getNumber(specs, ["storage_gb"]);

  const fullText = normalize(
    `${name} ${description} ${cpu} ${gpu} ${JSON.stringify(specs)}`
  );

  const useCase = normalize(input.useCase);

  if (input.brand) {
    if (normalize(brand).includes(normalize(input.brand))) {
      score += 20;
      reasons.push(`Matches your preferred brand: ${brand}.`);
    } else {
      score -= 5;
    }
  }

  if (input.budget !== undefined && input.budget > 0) {
    if (price <= input.budget) {
      score += 20;
      reasons.push("Within your stated budget.");
    } else {
      score -= Math.min(30, 10 + (price - input.budget) / input.budget * 20);
      reasons.push("Above your stated budget.");
    }
  }

  if (/gaming|game/.test(useCase)) {
    if (/rtx|geforce|radeon rx|arc graphics|dedicated/.test(gpu)) {
      score += 30;
      reasons.push("Graphics information may suit gaming; verify the exact GPU model.");
    } else if (/integrated|uhd graphics|iris xe/.test(gpu)) {
      score -= 15;
    }

    if (ram !== undefined && ram >= 16) {
      score += 10;
      reasons.push(`${ram} GB RAM.`);
    }

    if (/core i7|core i9|ryzen 7|ryzen 9/.test(cpu)) {
      score += 10;
    }
  } else if (/programming|developer|development|coding/.test(useCase)) {
    if (ram !== undefined && ram >= 16) {
      score += 20;
      reasons.push(`${ram} GB RAM for development workloads.`);
    } else if (ram !== undefined && ram >= 8) {
      score += 8;
      reasons.push(`${ram} GB RAM.`);
    }

    if (/core i5|core i7|core i9|ryzen 5|ryzen 7|ryzen 9/.test(cpu)) {
      score += 15;
    }
  } else if (/editing|design|video|creative|render/.test(useCase)) {
    if (/rtx|geforce|radeon rx|arc graphics/.test(gpu)) {
      score += 20;
      reasons.push("Has graphics information worth evaluating for creative workloads.");
    }

    if (ram !== undefined && ram >= 16) {
      score += 15;
      reasons.push(`${ram} GB RAM.`);
    }

    if (/core i7|core i9|ryzen 7|ryzen 9/.test(cpu)) {
      score += 10;
    }
  } else {
    // General office work, studies and everyday use.
    if (ram !== undefined && ram >= 8) {
      score += 15;
      reasons.push(`${ram} GB RAM for everyday multitasking.`);
    }

    if (ram !== undefined && ram >= 16) {
      score += 5;
    }

    if (storage !== undefined && storage >= 256) {
      score += 10;
      reasons.push(`${storage} GB storage.`);
    }

    if (/core i3|core i5|core i7|ryzen 3|ryzen 5|ryzen 7/.test(cpu)) {
      score += 10;
    }

    if (/student|study|office|excel|basic|everyday/.test(useCase)) {
      score += 5;
    }
  }

  if (reasons.length === 0) {
    reasons.push("Potential option; review its specifications against your requirements.");
  }

  return { score, reasons };
};

export const recommendLaptops = async (
  input: LaptopRecommendationInput
) => {
  const requestedQuantity =
    Number.isInteger(input.quantity) && Number(input.quantity) > 0
      ? Number(input.quantity)
      : undefined;

  const budget =
    input.budget !== undefined &&
    Number.isFinite(input.budget) &&
    input.budget > 0
      ? input.budget
      : undefined;

  const limit =
    Number.isInteger(input.limit) && Number(input.limit) > 0
      ? Math.min(Number(input.limit), 3)
      : 3;

  const products = await Product.find({
    $or: [
      { category: /laptop/i },
      { sku: /^LAPCSV-/ },
      { "specifications.device_category": /laptop/i },
    ],
  }).lean();

  if (products.length === 0) {
    return {
      success: true,
      count: 0,
      recommendations: [],
      message: "No laptop catalogue records were found.",
    };
  }

  const productIds = products.map((product) => product._id);

  const inventoryRecords = await Inventory.find({
    product: { $in: productIds },
  }).lean();

  const inventoryByProduct = new Map(
    inventoryRecords.map((item) => [
      String(item.product),
      Math.max(0, item.stock - item.reserved),
    ])
  );

  const candidates: LaptopCandidate[] = products.map((product) => {
    const specs =
      (product.specifications as Record<string, unknown> | undefined) ?? {};

    const brand = getBrand(specs, product.description);
    const availableStock =
      inventoryByProduct.get(String(product._id)) ?? 0;

    const { score, reasons } = scoreLaptop(
      product.name,
      product.description ?? "",
      specs,
      product.price,
      brand,
      { ...input, budget }
    );

    return {
      product: {
        _id: String(product._id),
        name: product.name,
        sku: product.sku,
        description: product.description,
        category: product.category,
        price: product.price,
        specifications: specs,
      },
      brand,
      availableStock,
      canFulfill:
        requestedQuantity !== undefined
          ? availableStock >= requestedQuantity
          : null,
      score,
      reasons,
    };
  });

  
  // Apply strict brand filtering.
  // Never silently substitute another brand.
  let filtered = candidates;

  const normalizeBrand = (value: unknown): string =>
    normalize(value)
      .replace(/\b(laptops?|notebooks?|incorporated|inc|corporation|corp)\b/g, "")
      .replace(/[^a-z0-9]/g, "");

  if (input.brand?.trim()) {
    const requestedBrand = normalizeBrand(input.brand);

    filtered = filtered.filter(
      (candidate) => normalizeBrand(candidate.brand) === requestedBrand
    );
  }

  // Apply a strict per-laptop budget ceiling.
  if (budget !== undefined) {
    filtered = filtered.filter(
      (candidate) => candidate.product.price <= budget
    );
  }

  // Prioritize products that can fulfil the requested quantity,
  // then rank by suitability score and available stock.
  filtered.sort((a, b) => {
    if (requestedQuantity !== undefined) {
      const aCanFulfill = a.availableStock >= requestedQuantity;
      const bCanFulfill = b.availableStock >= requestedQuantity;

      if (aCanFulfill !== bCanFulfill) {
        return aCanFulfill ? -1 : 1;
      }
    }

    if (a.score !== b.score) {
      return b.score - a.score;
    }

    return b.availableStock - a.availableStock;
  });

  const recommendations = filtered.slice(0, limit).map((candidate) => ({
    productId: candidate.product._id,
    name: candidate.product.name,
    brand: candidate.brand,
    sku: candidate.product.sku,
    price: candidate.product.price,
    description: candidate.product.description,
    specifications: candidate.product.specifications,
    availableStock: candidate.availableStock,
    requestedQuantity: requestedQuantity ?? null,
    canFulfill: candidate.canFulfill,
    reasons: candidate.reasons,
  }));

  return {
    success: true,
    count: recommendations.length,
    requestedBrand: input.brand ?? null,
    useCase: input.useCase ?? null,
    budget: budget ?? null,
    requestedQuantity: requestedQuantity ?? null,
    recommendations,
    
message:
  recommendations.length > 0
    ? "Laptop recommendations retrieved from the catalogue using the specified brand and budget constraints."
    : input.brand && budget !== undefined
      ? `No ${input.brand} laptops were found within the budget of ${budget} per laptop. Ask the customer whether they would like to change the budget or consider another brand.`
      : input.brand
        ? `No laptops from ${input.brand} were found in the catalogue. Ask the customer whether they would like to consider another brand.`
        : budget !== undefined
          ? `No laptops were found within the budget of ${budget} per laptop. Ask the customer whether they would like to change the budget.`
          : "No suitable laptop recommendations were found. Ask the customer whether they would like to adjust their requirements.",

  };
};