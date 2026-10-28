import { Request, Response } from "express";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import Invoice from "../models/Invoice";
import { logCallFailureSafely } from "../utils/eventLogger";

const THANK_YOU = "Thank you for choosing our company!";

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const twoDigitWords = (n: number) =>
  n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`;

const threeDigitWords = (n: number) => {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return [hundreds ? `${ONES[hundreds]} Hundred` : "", rest ? twoDigitWords(rest) : ""].filter(Boolean).join(" ");
};

const indianNumberWords = (n: number): string => {
  if (n === 0) return "Zero";
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor(n / 100000) % 100;
  const thousand = Math.floor(n / 1000) % 100;
  const rest = n % 1000;
  return [
    crore ? `${indianNumberWords(crore)} Crore` : "",
    lakh ? `${twoDigitWords(lakh)} Lakh` : "",
    thousand ? `${twoDigitWords(thousand)} Thousand` : "",
    rest ? threeDigitWords(rest) : "",
  ].filter(Boolean).join(" ");
};

const amountInWords = (amount: number) => {
  const totalPaise = Math.round(Math.max(0, amount) * 100);
  const rupees = Math.floor(totalPaise / 100);
  const paise = totalPaise % 100;
  return `Indian Rupees ${indianNumberWords(rupees)}${paise ? ` and ${twoDigitWords(paise)} Paise` : ""} Only`;
};

export const downloadInvoicePdf = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { invoiceId } = req.params;

  if (!mongoose.isValidObjectId(invoiceId)) {
    res.status(400).json({
      success: false,
      message: "A valid invoiceId is required.",
    });
    return;
  }

  try {
    const invoice = await Invoice.findById(invoiceId)
      .populate("customer")
      .populate("product")
      .lean();

    if (!invoice) {
      res.status(404).json({
        success: false,
        message: "Invoice not found.",
      });
      return;
    }

    if (invoice.status === "cancelled") {
      res.status(409).json({
        success: false,
        message: "A cancelled invoice cannot be downloaded.",
      });
      return;
    }

    const data = invoice as unknown as Record<string, any>;
    const customer = data.customer ?? {};
    const product = data.product ?? {};

    const customerName =
      customer.name ??
      customer.fullName ??
      customer.customerName ??
      "Customer";

    const productName =
      product.name ?? product.title ?? "Laptop";

    const formatINR = (amount: number) =>
      `INR ${amount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      info: {
        Title: `Invoice ${invoice.invoiceNumber}`,
        Author: "RELAY",
        Subject: `Sales invoice for ${customerName}`,
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${invoice.invoiceNumber}.pdf"`
    );
    res.setHeader("Cache-Control", "private, no-store");

    doc.on("error", (error) => {
      console.error("Invoice PDF stream error:", error);
      void logCallFailureSafely(
        String(invoice._id),
        "Invoice PDF generation failed",
        error
      );
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Failed to generate invoice PDF.",
        });
      } else {
        res.destroy(error);
      }
    });

    doc.pipe(res);

    /* ---------------- layout & drawing (presentation only) ---------------- */
    const W = doc.page.width;
    const M = 40;
    const CW = W - M * 2;
    const C = {
      navy: "#15132B",
      lime: "#BEF264",
      limeSoft: "#F7FEE7",
      indigo: "#6366F1",
      indigoSoft: "#EEF2FF",
      indigoLine: "#C7D2FE",
      violet: "#8B5CF6",
      violetSoft: "#F5F3FF",
      fuchsia: "#D946EF",
      cream: "#F5F4F0",
      ink: "#0F172A",
      slate: "#64748B",
      line: "#E2E8F0",
      white: "#FFFFFF",
    };
    const BOLD = "Helvetica-Bold";

    type TextOpts = { width?: number; align?: "left" | "center" | "right"; font?: string; size?: number; color?: string; spacing?: number; height?: number };
    const write = (value: string, x: number, y: number, o: TextOpts = {}) => {
      doc.font(o.font ?? "Helvetica").fontSize(o.size ?? 9).fillColor(o.color ?? C.ink);
      doc.text(value, x, y, {
        width: o.width,
        align: o.align ?? "left",
        characterSpacing: o.spacing ?? 0,
        ...(o.height ? { height: o.height, ellipsis: true } : {}),
      });
    };
    const label = (value: string, x: number, y: number, color = C.slate, width?: number, align: "left" | "right" = "left") =>
      write(value.toUpperCase(), x, y, { font: BOLD, size: 7, color, spacing: 0.9, width, align });
    // Helvetica cap height is 0.718em, so this vertically centres a single line in a box.
    const vcenter = (top: number, height: number, size: number) => top + (height - size * 0.718) / 2;
    const fitSize = (value: string, font: string, maxWidth: number, start: number, min = 8) => {
      let size = start;
      doc.font(font);
      while (size > min && doc.fontSize(size).widthOfString(value) > maxWidth) size -= 0.5;
      return size;
    };
    const brandGradient = (x1: number, x2: number) =>
      doc.linearGradient(x1, 0, x2, 0).stop(0, C.indigo).stop(0.5, C.violet).stop(1, C.fuchsia);

    const issuedOn = new Date(invoice.issuedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const orderRef = `#${String(invoice.order ?? "").slice(-8).toUpperCase()}`;
    const totalText = formatINR(invoice.totalAmount);
    const taxRate = invoice.subtotal > 0 ? (invoice.taxAmount / invoice.subtotal) * 100 : 0;
    const taxLabel = taxRate > 0 ? `Tax (${Number(taxRate.toFixed(1))}%)` : "Tax";
    const productMeta = [product.brand, product.model, product.sku ? `SKU ${product.sku}` : ""]
      .filter((v: unknown) => v !== undefined && v !== null && String(v).trim())
      .map(String)
      .join("  ·  ");
    const productSub =
      productMeta ||
      (typeof product.description === "string" && product.description.trim()) ||
      `Order reference ${orderRef}`;

    // Header band
    doc.rect(0, 0, W, 138).fill(C.navy);
    doc.save();
    doc.rect(0, 0, W, 138).clip();
    doc.circle(W - 30, 4, 82).lineWidth(22).strokeColor(C.lime, 0.12).stroke();
    doc.circle(W - 230, 150, 48).lineWidth(12).strokeColor(C.indigo, 0.22).stroke();
    doc.restore();

    doc.roundedRect(M, 40, 46, 46, 12).fill(C.lime);
    write("R", M, vcenter(40, 46, 24), { width: 46, align: "center", font: BOLD, size: 24, color: C.navy });
    write("RELAY", M + 60, 42, { font: BOLD, size: 24, color: C.white, spacing: 1 });
    write("AI Sales Platform", M + 61, 72, { size: 9, color: C.indigoLine });
    write("Sales invoice  ·  Generated electronically", M, 104, { size: 8.5, color: "#A5B4FC" });

    write("INVOICE", W - M - 260, 40, { width: 260, align: "right", font: BOLD, size: 26, color: C.lime, spacing: 2 });
    write(`No. ${invoice.invoiceNumber}`, W - M - 260, 74, { width: 260, align: "right", font: BOLD, size: 10.5, color: C.white });
    const pillW = 74;
    doc.roundedRect(W - M - pillW, 96, pillW, 20, 10).fill(C.lime);
    write(String(invoice.status ?? "issued").toUpperCase(), W - M - pillW, vcenter(96, 20, 7.5), { width: pillW, align: "center", font: BOLD, size: 7.5, color: C.navy, spacing: 1 });

    doc.rect(0, 138, W, 5).fill(brandGradient(0, W));

    // Invoice meta
    const metaY = 164;
    const metaH = 52;
    const metaGap = 10;
    const metaW = (CW - metaGap * 3) / 4;
    const meta: [string, string][] = [
      ["Invoice number", String(invoice.invoiceNumber)],
      ["Invoice date", issuedOn],
      ["Order reference", orderRef],
      ["Currency", String(invoice.currency || "INR")],
    ];
    const accents = [C.indigo, C.violet, C.fuchsia, C.navy];
    meta.forEach(([k, v], i) => {
      const x = M + i * (metaW + metaGap);
      doc.roundedRect(x, metaY, metaW, metaH, 10).fill(C.cream);
      doc.roundedRect(x + 8, metaY + 14, 3, 24, 1.5).fill(accents[i]);
      label(k, x + 18, metaY + 13, C.slate, metaW - 26);
      write(v, x + 18, metaY + 28, { width: metaW - 26, height: 14, font: BOLD, size: fitSize(v, BOLD, metaW - 26, 10.5, 8), color: C.navy });
    });

    // Billed to + amount due
    const partyY = 234;
    const partyH = 120;
    const leftW = 290;
    doc.roundedRect(M, partyY, leftW, partyH, 12).lineWidth(1).strokeColor(C.line).stroke();
    doc.save();
    doc.roundedRect(M, partyY, leftW, partyH, 12).clip();
    doc.rect(M, partyY, 5, partyH).fill(C.indigo);
    doc.restore();
    label("Billed to", M + 22, partyY + 16, C.indigo);
    write(String(customerName), M + 22, partyY + 30, { width: leftW - 44, height: 20, font: BOLD, size: fitSize(String(customerName), BOLD, leftW - 44, 15, 11), color: C.navy });

    const contact: [string, string][] = (
      [
        ["Company", customer.company],
        ["Phone", customer.phone],
        ["Email", customer.email],
        ["Address", typeof customer.address === "string" ? customer.address : ""],
      ] as [string, unknown][]
    )
      .filter(([, v]) => v !== undefined && v !== null && String(v).trim())
      .map(([k, v]) => [k, String(v)] as [string, string])
      .slice(0, 3);
    if (contact.length === 0) {
      write("Contact details are kept on file.", M + 22, partyY + 62, { size: 9, color: C.slate, width: leftW - 44 });
    } else {
      contact.forEach(([k, v], i) => {
        const y = partyY + 60 + i * 16;
        write(k, M + 22, y, { size: 8.5, color: C.slate, width: 56 });
        write(v, M + 80, y, { size: 9, font: BOLD, color: C.ink, width: leftW - 102, height: 12 });
      });
    }

    const rx = M + leftW + 12;
    const rw = CW - leftW - 12;
    doc.roundedRect(rx, partyY, rw, partyH, 12).fill(C.navy);
    doc.save();
    doc.roundedRect(rx, partyY, rw, partyH, 12).clip();
    doc.circle(rx + rw + 6, partyY + partyH + 4, 54).lineWidth(14).strokeColor(C.lime, 0.14).stroke();
    doc.restore();
    label("Amount due", rx + 18, partyY + 16, "#D9F99D");
    write(totalText, rx + 18, partyY + 31, { font: BOLD, size: fitSize(totalText, BOLD, rw - 36, 22, 12), color: C.white, width: rw - 36 });
    write(`${invoice.quantity} x ${formatINR(invoice.unitPrice)} + tax`, rx + 18, partyY + 60, { size: 8.5, color: C.indigoLine, width: rw - 36, height: 12 });
    doc.moveTo(rx + 18, partyY + 80).lineTo(rx + rw - 18, partyY + 80).lineWidth(0.6).strokeColor(C.white, 0.18).stroke();
    label("Tax included", rx + 18, partyY + 89, "#A5B4FC");
    write(formatINR(invoice.taxAmount), rx + 18, partyY + 101, { font: BOLD, size: 10, color: C.lime, width: rw - 36, height: 13 });

    // Items table
    const headY = 376;
    label("Order details", M, headY, C.slate);
    const tY = headY + 16;
    const cols = [
      { title: "#", w: 34, align: "center" as const },
      { title: "Item & description", w: 211, align: "left" as const },
      { title: "Qty", w: 56, align: "center" as const },
      { title: "Unit price", w: 102, align: "right" as const },
      { title: "Amount", w: CW - 34 - 211 - 56 - 102, align: "right" as const },
    ];
    const colX = cols.map((_, i) => M + cols.slice(0, i).reduce((t, c) => t + c.w, 0));
    const pad = 12;
    doc.roundedRect(M, tY, CW, 28, 8).fill(C.navy);
    cols.forEach((c, i) => {
      write(c.title.toUpperCase(), colX[i] + pad, vcenter(tY, 28, 7.5), { width: c.w - pad * 2, align: c.align, font: BOLD, size: 7.5, color: C.white, spacing: 0.8 });
    });

    const rowY = tY + 34;
    const nameW = cols[1].w - pad * 2;
    doc.font(BOLD).fontSize(10.5);
    const nameH = Math.min(doc.heightOfString(String(productName), { width: nameW }), 26);
    const rowH = Math.max(50, Math.ceil(nameH) + 37);
    doc.roundedRect(M, rowY, CW, rowH, 8).fill(C.cream);
    doc.roundedRect(colX[0] + 8, vcenter(rowY, rowH, 0) - 12, cols[0].w - 16, 24, 6).fill(C.white);
    write("01", colX[0] + 8, vcenter(vcenter(rowY, rowH, 0) - 12, 24, 8.5), { width: cols[0].w - 16, align: "center", font: BOLD, size: 8.5, color: C.indigo });
    write(String(productName), colX[1] + pad, rowY + 12, { width: nameW, height: 26, font: BOLD, size: 10.5, color: C.navy });
    write(String(productSub), colX[1] + pad, rowY + 16 + nameH, { width: nameW, height: 11, size: 8, color: C.slate });
    write(String(invoice.quantity), colX[2] + pad, vcenter(rowY, rowH, 10), { width: cols[2].w - pad * 2, align: "center", font: BOLD, size: 10, color: C.ink });
    const priceText = formatINR(invoice.unitPrice);
    const priceSize = fitSize(priceText, "Helvetica", cols[3].w - pad - 4, 9.5, 7);
    write(priceText, colX[3] + 4, vcenter(rowY, rowH, priceSize), { width: cols[3].w - pad - 4, align: "right", size: priceSize, color: C.ink });
    const lineText = formatINR(invoice.subtotal);
    const lineSize = fitSize(lineText, BOLD, cols[4].w - pad - 4, 9.5, 7);
    write(lineText, colX[4] + 4, vcenter(rowY, rowH, lineSize), { width: cols[4].w - pad - 4, align: "right", font: BOLD, size: lineSize, color: C.navy });

    // Totals + amount in words
    const totalsY = rowY + rowH + 16;
    const tw = 232;
    const tx = W - M - tw;
    const totalsRow = (name: string, value: string, y: number) => {
      write(name, tx + 4, y, { size: 9.5, color: C.slate, width: 120 });
      write(value, tx, y, { size: 10, font: BOLD, color: C.ink, width: tw - 4, align: "right" });
    };
    totalsRow("Subtotal", formatINR(invoice.subtotal), totalsY + 4);
    totalsRow(taxLabel, formatINR(invoice.taxAmount), totalsY + 24);
    doc.moveTo(tx, totalsY + 46).lineTo(tx + tw, totalsY + 46).lineWidth(0.8).strokeColor(C.line).stroke();
    doc.roundedRect(tx, totalsY + 54, tw, 40, 10).fill(brandGradient(tx, tx + tw));
    write("TOTAL PAYABLE", tx + 16, vcenter(totalsY + 54, 40, 8), { font: BOLD, size: 8, color: C.white, spacing: 1 });
    const totalSize = fitSize(totalText, BOLD, tw - 130, 15, 9);
    write(totalText, tx + 110, vcenter(totalsY + 54, 40, totalSize), { width: tw - 126, align: "right", font: BOLD, size: totalSize, color: C.white });

    const ww = CW - tw - 18;
    doc.roundedRect(M, totalsY, ww, 94, 12).fill(C.indigoSoft);
    label("Amount in words", M + 16, totalsY + 14, C.indigo);
    write(amountInWords(invoice.totalAmount), M + 16, totalsY + 28, { width: ww - 32, height: 36, font: "Helvetica-Oblique", size: 9.5, color: C.navy });
    write(THANK_YOU, M + 16, totalsY + 72, { width: ww - 32, height: 12, font: BOLD, size: 8.5, color: C.violet });

    // Authorised signatory
    const signY = totalsY + 94 + 48;
    const signW = 200;
    const signX = W - M - signW;
    write("For RELAY", signX, signY, { width: signW, align: "right", font: BOLD, size: 10, color: C.navy });
    doc.moveTo(signX + 40, signY + 52).lineTo(W - M, signY + 52).lineWidth(0.8).strokeColor("#CBD5E1").stroke();
    write("Authorised signatory", signX, signY + 58, { width: signW, align: "right", size: 8.5, color: C.slate });

    // Footer
    const footY = doc.page.height - 36;
    doc.rect(0, footY, W, 36).fill(C.navy);
    doc.rect(0, footY, W, 3).fill(brandGradient(0, W));
    write("Thank you for choosing our company!", M, vcenter(footY + 3, 33, 9), { font: BOLD, size: 9, color: C.lime, width: 260 });
    write(`Generated electronically by RELAY  ·  ${invoice.invoiceNumber}`, W - M - 260, vcenter(footY + 3, 33, 7.5), { size: 7.5, color: C.indigoLine, width: 260, align: "right" });

    doc.end();
  } catch (error) {
    console.error("Download invoice PDF error:", error);
    await logCallFailureSafely(
      String(req.params?.invoiceId ?? "unavailable"),
      "Invoice PDF retrieval failed",
      error
    );

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve or generate invoice PDF.",
      });
    } else {
      res.destroy(
        error instanceof Error ? error : new Error("PDF generation failed")
      );
    }
  }
};

export const getInvoiceByOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { orderId } = req.params;

  if (!mongoose.isValidObjectId(orderId)) {
    res.status(400).json({
      success: false,
      message: "A valid orderId is required.",
    });
    return;
  }

  try {
    const invoice = await Invoice.findOne({ order: orderId })
      .select("_id invoiceNumber order status")
      .lean();

    if (!invoice) {
      res.status(404).json({
        success: false,
        message: "No invoice was found for this order.",
      });
      return;
    }

    if (invoice.status === "cancelled") {
      res.status(409).json({
        success: false,
        message: "This invoice has been cancelled.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error("Invoice lookup error:", error);
    await logCallFailureSafely(
      String(req.params?.orderId ?? "unavailable"),
      "Invoice lookup failed",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to retrieve the invoice.",
    });
  }
};