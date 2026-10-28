
import { Request, Response } from "express";
import Customer from "../models/Customer";
import Conversation from "../models/Conversation";
import {
  logCallSuccess,
  logCallFailureSafely,
} from "../utils/eventLogger";

export const handleVapiWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  let customerIdForLog = "unavailable";

  // File logging must never interrupt the existing webhook flow.
  const safeLogSuccess = async (
    customerId: string,
    customerName: string,
    message: string
  ): Promise<void> => {
    try {
      await logCallSuccess(customerId, customerName, message);
    } catch {
      // Preserve existing terminal behavior and HTTP responses.
    }
  };

  try {
    console.log(
      "VAPI WEBHOOK RECEIVED:",
      JSON.stringify(req.body, null, 2)
    );

    const { message } = req.body ?? {};

    if (message?.type !== "end-of-call-report") {
      res.status(200).json({
        success: true,
        message: "Event received; no completed-call action required.",
      });
      return;
    }

    const call = message.call ?? {};
    const artifact = message.artifact ?? {};
    const metadata = call.metadata ?? {};

    if (metadata.customerId) {
      customerIdForLog = String(metadata.customerId);
    }

    const transcript =
      typeof artifact.transcript === "string"
        ? artifact.transcript.trim()
        : "";

    const callId =
      typeof call.id === "string" ? call.id : undefined;

    // Identify the customer using metadata or the caller's phone number.
    let customer = metadata.customerId
      ? await Customer.findById(metadata.customerId)
      : null;

    const transcriptPhoneMatch = transcript.match(
      /(?:\+?91[\s.-]?)?([6-9](?:[\s.-]?\d){9})/
    );
    const transcriptPhoneCandidate = transcript.match(
      /(?:\+?91[\s.-]?)?\d(?:[\s.-]?\d){8,}/
    )?.[0];

    const phone =
      metadata.customerPhone ??
      call.customer?.number ??
      call.customer?.phone ??
      transcriptPhoneMatch?.[0];
    const phoneCandidate =
      typeof phone === "string" && phone.trim()
        ? phone
        : transcriptPhoneCandidate;
    const phoneDigits =
      typeof phoneCandidate === "string"
        ? phoneCandidate.replace(/\D/g, "")
        : "";
    const normalizedPhoneDigits =
      phoneDigits.length === 12 && phoneDigits.startsWith("91")
        ? phoneDigits.slice(2)
        : phoneDigits;
    const hasValidIndianPhone = /^[6-9]\d{9}$/.test(
      normalizedPhoneDigits
    );

    if (!customer && typeof phoneCandidate === "string") {
      if (hasValidIndianPhone) {
        customer = await Customer.findOne({
          phone: `+91${normalizedPhoneDigits}`,
        });
      }
    }

    if (!customer) {
      const failureReason =
        typeof phoneCandidate === "string" && !hasValidIndianPhone
          ? "caller provided an invalid Indian mobile number"
          : hasValidIndianPhone
            ? "no customer matched the provided mobile number"
            : metadata.customerId
              ? "the provided customer ID did not match a customer record"
              : "customer ID or phone number was not available in the webhook data";

      await logCallFailureSafely(
        customerIdForLog,
        "Vapi webhook customer identification failed",
        new Error(failureReason)
      );

      res.status(200).json({
        success: true,
        saved: false,
        message: "Customer could not be identified.",
      });
      return;
    }

    customerIdForLog = String(customer._id);

    // Avoid processing the same completed call report twice.
    if (callId) {
      const existing = await Conversation.findOne({
        customer: customer._id,
        intent: `vapi-call:${callId}`,
      });

      if (existing) {
        await safeLogSuccess(
          customerIdForLog,
          customer.name || "Unknown",
          "Duplicate call report skipped"
        );

        res.status(200).json({
          success: true,
          saved: true,
          duplicate: true,
          conversationId: existing._id,
          message: "This call report was already processed.",
        });
        return;
      }
    }

    const startedAt = call.startedAt
      ? new Date(call.startedAt)
      : null;

    const endedAt = call.endedAt
      ? new Date(call.endedAt)
      : new Date();

    let conversationId: unknown;

    // Save the transcript when available.
    if (transcript) {
      const conversation = await Conversation.create({
        customer: customer._id,
        channel: "voice",
        direction: "inbound",
        transcript,
        summary:
          typeof artifact.summary === "string"
            ? artifact.summary
            : undefined,
        intent: callId ? `vapi-call:${callId}` : undefined,
        startedAt:
          startedAt && !Number.isNaN(startedAt.getTime())
            ? startedAt
            : new Date(),
        endedAt:
          !Number.isNaN(endedAt.getTime())
            ? endedAt
            : new Date(),
      });

      conversationId = conversation._id;
    }

    await safeLogSuccess(
      customerIdForLog,
      customer.name || "Unknown",
      transcript
        ? "Call report processed and conversation saved"
        : "Call report processed; no transcript available"
    );

    res.status(200).json({
      success: true,
      saved: Boolean(conversationId),
      conversationId,
      message: transcript
        ? "Call report processed and conversation saved."
        : "Call report processed; no transcript was available.",
    });
  } catch (error) {
    // Keep your existing terminal error output.
    console.error("Vapi webhook error:", {
      message:
        error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      callId: req.body?.message?.call?.id,
      eventType: req.body?.message?.type,
      timestamp: new Date().toISOString(),
    });

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Webhook processing failed";

    await logCallFailureSafely(
      customerIdForLog,
      "Vapi webhook processing failed",
      new Error(errorMessage || "the cause could not be determined")
    );

    res.status(500).json({
      success: false,
      message: "Failed to process Vapi webhook.",
    });
  }
};
