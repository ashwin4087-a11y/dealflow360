export const createSubscriptionService = (prisma) => {
  const getAllSubscriptions = async () => {
    return await prisma.subscription.findMany({
      include: {
        customer: true,
        product: true,
        payments: true,
      },
      orderBy: {
        startDate: 'desc',
      }
    });
  };

  const getSubscriptionById = async (id) => {
    return await prisma.subscription.findUnique({
      where: { id },
      include: {
        customer: true,
        product: true,
        payments: {
          include: {
            invoice: true
          }
        },
      },
    });
  };

  return {
    getAllSubscriptions,
    getSubscriptionById,
  };
};
