import { generateGeminiResponse } from "./geminiService";

export interface ExtractedLeadData {
  product?: string;
  quantity?: number;
  budget?: number;
  timeRequirement?: string;
  intent: "purchase" | "inquiry" | "support" | "other";
  urgency: "low" | "medium" | "high";
}

export const extractLeadData = async (
  customerMessage: string
): Promise<ExtractedLeadData> => {
  const prompt = `
You are RELAY, an AI sales agent.

Analyze the customer's message and extract sales lead information.

Return ONLY valid JSON.
Do not include markdown.
Do not include explanations.

The JSON must follow this exact structure:

{
  "product": "string or null",
  "quantity": "number or null",
  "budget": "number or null",
  "timeRequirement": "string or null",
  "intent": "purchase | inquiry | support | other",
  "urgency": "low | medium | high"
}

Rules:

1. Extract the product or service the customer wants.
2. Extract quantity if mentioned.
3. Convert budget to a numeric amount.
4. Extract the customer's requested timeframe.
5. Determine the customer's intent.
6. Determine urgency based on the language used.
7. If information is missing, use null.
8. Never invent information.

Customer message:

"${customerMessage}"
`;

  const response = await generateGeminiResponse(prompt);

  try {
    const cleanedResponse = response
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(cleanedResponse) as ExtractedLeadData;
  } catch (error) {
    console.error("Failed to parse Gemini response:", response);

    throw new Error(
      `AI response parsing failed: ${
        error instanceof Error
          ? error.message
          : "the provider returned invalid JSON"
      }`
    );
  }
};