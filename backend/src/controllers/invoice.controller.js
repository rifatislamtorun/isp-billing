const { prisma } = require('../index');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { generateInvoiceNumber } = require('../utils/helper.util');
const { sendEmail } = require('../utils/email.util');

// Generate monthly invoices
const generateMonthlyInvoices = async (req, res, next) => {
  try {
    const { month } = req.body; // Format: YYYY-MM
    
    if (!month) {
      return res.status(400).json({
        success: false,
        message: 'Month is required (YYYY-MM format)'
      });
    }

    // Get all active customers
    const customers = await prisma.customer.findMany({
      where: { 
        status: 'ACTIVE',
        package: { isActive: true }
      },
      include: {
        package: true,
        bandwidthUsage: {
          where: {
            date: {
              gte: new Date(month + '-01'),
              lt: new Date(new Date(month + '-01').setMonth(new Date(month + '-01').getMonth() + 1))
            }
          }
        }
      }
    });

    const results = {
      generated: 0,
      skipped: 0,
      errors: []
    };

    // Generate invoice for each customer
    for (const customer of customers) {
      try {
        // Check if invoice already exists for this month
        const existingInvoice = await prisma.invoice.findFirst({
          where: {
            customerId: customer.id,
            month: month
          }
        });

        if (existingInvoice) {
          results.skipped++;
          continue;
        }

        // Calculate total usage in GB
        const totalUsageMB = customer.bandwidthUsage.reduce((sum, usage) => sum + usage.total, 0);
        const totalUsageGB = totalUsageMB / 1024;

        // Calculate usage charge if package has data limit
        let usageCharge = 0;
        if (customer.package.dataLimit && customer.package.dataLimit !== 'Unlimited') {
          const limitGB = parseFloat(customer.package.dataLimit);
          if (totalUsageGB > limitGB) {
            const extraGB = totalUsageGB - limitGB;
            usageCharge = extraGB * 10; // $10 per extra GB (adjust as needed)
          }
        }

        // Calculate late fee from previous invoices
        const overdueInvoices = await prisma.invoice.findMany({
          where: {
            customerId: customer.id,
            status: 'OVERDUE',
            dueDate: { lt: new Date() }
          }
        });

        let lateFee = 0;
        for (const invoice of overdueInvoices) {
          const daysOverdue = Math.floor((new Date() - invoice.dueDate) / (1000 * 60 * 60 * 24));
          lateFee += invoice.dueAmount * 0.02 * Math.min(daysOverdue, 30); // 2% per day, max 30 days
        }

        // Calculate VAT/Tax
        const vatRate = customer.package.taxRate || 0;
        const subtotal = customer.package.price + usageCharge + lateFee;
        const vat = subtotal * (vatRate / 100);
        
        const totalAmount = subtotal + vat;
        const dueDate = new Date(new Date(month + '-28').setDate(28)); // Due on 28th of the month

        // Generate invoice number
        const invoiceNumber = await generateInvoiceNumber();

        // Create invoice
        const invoice = await prisma.invoice.create({
          data: {
            invoiceNumber,
            customerId: customer.id,
            ispId: customer.ispId,
            month,
            issueDate: new Date(),
            dueDate,
            amount: customer.package.price,
            usageCharge,
            lateFee,
            vat,
            totalAmount,
            dueAmount: totalAmount,
            status: 'PENDING',
            packageCharge: customer.package.price,
            items: {
              create: [
                {
                  description: `Monthly bill for ${customer.package.name}`,
                  quantity: 1,
                  unitPrice: customer.package.price,
                  total: customer.package.price
                },
                ...(usageCharge > 0 ? [{
                  description: `Extra data usage (${totalUsageGB.toFixed(2)} GB)`,
                  quantity: 1,
                  unitPrice: usageCharge,
                  total: usageCharge
                }] : []),
                ...(lateFee > 0 ? [{
                  description: 'Late payment fee',
                  quantity: 1,
                  unitPrice: lateFee,
                  total: lateFee
                }] : []),
                ...(vat > 0 ? [{
                  description: `VAT (${vatRate}%)`,
                  quantity: 1,
                  unitPrice: vat,
                  total: vat
                }] : [])
              ]
            }
          },
          include: {
            items: true,
            customer: {
              select: {
                name: true,
                email: true,
                phone: true,
                address: true
              }
            }
          }
        });

        // Update customer balance
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            balance: { increment: totalAmount }
          }
        });

        // Generate PDF
        const pdfUrl = await generateInvoicePDF(invoice);
        
        // Update invoice with PDF URL
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { pdfUrl }
        });

        // Send email notification
        await sendInvoiceEmail(invoice);

        results.generated++;
      } catch (error) {
        results.errors.push({
          customerId: customer.id,
          error: error.message
        });
        results.skipped++;
      }
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'GENERATE_MONTHLY_INVOICES',
        entityType: 'INVOICE',
        details: JSON.stringify({ month, results }),
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: `Invoices generated: ${results.generated}, skipped: ${results.skipped}`,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

// Generate invoice PDF
const generateInvoicePDF = async (invoice) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        // Save to file system or upload to cloud storage
        const fileName = `invoice_${invoice.invoiceNumber}_${Date.now()}.pdf`;
        const filePath = `uploads/invoices/${fileName}`;
        
        require('fs').writeFileSync(filePath, pdfBuffer);
        resolve(`${process.env.BASE_URL}/${filePath}`);
      });

      // Add content to PDF
      doc.fontSize(20).text('INVOICE', { align: 'center' });
      doc.moveDown();
      
      doc.fontSize(12);
      doc.text(`Invoice #: ${invoice.invoiceNumber}`);
      doc.text(`Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}`);
      doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`);
      doc.moveDown();
      
      // Customer info
      doc.text('Bill To:', { underline: true });
      doc.text(invoice.customer.name);
      doc.text(invoice.customer.address);
      doc.text(`Phone: ${invoice.customer.phone}`);
      doc.text(`Email: ${invoice.customer.email}`);
      doc.moveDown();
      
      // Items table
      const tableTop = doc.y;
      const itemX = 50;
      const descX = 200;
      const qtyX = 350;
      const priceX = 400;
      const totalX = 450;
      
      doc.text('Description', descX, tableTop);
      doc.text('Qty', qtyX, tableTop);
      doc.text('Unit Price', priceX, tableTop);
      doc.text('Total', totalX, tableTop);
      
      doc.moveTo(50, tableTop + 15)
         .lineTo(550, tableTop + 15)
         .stroke();
      
      let y = tableTop + 30;
      
      invoice.items.forEach(item => {
        doc.text(item.description, descX, y);
        doc.text(item.quantity.toString(), qtyX, y);
        doc.text(`$${item.unitPrice.toFixed(2)}`, priceX, y);
        doc.text(`$${item.total.toFixed(2)}`, totalX, y);
        y += 20;
      });
      
      // Total
      y += 10;
      doc.moveTo(50, y)
         .lineTo(550, y)
         .stroke();
      
      y += 20;
      doc.text('Total Amount:', 350, y);
      doc.text(`$${invoice.totalAmount.toFixed(2)}`, totalX, y);
      
      // Status
      y += 30;
      doc.fontSize(14).text(`Status: ${invoice.status}`, 50, y);
      
      if (invoice.notes) {
        y += 30;
        doc.fontSize(10).text(`Notes: ${invoice.notes}`, 50, y);
      }
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Send invoice email
const sendInvoiceEmail = async (invoice) => {
  const subject = `Invoice #${invoice.invoiceNumber} from Your ISP`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Invoice #${invoice.invoiceNumber}</h2>
      <p>Dear ${invoice.customer.name},</p>
      <p>Your invoice for ${invoice.month} is ready.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Description</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Amount</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">Monthly Package</td>
          <td style="padding: 8px; border: 1px solid #ddd;">$${invoice.amount.toFixed(2)}</td>
        </tr>
        ${invoice.usageCharge > 0 ? `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">Extra Usage</td>
          <td style="padding: 8px; border: 1px solid #ddd;">$${invoice.usageCharge.toFixed(2)}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Total Due</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>$${invoice.totalAmount.toFixed(2)}</strong></td>
        </tr>
      </table>
      
      <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
      <p><strong>Status:</strong> ${invoice.status}</p>
      
      <p>Please make payment before the due date to avoid service interruption.</p>
      
      <div style="margin-top: 30px; padding: 20px; background-color: #f5f5f5;">
        <p>You can view and download your invoice <a href="${invoice.pdfUrl}">here</a>.</p>
        <p>To make a payment, login to your customer portal or contact our support.</p>
      </div>
      
      <p>Thank you for choosing our service!</p>
      <p><strong>Your ISP Team</strong></p>
    </div>
  `;
  
  await sendEmail({
    to: invoice.customer.email,
    subject,
    html
  });
};

// Get all invoices
const getInvoices = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      customerId,
      month,
      sortBy = 'issueDate',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build where clause
    const where = {};
    
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { email: { contains: search, mode: 'insensitive' } } }
      ];
    }
    
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (month) where.month = month;

    // Get total count
    const total = await prisma.invoice.count({ where });

    // Get invoices
    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            customerId: true
          }
        },
        items: true,
        _count: {
          select: { payments: true }
        }
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: parseInt(limit)
    });

    // Calculate summary
    const summary = await prisma.invoice.aggregate({
      where,
      _sum: {
        totalAmount: true,
        paidAmount: true,
        dueAmount: true
      },
      _count: true
    });

    res.json({
      success: true,
      data: {
        invoices,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        summary: {
          totalInvoices: summary._count,
          totalAmount: summary._sum.totalAmount || 0,
          totalPaid: summary._sum.paidAmount || 0,
          totalDue: summary._sum.dueAmount || 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get single invoice
const getInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            package: true
          }
        },
        items: true,
        payments: {
          include: {
            customer: {
              select: {
                name: true,
                customerId: true
              }
            }
          },
          orderBy: { paidAt: 'desc' }
        },
        isp: true
      }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

// Update invoice
const updateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes, discount, status } = req.body;

    const invoice = await prisma.invoice.findUnique({
      where: { id }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Calculate new totals if discount changed
    let updateData = { notes, status };
    
    if (discount !== undefined && discount !== invoice.discount) {
      const discountAmount = discount;
      const newTotal = invoice.totalAmount - discountAmount;
      const newDue = newTotal - invoice.paidAmount;
      
      updateData.discount = discountAmount;
      updateData.totalAmount = newTotal;
      updateData.dueAmount = newDue;
      
      // Update customer balance
      const balanceChange = invoice.totalAmount - newTotal;
      await prisma.customer.update({
        where: { id: invoice.customerId },
        data: {
          balance: { decrement: balanceChange }
        }
      });
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        items: true
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_INVOICE',
        entityType: 'INVOICE',
        entityId: id,
        details: JSON.stringify(updateData),
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      data: updatedInvoice
    });
  } catch (error) {
    next(error);
  }
};

// Send invoice reminder
const sendInvoiceReminder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
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
        message: 'Invoice is already paid'
      });
    }

    // Send email reminder
    await sendInvoiceEmail(invoice);

    // Send SMS reminder
    const daysOverdue = Math.floor((new Date() - invoice.dueDate) / (1000 * 60 * 60 * 24));
    const smsMessage = `Reminder: Invoice #${invoice.invoiceNumber} for ${invoice.month} is ${daysOverdue > 0 ? `${daysOverdue} days overdue` : 'due soon'}. Amount: ${invoice.dueAmount}. Please pay to avoid service interruption.`;
    
    // You would implement SMS sending here

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'SEND_INVOICE_REMINDER',
        entityType: 'INVOICE',
        entityId: id,
        details: JSON.stringify({ invoiceNumber: invoice.invoiceNumber }),
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: 'Invoice reminder sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Bulk send reminders for overdue invoices
const bulkSendReminders = async (req, res, next) => {
  try {
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['PENDING', 'OVERDUE'] },
        dueDate: { lt: new Date() }
      },
      include: {
        customer: true
      },
      take: 100 // Limit to 100 at a time
    });

    const results = {
      sent: 0,
      failed: 0,
      errors: []
    };

    for (const invoice of overdueInvoices) {
      try {
        // Send reminder
        await sendInvoiceEmail(invoice);
        results.sent++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          invoiceId: invoice.id,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Reminders sent: ${results.sent}, failed: ${results.failed}`,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

// Export invoices to Excel
const exportInvoices = async (req, res, next) => {
  try {
    const { startDate, endDate, status, customerId } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.issueDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: {
          select: {
            name: true,
            email: true,
            phone: true,
            customerId: true
          }
        },
        items: true
      },
      orderBy: { issueDate: 'desc' }
    });

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Invoices');

    // Add headers
    worksheet.columns = [
      { header: 'Invoice #', key: 'invoiceNumber', width: 15 },
      { header: 'Date', key: 'issueDate', width: 12 },
      { header: 'Due Date', key: 'dueDate', width: 12 },
      { header: 'Customer ID', key: 'customerId', width: 15 },
      { header: 'Customer Name', key: 'customerName', width: 25 },
      { header: 'Amount', key: 'totalAmount', width: 12 },
      { header: 'Paid', key: 'paidAmount', width: 12 },
      { header: 'Due', key: 'dueAmount', width: 12 },
      { header: 'Status', key: 'status', width: 12 }
    ];

    // Add data
    invoices.forEach(invoice => {
      worksheet.addRow({
        invoiceNumber: invoice.invoiceNumber,
        issueDate: new Date(invoice.issueDate).toLocaleDateString(),
        dueDate: new Date(invoice.dueDate).toLocaleDateString(),
        customerId: invoice.customer.customerId,
        customerName: invoice.customer.name,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        dueAmount: invoice.dueAmount,
        status: invoice.status
      });
    });

    // Add summary row
    const totalRow = worksheet.addRow({});
    totalRow.getCell(6).value = { formula: `SUM(F2:F${invoices.length + 1})` };
    totalRow.getCell(7).value = { formula: `SUM(G2:G${invoices.length + 1})` };
    totalRow.getCell(8).value = { formula: `SUM(H2:H${invoices.length + 1})` };

    // Style the summary row
    totalRow.font = { bold: true };

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoices_${new Date().toISOString().slice(0, 10)}.xlsx`
    );

    // Send the file
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateMonthlyInvoices,
  getInvoices,
  getInvoice,
  updateInvoice,
  sendInvoiceReminder,
  bulkSendReminders,
  exportInvoices
};