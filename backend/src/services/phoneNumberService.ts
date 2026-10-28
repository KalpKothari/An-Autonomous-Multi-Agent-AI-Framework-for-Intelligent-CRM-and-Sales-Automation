export const normalizeIndianPhoneNumber = (
  phone: string
): string => {
  const digits = phone.replace(/\D/g, "");

  let normalizedDigits = digits;

  // Remove India's country code if provided
  if (
    normalizedDigits.startsWith("91") &&
    normalizedDigits.length === 12
  ) {
    normalizedDigits = normalizedDigits.slice(2);
  }

  // Hard validation
  if (normalizedDigits.length !== 10) {
    throw new Error(
      "Invalid Indian mobile number. Exactly 10 digits are required."
    );
  }

  return `+91${normalizedDigits}`;
};