const INTERNAL_ROLES = new Set([
  "ADMIN",
  "SALESPERSON",
  "MANAGER",
  "FINANCE",
  "OPERATIONS",
]);

const error = (message, statusCode) => Object.assign(new Error(message), { statusCode });
const money = (value) => (value === null || value === undefined ? null : String(value));

const productSelect = {
  id: true,
  name: true,
  sku: true,
  category: true,
  basePrice: true,
};

const ensureCustomerAccess = async (prismaClient, user, customerId) => {
  if (INTERNAL_ROLES.has(user.role)) return;
  if (user.role !== "CUSTOMER") throw error("Insufficient permissions", 403);
  const account = await prismaClient.user.findUnique({ where: { id: user.id }, select: { customerId: true } });
  if (!account?.customerId || account.customerId !== customerId) throw error("Insufficient permissions", 403);
};

const recommendation = (product, type, reason, score, internal) => ({
  product: {
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category,
  },
  type,
  reason,
  ...(internal ? { potentialValue: money(product.basePrice), relevanceScore: score } : {}),
});

export const listCustomerRecommendations = async (prismaClient, user, customerId) => {
  await ensureCustomerAccess(prismaClient, user, customerId);
  const [orders, quotations, products] = await Promise.all([
    prismaClient.order.findMany({
      where: { quotation: { customerId } },
      select: { items: { select: { productId: true, product: { select: productSelect } } } },
    }),
    prismaClient.quotation.findMany({
      where: { customerId, status: { notIn: ["CANCELLED", "REJECTED"] } },
      select: { items: { select: { productId: true, product: { select: productSelect } } } },
    }),
    prismaClient.product.findMany({ where: { active: true }, select: productSelect, orderBy: { name: "asc" } }),
  ]);
  const purchased = new Set(orders.flatMap((order) => order.items.map((item) => item.productId)));
  const quoted = new Set(quotations.flatMap((quotation) => quotation.items.map((item) => item.productId)));
  const categories = new Set(quotations.flatMap((quotation) => quotation.items.map((item) => item.product?.category).filter(Boolean)));
  const internal = INTERNAL_ROLES.has(user.role);
  return products
    .filter((product) => !purchased.has(product.id))
    .map((product) => {
      const sameCategory = categories.has(product.category);
      const type = quoted.has(product.id) || sameCategory ? "UPSELL" : "CROSS_SELL";
      const reason = sameCategory
        ? `Complements products already quoted in the ${product.category} category.`
        : "Active product not present in the customer's purchase or quotation history.";
      return recommendation(product, type, reason, sameCategory ? 85 : 55, internal);
    })
    .slice(0, 10);
};

export const listQuotationRecommendations = async (prismaClient, user, quotationId) => {
  const quotation = await prismaClient.quotation.findUnique({
    where: { id: quotationId },
    select: { customerId: true, items: { select: { productId: true, product: { select: productSelect } } } },
  });
  if (!quotation) throw error("Quotation not found", 404);
  await ensureCustomerAccess(prismaClient, user, quotation.customerId);
  const existing = new Set(quotation.items.map((item) => item.productId));
  const categories = new Set(quotation.items.map((item) => item.product?.category).filter(Boolean));
  const products = await prismaClient.product.findMany({ where: { active: true }, select: productSelect, orderBy: { name: "asc" } });
  const internal = INTERNAL_ROLES.has(user.role);
  return products
    .filter((product) => !existing.has(product.id))
    .map((product) => {
      const sameCategory = categories.has(product.category);
      return recommendation(
        product,
        sameCategory ? "UPSELL" : "CROSS_SELL",
        sameCategory ? "Matches a category already present in this quotation." : "Adds an active product category not yet represented in this quotation.",
        sameCategory ? 85 : 50,
        internal,
      );
    })
    .slice(0, 10);
};
