import { ExtractedLeadData } from "./salesAgentService";
import { findProductWithInventory } from "./inventoryLookupService";
import { generateGeminiResponse } from "./geminiService";

export const makeSalesDecision = async (
  leadData: ExtractedLeadData
): Promise<string> => {
  if (!leadData.product) {
    return "I need to know which product you are interested in.";
  }

  const result = await findProductWithInventory(leadData.product);

  if (!result) {
    return `I'm sorry, I couldn't find ${leadData.product} in our product catalog.`;
  }

  const stock = result.inventory?.stock ?? 0;
  const reserved = result.inventory?.reserved ?? 0;
  const availableStock = stock - reserved;

  const prompt = `
You are RELAY, an AI sales agent.

A customer is interested in:
Product: ${leadData.product}
Quantity requested: ${leadData.quantity ?? "not specified"}
Budget: ${leadData.budget ?? "not specified"}
Time requirement: ${leadData.timeRequirement ?? "not specified"}

Inventory:
Total stock: ${stock}
Reserved stock: ${reserved}
Available stock: ${availableStock}

Decide how the sales agent should respond.

Rules:
- If enough stock is available, confidently tell the customer the requested quantity is available.
- If stock is insufficient, clearly explain the available quantity and suggest a follow-up or alternative.
- Do not invent products, prices, discounts, or availability.
- Keep the response natural and suitable for a phone conversation.
- Do not mention that you are an AI model.
`;

  return await generateGeminiResponse(prompt);
};