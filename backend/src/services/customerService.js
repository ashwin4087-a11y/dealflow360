const CUSTOMER_FIELDS = {
  id: true,
  name: true,
  email: true,
  phone: true,
  company: true,
  customerTier: true,
  billingAddress: true,
  shippingAddress: true,
  createdAt: true,
  updatedAt: true,
};

export const CUSTOMER_TIERS = new Set([
  "STANDARD",
  "SILVER",
  "GOLD",
  "PLATINUM",
]);

const CUSTOMER_INPUT_FIELDS = [
  "name",
  "email",
  "phone",
  "company",
  "customerTier",
  "billingAddress",
  "shippingAddress",
];

const toPublicCustomer = (customer) =>
  Object.fromEntries(
    Object.keys(CUSTOMER_FIELDS)
      .filter((field) => field in customer)
      .map((field) => [field, customer[field]]),
  );

const fieldLabels = {
  name: "Name",
  email: "Email",
  customerTier: "Customer tier",
};

const serviceError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeOptionalString = (value, field) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw serviceError(`${fieldLabels[field] || field} must be a string`, 400);
  }

  const normalized = value.trim();
  return normalized || null;
};

const validateEmail = (email) => {
  if (email === null) return;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) throw serviceError("Email must be valid", 400);
};

const buildCustomerData = (input, { partial = false } = {}) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw serviceError("Customer data must be an object", 400);
  }

  const unknownFields = Object.keys(input).filter(
    (field) => !CUSTOMER_INPUT_FIELDS.includes(field),
  );
  if (unknownFields.length)
    throw serviceError("Customer contains unsupported fields", 400);

  const data = {};
  for (const field of CUSTOMER_INPUT_FIELDS) {
    if (partial && !(field in input)) continue;
    if (!partial && !(field in input)) continue;
    data[field] = normalizeOptionalString(input[field], field);
  }

  if (!partial && !data.name) throw serviceError("Name is required", 400);
  if (partial && "name" in input && !data.name)
    throw serviceError("Name is required", 400);
  if (data.email) validateEmail(data.email);
  if (
    data.customerTier &&
    !CUSTOMER_TIERS.has(data.customerTier.toUpperCase())
  ) {
    throw serviceError("Customer tier is invalid", 400);
  }
  if (data.customerTier) data.customerTier = data.customerTier.toUpperCase();

  return data;
};

const isNotFound = (customer) => {
  if (!customer) throw serviceError("Customer not found", 404);
  return customer;
};

const mapDatabaseError = (error) => {
  if (error?.code === "P2002")
    return serviceError("Customer email already exists", 409);
  throw error;
};

export const listCustomers = async (prismaClient) => {
  const customers = await prismaClient.customer.findMany({
    select: CUSTOMER_FIELDS,
    orderBy: { name: "asc" },
  });
  return customers.map(toPublicCustomer);
};

export const createCustomer = async (prismaClient, input) => {
  const data = buildCustomerData(input);
  try {
    const customer = await prismaClient.customer.create({
      data,
      select: CUSTOMER_FIELDS,
    });
    return toPublicCustomer(customer);
  } catch (error) {
    throw mapDatabaseError(error);
  }
};

export const getCustomer = async (prismaClient, id) => {
  const customer = await prismaClient.customer.findUnique({
    where: { id },
    select: CUSTOMER_FIELDS,
  });
  return toPublicCustomer(isNotFound(customer));
};

export const updateCustomer = async (prismaClient, id, input) => {
  const data = buildCustomerData(input, { partial: true });
  if (!Object.keys(data).length)
    throw serviceError("At least one customer field is required", 400);

  try {
    const customer = await prismaClient.customer.update({
      where: { id },
      data,
      select: CUSTOMER_FIELDS,
    });
    return toPublicCustomer(isNotFound(customer));
  } catch (error) {
    if (error?.code === "P2025") throw serviceError("Customer not found", 404);
    throw mapDatabaseError(error);
  }
};
