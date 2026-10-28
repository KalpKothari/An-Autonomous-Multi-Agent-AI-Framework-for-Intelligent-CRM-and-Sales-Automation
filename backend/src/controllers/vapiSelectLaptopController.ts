
import { Request, Response } from "express";
import Customer from "../models/Customer";
import Lead from "../models/Lead";
import { logCallFailureSafely } from "../utils/eventLogger";

export const selectLaptopForVapi = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { customerPhone, selectedLaptop } = req.body;

    if (
      typeof customerPhone !== "string" ||
      typeof selectedLaptop !== "string" ||
      !selectedLaptop.trim()
    ) {
      await logCallFailureSafely(
        "unavailable",
        "Vapi laptop selection failed",
        new Error("customer phone or selected laptop was not provided")
      );
      res.status(400).json({
        success: false,
        message: "Customer phone and selected laptop are required.",
      });
      return;
    }

    const digits = customerPhone.replace(/\D/g, "");
    const indianNumber =
      digits.length === 12 && digits.startsWith("91")
        ? digits.slice(2)
        : digits;

    if (!/^[6-9]\d{9}$/.test(indianNumber)) {
      await logCallFailureSafely(
        "unavailable",
        "Vapi laptop selection failed",
        new Error("the caller did not provide a valid Indian mobile number")
      );
      res.status(400).json({
        success: false,
        message: "A valid Indian mobile number is required.",
      });
      return;
    }

    const customer = await Customer.findOne({
      phone: `+91${indianNumber}`,
    });

    if (!customer) {
      await logCallFailureSafely(
        "unavailable",
        "Vapi laptop selection failed",
        new Error("no customer matched the supplied phone number")
      );
      res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
      return;
    }

    const lead = await Lead.findOne({
      customer: customer._id,
    }).sort({ createdAt: -1 });

    if (!lead) {
      await logCallFailureSafely(
        String(customer._id),
        "Vapi laptop selection failed",
        new Error("no lead was found for the matched customer")
      );
      res.status(404).json({
        success: false,
        message: "No lead found for this customer.",
      });
      return;
    }

    lead.selectedLaptop = selectedLaptop.trim();
    await lead.save();

    res.status(200).json({
      success: true,
      message: "Selected laptop saved successfully.",
      leadId: lead._id,
      selectedLaptop: lead.selectedLaptop,
    });
  } catch (error) {
    console.error("Vapi laptop selection error:", error);
    await logCallFailureSafely(
      "unavailable",
      "Vapi laptop selection failed",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to save laptop selection.",
    });
  }
};
