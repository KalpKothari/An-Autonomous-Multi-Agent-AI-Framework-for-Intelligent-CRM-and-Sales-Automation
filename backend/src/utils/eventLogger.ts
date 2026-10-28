
import { appendFile, mkdir } from "fs/promises";
import path from "path";

const logDirectory = path.resolve(__dirname, "../../logs");
const logFile = path.join(logDirectory, "call-events.txt");

function getISTTimestamp(): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

function clean(value: string): string {
  return value.replace(/[\r\n|]+/g, " ").trim();
}

export function getErrorMessage(
  error: unknown,
  fallback = "The cause could not be determined"
): string {
  if (error instanceof Error && error.message.trim()) {
    const validationErrors =
      "errors" in error &&
      typeof error.errors === "object" &&
      error.errors !== null
        ? Object.values(error.errors)
            .filter(
              (detail): detail is { message: string } =>
                typeof detail === "object" &&
                detail !== null &&
                "message" in detail &&
                typeof detail.message === "string"
            )
            .map((detail) => detail.message)
        : [];

    if (validationErrors.length > 0) {
      return `${error.message}: ${validationErrors.join("; ")}`;
    }

    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

export async function logCallFailureSafely(
  customerId: string,
  context: string,
  error: unknown
): Promise<void> {
  try {
    await logCallFailure(
      customerId,
      `${context}: ${getErrorMessage(error)}`
    );
  } catch (loggingError) {
    console.error("Call failure log write error:", loggingError);
  }
}

export async function logCallSuccess(
  customerId: string,
  customerName: string,
  message: string
): Promise<void> {
  const entry =
    `[${getISTTimestamp()} IST] SUCCESS` +
    ` | Customer ID: ${clean(customerId)}` +
    ` | Customer: ${clean(customerName)}` +
    ` | Message: ${clean(message)}`;

  await mkdir(logDirectory, { recursive: true });
  await appendFile(logFile, entry + "\n", "utf8");
}

export async function logCallFailure(
  customerId: string,
  message: string
): Promise<void> {
  const entry =
    `[${getISTTimestamp()} IST] FAILURE` +
    ` | Customer ID: ${clean(customerId)}` +
    ` | Error: ${clean(message).slice(0, 180)}`;

  await mkdir(logDirectory, { recursive: true });
  await appendFile(logFile, entry + "\n", "utf8");
}
