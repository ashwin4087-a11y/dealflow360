export const createInvoiceService = (prisma) => {
  const getAllInvoices = async () => {
    return await prisma.invoice.findMany({
      include: {
        customer: true,
        items: true,
        payments: true,
      },
      orderBy: {
        issueDate: 'desc',
      }
    });
  };

  const getInvoiceById = async (id) => {
    return await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
        payments: true,
      },
    });
  };

  const recordPayment = async (invoiceId, paymentData) => {
    const { amount, method } = paymentData;
    const payment = await prisma.invoicePayment.create({
      data: {
        invoiceId,
        amount,
        method,
        status: 'Paid',
      }
    });
    
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true }
    });
    
    const totalPaid = invoice.payments.reduce((acc, p) => acc + Number(p.amount), 0);
    let newStatus = invoice.status;
    if (totalPaid >= Number(invoice.total)) {
      newStatus = 'PAID';
    }
    
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: newStatus }
    });
    
    return payment;
  };

  return {
    getAllInvoices,
    getInvoiceById,
    recordPayment,
  };
};
