const { prisma } = require('../index');
const { generateTransactionId } = require('../utils/helper.util');
const { sendSMS } = require('../utils/sms.util');
const { io } = require('../index');

// Create payment
const createPayment = async (req, res, next) => {
  try {
    const {
      invoiceId,
      customerId,
      amount,
      method,
      reference,
      paidAt,
      notes
    } = req.body;

    // Validate invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true
      }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'Invoice is already fully paid'
      });
    }

    // Generate transaction ID
    const transactionId = await generateTransactionId();

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        transactionId,
        invoiceId,
        customerId,
        amount,
        method,
        reference,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        receivedBy: req.user.id,
        notes,
        status: 'COMPLETED'
      },
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            totalAmount: true,
            paidAmount: true
          }
        },
        customer: {
          select: {
            name: true,
            phone: true,
            email: true
          }
        }
      }
    });

    // Update invoice
    const newPaidAmount = invoice.paidAmount + amount;
    const newDueAmount = invoice.totalAmount - newPaidAmount;
    
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaidAmount,
        dueAmount: newDueAmount,
        status: newDueAmount <= 0 ? 'PAID' : 
                newDueAmount < invoice.totalAmount ? 'PARTIAL_PAID' : 
                new Date() > invoice.dueDate ? 'OVERDUE' : 'PENDING'
      }
    });

    // Update customer balance
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        balance: { decrement: amount }
      }
    });

    // Send SMS receipt
    const smsMessage = `Payment received: ${amount} for invoice #${invoice.invoiceNumber}. Transaction ID: ${transactionId}. New due: ${newDueAmount}.`;
    
    await sendSMS({
      to: payment.customer.phone,
      message: smsMessage
    });

    // Send real-time notification via socket
    io.to('admin_room').emit('new_payment', {
      paymentId: payment.id,
      customerName: payment.customer.name,
      amount: payment.amount,
      method: payment.method,
      timestamp: new Date()
    });

    io.to(`customer_${customerId}`).emit('payment_confirmed', {
      transactionId: payment.transactionId,
      amount: payment.amount,
      invoiceNumber: invoice.invoiceNumber
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_PAYMENT',
        entityType: 'PAYMENT',
        entityId: payment.id,
        details: JSON.stringify({
          transactionId: payment.transactionId,
          amount: payment.amount,
          method: payment.method
        }),
        ipAddress: req.ip
      }
    });

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        payment,
        invoice: updatedInvoice
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all payments
const getPayments = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      method,
      customerId,
      invoiceId,
      startDate,
      endDate,
      sortBy = 'paidAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build where clause
    const where = { status: 'COMPLETED' };
    
    if (search) {
      where.OR = [
        { transactionId: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { invoice: { invoiceNumber: { contains: search, mode: 'insensitive' } } }
      ];
    }
    
    if (method) where.method = method;
    if (customerId) where.customerId = customerId;
    if (invoiceId) where.invoiceId = invoiceId;
    
    if (startDate && endDate) {
      where.paidAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // Get total count
    const total = await prisma.payment.count({ where });

    // Get payments
    const payments = await prisma.payment.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            customerId: true,
            phone: true
          }
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            month: true
          }
        }
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: parseInt(limit)
    });

    // Calculate summary
    const summary = await prisma.payment.aggregate({
      where,
      _sum: { amount: true },
      _count: true
    });

    // Daily totals for chart
    const dailyTotals = await prisma.$queryRaw`
      SELECT 
        DATE(paid_at) as date,
        COUNT(*) as count,
        SUM(amount) as total
      FROM payments
      WHERE paid_at >= NOW() - INTERVAL '30 days'
        AND status = 'COMPLETED'
      GROUP BY DATE(paid_at)
      ORDER BY date
    `;

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        summary: {
          totalPayments: summary._count,
          totalAmount: summary._sum.amount || 0
        },
        chartData: {
          daily: dailyTotals
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get payment statistics
const getPaymentStats = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query; // day, week, month, year
    
    let dateFilter;
    const now = new Date();
    
    switch (period) {
      case 'day':
        dateFilter = new Date(now.setDate(now.getDate() - 1));
        break;
      case 'week':
        dateFilter = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        dateFilter = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        dateFilter = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        dateFilter = new Date(now.setMonth(now.getMonth() - 1));
    }

    // Get payment methods distribution
    const methods = await prisma.payment.groupBy({
      by: ['method'],
      where: {
        paidAt: { gte: dateFilter },
        status: 'COMPLETED'
      },
      _sum: { amount: true },
      _count: true
    });

    // Get daily totals
    const dailyTotals = await prisma.$queryRaw`
      SELECT 
        DATE(paid_at) as date,
        SUM(amount) as total,
        COUNT(*) as count
      FROM payments
      WHERE paid_at >= ${dateFilter}
        AND status = 'COMPLETED'
      GROUP BY DATE(paid_at)
      ORDER BY date
    `;

    // Get top customers
    const topCustomers = await prisma.$queryRaw`
      SELECT 
        c.name,
        c.customer_id,
        SUM(p.amount) as total_paid,
        COUNT(p.id) as payment_count
      FROM payments p
      JOIN customers c ON p.customer_id = c.id
      WHERE p.paid_at >= ${dateFilter}
        AND p.status = 'COMPLETED'
      GROUP BY c.id, c.name, c.customer_id
      ORDER BY total_paid DESC
      LIMIT 10
    `;

    res.json({
      success: true,
      data: {
        period,
        dateFilter,
        methods,
        dailyTotals,
        topCustomers
      }
    });
  } catch (error) {
    next(error);
  }
};

// Process online payment (stripe example)
const processOnlinePayment = async (req, res, next) => {
  try {
    const { invoiceId, amount, paymentMethod, customerId } = req.body;

    // Get invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Process payment with Stripe
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      payment_method: paymentMethod,
      confirm: true,
      return_url: `${process.env.CLIENT_URL}/payment/success`,
      metadata: {
        invoiceId,
        customerId,
        invoiceNumber: invoice.invoiceNumber
      }
    });

    // Record payment if successful
    if (paymentIntent.status === 'succeeded') {
      const transactionId = `STRIPE_${paymentIntent.id}`;
      
      const payment = await prisma.payment.create({
        data: {
          transactionId,
          invoiceId,
          customerId,
          amount,
          method: 'STRIPE',
          reference: paymentIntent.id,
          status: 'COMPLETED'
        }
      });

      // Update invoice and customer balance
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: { increment: amount },
          dueAmount: { decrement: amount },
          status: invoice.totalAmount <= (invoice.paidAmount + amount) ? 'PAID' : 'PARTIAL_PAID'
        }
      });

      await prisma.customer.update({
        where: { id: customerId },
        data: {
          balance: { decrement: amount }
        }
      });

      // Send real-time notification
      io.to(`customer_${customerId}`).emit('payment_confirmed', {
        transactionId: payment.transactionId,
        amount: payment.amount,
        invoiceNumber: invoice.invoiceNumber
      });

      res.json({
        success: true,
        message: 'Payment processed successfully',
        data: {
          payment,
          clientSecret: paymentIntent.client_secret
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment processing failed',
        data: paymentIntent
      });
    }
  } catch (error) {
    next(error);
  }
};

// Generate payment receipt
const generateReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        customer: true,
        invoice: true
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Generate receipt PDF
    const doc = new PDFDocument();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt_${payment.transactionId}.pdf"`);

    doc.pipe(res);

    // Add content
    doc.fontSize(20).text('PAYMENT RECEIPT', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(12);
    doc.text(`Receipt #: ${payment.transactionId}`);
    doc.text(`Date: ${new Date(payment.paidAt).toLocaleDateString()}`);
    doc.text(`Time: ${new Date(payment.paidAt).toLocaleTimeString()}`);
    doc.moveDown();
    
    doc.text('Received from:', { underline: true });
    doc.text(payment.customer.name);
    doc.text(`Customer ID: ${payment.customer.customerId}`);
    doc.moveDown();
    
    doc.text('Payment Details:', { underline: true });
    doc.text(`Amount: $${payment.amount.toFixed(2)}`);
    doc.text(`Method: ${payment.method}`);
    doc.text(`For Invoice: ${payment.invoice?.invoiceNumber || 'N/A'}`);
    doc.text(`Reference: ${payment.reference || 'N/A'}`);
    doc.moveDown();
    
    doc.text('Status: PAID', { bold: true });
    
    if (payment.notes) {
      doc.moveDown();
      doc.text(`Notes: ${payment.notes}`);
    }
    
    doc.moveDown(2);
    doc.text('Thank you for your payment!', { align: 'center' });
    doc.text('Your ISP Team', { align: 'center' });
    
    doc.end();
  } catch (error) {
    next(error);
  }
};

// Refund payment
const refundPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: true,
        customer: true
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.method === 'STRIPE') {
      // Process Stripe refund
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      
      const refund = await stripe.refunds.create({
        payment_intent: payment.reference,
        amount: Math.round(payment.amount * 100),
        reason: 'requested_by_customer'
      });

      if (refund.status !== 'succeeded') {
        throw new Error('Refund failed');
      }
    }

    // Create refund record
    const refund = await prisma.payment.create({
      data: {
        transactionId: `REFUND_${payment.transactionId}`,
        invoiceId: payment.invoiceId,
        customerId: payment.customerId,
        amount: -payment.amount, // Negative amount for refund
        method: payment.method,
        reference: `Refund of ${payment.transactionId}`,
        notes: `Refund: ${reason}`,
        status: 'COMPLETED'
      }
    });

    // Update invoice
    await prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: {
        paidAmount: { decrement: payment.amount },
        dueAmount: { increment: payment.amount },
        status: 'PENDING'
      }
    });

    // Update customer balance
    await prisma.customer.update({
      where: { id: payment.customerId },
      data: {
        balance: { increment: payment.amount }
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'REFUND_PAYMENT',
        entityType: 'PAYMENT',
        entityId: payment.id,
        details: JSON.stringify({
          originalPayment: payment.transactionId,
          refundAmount: payment.amount,
          reason
        }),
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: refund
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPayment,
  getPayments,
  getPaymentStats,
  processOnlinePayment,
  generateReceipt,
  refundPayment
};