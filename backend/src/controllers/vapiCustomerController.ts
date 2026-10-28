
import { Request, Response } from "express";
import {
  findCustomerByPhone,
  createCustomer,
} from "../services/customerService";
import { normalizeIndianPhoneNumber } from "../services/phoneNumberService";
import { logCallFailureSafely } from "../utils/eventLogger";

/**
 * Validates an Indian mobile number and returns its normalized form.
 * Accepts 10 digits or a 91-prefixed 12-digit number.
 * Spaces, dots, hyphens and a leading + are allowed.
 */
const validateAndNormalizePhone = (value: unknown): string | null => {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  let digits = String(value).replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }

  if (!/^[6-9]\d{9}$/.test(digits)) {
    return null;
  }

  return normalizeIndianPhoneNumber(digits);
};

export const findCustomerForVapi = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const phone = validateAndNormalizePhone(req.body.phone);

    if (!phone) {
      await logCallFailureSafely(
        "unavailable",
        "Vapi customer identification failed",
        new Error("the caller did not provide a valid Indian mobile number")
      );
      res.status(400).json({
        success: false,
        message:
          "A valid Indian mobile number is required. Provide 10 digits, or include the +91 country code.",
      });
      return;
    }

    const customer = await findCustomerByPhone(phone);

    if (customer) {
      res.status(200).json({
        success: true,
        exists: true,
        customerId: customer._id,
        name: customer.name,
        phone: customer.phone,
        company: customer.company || null,
        message: "Existing customer found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      exists: false,
      message:
        "Customer not found. Ask for the company name before creating the customer.",
    });
  } catch (error) {
    console.error("Vapi customer lookup error:", error);
    await logCallFailureSafely(
      "unavailable",
      "Vapi customer lookup failed",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to find customer",
    });
  }
};

export const createCustomerForVapi = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const phone = validateAndNormalizePhone(req.body.phone);
    const { name, company } = req.body;

    if (!phone) {
      await logCallFailureSafely(
        "unavailable",
        "Vapi customer creation failed",
        new Error("the caller did not provide a valid Indian mobile number")
      );
      res.status(400).json({
        success: false,
        message:
          "A valid Indian mobile number is required. Provide 10 digits, or include the +91 country code.",
      });
      return;
    }

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof company !== "string" ||
      !company.trim()
    ) {
      await logCallFailureSafely(
        "unavailable",
        "Vapi customer creation failed",
        new Error("customer name or company name was not captured")
      );
      res.status(400).json({
        success: false,
        message: "A customer name and company name are required.",
      });
      return;
    }

    const result = await createCustomer({
      phone,
      name: name.trim(),
      company: company.trim(),
    });

    res.status(result.created ? 201 : 200).json({
      success: true,
      created: result.created,
      customerId: result.customer._id,
      name: result.customer.name,
      phone: result.customer.phone,
      company: result.customer.company || null,
      message: result.created
        ? "New customer created."
        : "Existing customer found.",
    });
  } catch (error) {
    console.error("Vapi customer creation error:", error);
    await logCallFailureSafely(
      "unavailable",
      "Vapi customer creation failed",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to create customer",
    });
  }
};
