
import Customer from "../models/Customer";
import Lead from "../models/Lead";
import { ExtractedLeadData } from "./salesAgentService";

const normalizeProduct = (product?: string): string =>
  (product || "").trim().toLowerCase().replace(/\s+/g, " ");

const normalizeTimeframe = (timeframe?: string): string =>
  (timeframe || "").trim().toLowerCase().replace(/\s+/g, " ");

export const createLeadFromAI = async (
  customerId: string,
  leadData: ExtractedLeadData
) => {
  const customer = await Customer.findById(customerId);

  if (!customer) {
    throw new Error("Customer not found");
  }

  const product = (leadData.product || "").trim();

  if (!product) {
    throw new Error("Product is required to create a lead");
  }

  const existingLeads = await Lead.find({
    customer: customerId,
  });

  const duplicate = existingLeads.find((lead) => {
    return (
      normalizeProduct(lead.product) === normalizeProduct(product) &&
      lead.quantity === leadData.quantity &&
      normalizeTimeframe(lead.timeRequirement) ===
        normalizeTimeframe(leadData.timeRequirement) &&
      lead.status !== "won" &&
      lead.status !== "lost"
    );
  });

  if (duplicate) {
    // Update fields only when new values are provided.
    if (leadData.quantity !== undefined) {
      duplicate.quantity = leadData.quantity;
    }

    if (leadData.budget !== undefined) {
      duplicate.budget = leadData.budget;
    }

    if (leadData.timeRequirement !== undefined) {
      duplicate.timeRequirement = leadData.timeRequirement;
    }

    if (leadData.intent !== undefined) {
      duplicate.intent = leadData.intent;
    }

    if (leadData.urgency !== undefined) {
      duplicate.urgency = leadData.urgency;
    }

    await duplicate.save();
    return duplicate;
  }

  return Lead.create({
    customer: customerId,
    product,
    quantity: leadData.quantity,
    budget: leadData.budget,
    timeRequirement: leadData.timeRequirement,
    intent: leadData.intent || "purchase",
    urgency: leadData.urgency || "medium",
    status: "new",
  });
};
