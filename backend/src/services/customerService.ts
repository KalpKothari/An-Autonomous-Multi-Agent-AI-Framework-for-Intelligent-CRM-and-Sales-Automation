import Customer from "../models/Customer";
import { normalizeIndianPhoneNumber } from "./phoneNumberService";

interface CustomerData {
  name?: string;
  phone: string;
  email?: string;
  company?: string;
}

export const findCustomerByPhone = async (phone: string) => {
  const normalizedPhone = normalizeIndianPhoneNumber(phone);

  return Customer.findOne({
    phone: normalizedPhone,
  });
};

export const createCustomer = async (data: CustomerData) => {
  const normalizedPhone = normalizeIndianPhoneNumber(data.phone);

  const existingCustomer = await Customer.findOne({
    phone: normalizedPhone,
  });

  if (existingCustomer) {
    return {
      customer: existingCustomer,
      created: false,
    };
  }

  const newCustomer = await Customer.create({
    name: data.name || "Unknown Customer",
    phone: normalizedPhone,
    email: data.email,
    company: data.company,
  });

  return {
    customer: newCustomer,
    created: true,
  };
};

// Keep this for existing backend functionality
export const findOrCreateCustomer = async (
  data: CustomerData
) => {
  const existingCustomer = await findCustomerByPhone(data.phone);

  if (existingCustomer) {
    return {
      customer: existingCustomer,
      created: false,
    };
  }

  return createCustomer(data);
};