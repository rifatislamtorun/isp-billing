const bcrypt = require('bcryptjs');
const { prisma } = require('../index');
const { generateCustomerId } = require('../utils/helper.util');
const { sendSMS } = require('../utils/sms.util');

// Create new customer
const createCustomer = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      connectionAddress,
      nid,
      packageId,
      routerId,
      setupFee,
      notes
    } = req.body;

    // Generate unique customer ID
    const customerId = await generateCustomerId();

    // Hash password (default: phone number)
    const hashedPassword = await bcrypt.hash(phone, 12);

    // Get ISP ID
    const isp = await prisma.iSP.findFirst();
    if (!isp) {
      return res.status(400).json({
        success: false,
        message: 'ISP configuration not found'
      });
    }

    // Get package details
    const packageDetails = await prisma.package.findUnique({
      where: { id: packageId }
    });

    if (!packageDetails) {
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        customerId,
        name,
        email,
        phone,
        address,
        connectionAddress,
        nid,
        password: hashedPassword,
        packageId,
        routerId,
        createdById: req.user.id,
        ispId: isp.id,
        balance: -setupFee, // Negative for setup fee advance
        status: 'PENDING'
      },
      include: {
        package: true,
        router: true,
        createdBy: {
          select: { name: true, email: true }
        }
      }
    });

    // Generate first invoice if setup fee > 0
    if (setupFee > 0) {
      const invoiceNumber = `INV-${customerId}-${Date.now()}`;
      
      await prisma.invoice.create({
        data: {
          invoiceNumber,
          customerId: customer.id,
          ispId: isp.id,
          month: new Date().toISOString().slice(0, 7),
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          amount: setupFee,
          totalAmount: setupFee,
          dueAmount: setupFee,
          status: 'PENDING',
          packageCharge: setupFee,
          notes: 'Connection setup fee'
        }
      });
    }

    // Send welcome SMS
    const smsMessage = `Welcome to ${isp.name}! Your customer ID: ${customerId}. Package: ${packageDetails.name}. Setup fee: ${setupFee || 0} ${isp.currency}.`;
    
    await sendSMS({
      to: phone,
      message: smsMessage
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_CUSTOMER',
        entityType: 'CUSTOMER',
        entityId: customer.id,
        details: JSON.stringify({ customerId, name, package: packageDetails.name }),
        ipAddress: req.ip
      }
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

// Get all customers with filters
const getCustomers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      packageId,
      routerId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build where clause
    const where = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { customerId: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (status) where.status = status;
    if (packageId) where.packageId = packageId;
    if (routerId) where.routerId = routerId;

    // Get total count
    const total = await prisma.customer.count({ where });

    // Get customers
    const customers = await prisma.customer.findMany({
      where,
      include: {
        package: {
          select: { name: true, speed: true, price: true }
        },
        router: {
          select: { name: true, ipAddress: true }
        },
        _count: {
          select: {
            invoices: true,
            payments: true,
            supportTickets: true
          }
        }
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: parseInt(limit)
    });

    // Calculate summary
    const summary = await prisma.customer.aggregate({
      where,
      _sum: { balance: true },
      _count: true
    });

    res.json({
      success: true,
      data: {
        customers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        summary: {
          totalCustomers: summary._count,
          totalBalance: summary._sum.balance || 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get single customer
const getCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        package: true,
        router: true,
        createdBy: {
          select: { name: true, email: true }
        },
        invoices: {
          take: 10,
          orderBy: { issueDate: 'desc' },
          select: {
            id: true,
            invoiceNumber: true,
            month: true,
            amount: true,
            paidAmount: true,
            dueAmount: true,
            status: true,
            dueDate: true
          }
        },
        payments: {
          take: 10,
          orderBy: { paidAt: 'desc' },
          select: {
            id: true,
            transactionId: true,
            amount: true,
            method: true,
            paidAt: true,
            invoice: {
              select: { invoiceNumber: true }
            }
          }
        },
        bandwidthUsage: {
          take: 30,
          orderBy: { date: 'desc' },
          select: {
            date: true,
            upload: true,
            download: true,
            total: true,
            peakUsage: true
          }
        },
        supportTickets: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            ticketNumber: true,
            subject: true,
            priority: true,
            status: true,
            createdAt: true
          }
        },
        devices: {
          select: {
            id: true,
            macAddress: true,
            deviceName: true,
            deviceType: true,
            ipAddress: true,
            lastSeen: true,
            isActive: true
          }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Calculate usage statistics
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const monthlyUsage = await prisma.bandwidthUsage.aggregate({
      where: {
        customerId: id,
        date: { gte: startOfMonth }
      },
      _sum: {
        upload: true,
        download: true,
        total: true
      },
      _avg: {
        peakUsage: true
      }
    });

    res.json({
      success: true,
      data: {
        ...customer,
        usageStats: {
          monthly: {
            upload: monthlyUsage._sum.upload || 0,
            download: monthlyUsage._sum.download || 0,
            total: monthlyUsage._sum.total || 0,
            averagePeak: monthlyUsage._avg.peakUsage || 0
          }
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update customer
const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { id }
    });

    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Update customer
    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: updateData,
      include: {
        package: true,
        router: true
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_CUSTOMER',
        entityType: 'CUSTOMER',
        entityId: id,
        details: JSON.stringify(updateData),
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: updatedCustomer
    });
  } catch (error) {
    next(error);
  }
};

// Update customer status
const updateCustomerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const customer = await prisma.customer.findUnique({
      where: { id }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Update status
    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        status,
        disconnectDate: status === 'DISCONNECTED' ? new Date() : null
      }
    });

    // Send status update SMS
    const isp = await prisma.iSP.findFirst();
    const smsMessage = `Your account status changed to ${status}. ${reason ? 'Reason: ' + reason : ''}`;
    
    await sendSMS({
      to: customer.phone,
      message: smsMessage
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_CUSTOMER_STATUS',
        entityType: 'CUSTOMER',
        entityId: id,
        details: JSON.stringify({ oldStatus: customer.status, newStatus: status, reason }),
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: 'Customer status updated successfully',
      data: updatedCustomer
    });
  } catch (error) {
    next(error);
  }
};

// Bulk import customers
const bulkImportCustomers = async (req, res, next) => {
  try {
    const customers = req.body.customers;
    
    if (!Array.isArray(customers) || customers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No customer data provided'
      });
    }

    const isp = await prisma.iSP.findFirst();
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Process each customer
    for (let i = 0; i < customers.length; i++) {
      try {
        const customerData = customers[i];
        
        // Generate customer ID
        const customerId = await generateCustomerId();
        
        // Hash password
        const hashedPassword = await bcrypt.hash(customerData.phone, 12);
        
        // Create customer
        await prisma.customer.create({
          data: {
            customerId,
            name: customerData.name,
            email: customerData.email,
            phone: customerData.phone,
            address: customerData.address,
            connectionAddress: customerData.connectionAddress || customerData.address,
            nid: customerData.nid,
            password: hashedPassword,
            packageId: customerData.packageId,
            routerId: customerData.routerId,
            createdById: req.user.id,
            ispId: isp.id,
            status: customerData.status || 'PENDING'
          }
        });
        
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          index: i,
          error: error.message
        });
      }
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'BULK_IMPORT_CUSTOMERS',
        entityType: 'CUSTOMER',
        details: JSON.stringify(results),
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: `Bulk import completed: ${results.success} successful, ${results.failed} failed`,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

// Get customer dashboard
const getCustomerDashboard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { month } = req.query;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        package: true,
        router: true
      }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Calculate date ranges
    const today = new Date();
    const currentMonth = month || today.toISOString().slice(0, 7);
    const startOfMonth = new Date(currentMonth + '-01');
    const endOfMonth = new Date(new Date(startOfMonth).setMonth(startOfMonth.getMonth() + 1));

    // Get invoices for current month
    const invoices = await prisma.invoice.findMany({
      where: {
        customerId: id,
        month: currentMonth
      },
      orderBy: { issueDate: 'desc' }
    });

    // Get payments for current month
    const payments = await prisma.payment.findMany({
      where: {
        customerId: id,
        paidAt: {
          gte: startOfMonth,
          lt: endOfMonth
        }
      },
      orderBy: { paidAt: 'desc' },
      include: {
        invoice: {
          select: { invoiceNumber: true }
        }
      }
    });

    // Get bandwidth usage for current month
    const bandwidthUsage = await prisma.bandwidthUsage.findMany({
      where: {
        customerId: id,
        date: {
          gte: startOfMonth,
          lt: endOfMonth
        }
      },
      orderBy: { date: 'asc' }
    });

    // Calculate statistics
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalDue = invoices.reduce((sum, invoice) => sum + invoice.dueAmount, 0);
    const totalUsage = bandwidthUsage.reduce((sum, usage) => sum + usage.total, 0);

    res.json({
      success: true,
      data: {
        customer,
        summary: {
          currentMonth,
          totalInvoices: invoices.length,
          totalPaid,
          totalDue,
          totalUsage: `${(totalUsage / 1024).toFixed(2)} GB`, // Convert MB to GB
          averageDailyUsage: totalUsage / bandwidthUsage.length || 0
        },
        invoices,
        payments,
        bandwidthUsage,
        chartData: {
          usage: bandwidthUsage.map(u => ({
            date: u.date.toISOString().slice(0, 10),
            upload: u.upload,
            download: u.download,
            total: u.total
          })),
          payments: payments.map(p => ({
            date: p.paidAt.toISOString().slice(0, 10),
            amount: p.amount
          }))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  updateCustomerStatus,
  bulkImportCustomers,
  getCustomerDashboard
};