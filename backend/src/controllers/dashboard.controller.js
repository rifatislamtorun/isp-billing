const { prisma } = require('../index');

const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    // Total customers
    const totalCustomers = await prisma.customer.count();
    const lastMonthCustomers = await prisma.customer.count({
      where: {
        registrationDate: {
          lt: startOfMonth,
          gte: startOfLastMonth
        }
      }
    });

    // Monthly revenue
    const currentMonthRevenue = await prisma.payment.aggregate({
      where: {
        paidAt: {
          gte: startOfMonth
        },
        status: 'COMPLETED'
      },
      _sum: {
        amount: true
      }
    });

    const lastMonthRevenue = await prisma.payment.aggregate({
      where: {
        paidAt: {
          gte: startOfLastMonth,
          lt: startOfMonth
        },
        status: 'COMPLETED'
      },
      _sum: {
        amount: true
      }
    });

    // Pending invoices
    const pendingInvoices = await prisma.invoice.count({
      where: {
        status: { in: ['PENDING', 'OVERDUE'] }
      }
    });

    const paidInvoices = await prisma.invoice.count({
      where: {
        status: 'PAID',
        issueDate: {
          gte: startOfLastMonth,
          lt: startOfMonth
        }
      }
    });

    // Active connections
    const activeConnections = await prisma.customer.count({
      where: {
        status: 'ACTIVE'
      }
    });

    const lastMonthConnections = await prisma.customer.count({
      where: {
        status: 'ACTIVE',
        registrationDate: {
          lt: startOfMonth
        }
      }
    });

    const stats = {
      customers: {
        total: totalCustomers,
        change: totalCustomers - lastMonthCustomers
      },
      revenue: {
        total: currentMonthRevenue._sum.amount || 0,
        change: (currentMonthRevenue._sum.amount || 0) - (lastMonthRevenue._sum.amount || 0)
      },
      invoices: {
        total: pendingInvoices,
        change: pendingInvoices - paidInvoices
      },
      activeConnections: {
        total: activeConnections,
        change: activeConnections - lastMonthConnections
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

const getRevenueData = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    
    let groupBy;
    let dateFormat;
    
    switch (period) {
      case 'day':
        groupBy = 'DATE(paid_at)';
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        groupBy = 'YEARWEEK(paid_at)';
        dateFormat = '%Y-%u';
        break;
      case 'month':
        groupBy = 'DATE_FORMAT(paid_at, "%Y-%m")';
        dateFormat = '%Y-%m';
        break;
      default:
        groupBy = 'DATE_FORMAT(paid_at, "%Y-%m")';
        dateFormat = '%Y-%m';
    }

    const revenueData = await prisma.$queryRaw`
      SELECT 
        ${groupBy} as period,
        SUM(amount) as total,
        COUNT(*) as count
      FROM payments
      WHERE paid_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        AND status = 'COMPLETED'
      GROUP BY ${groupBy}
      ORDER BY period
    `;

    res.json({
      success: true,
      data: revenueData
    });
  } catch (error) {
    next(error);
  }
};

const getCustomersGrowth = async (req, res, next) => {
  try {
    const growthData = await prisma.$queryRaw`
      SELECT 
        DATE_FORMAT(registration_date, '%Y-%m') as month,
        COUNT(*) as new_customers,
        SUM(COUNT(*)) OVER (ORDER BY DATE_FORMAT(registration_date, '%Y-%m')) as total_customers
      FROM customers
      WHERE registration_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(registration_date, '%Y-%m')
      ORDER BY month
    `;

    res.json({
      success: true,
      data: growthData
    });
  } catch (error) {
    next(error);
  }
};

const getNetworkStatus = async (req, res, next) => {
  try {
    const routers = await prisma.router.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        ipAddress: true,
        connectedUsers: true,
        bandwidthLimit: true,
        lastSeen: true
      }
    });

    // Calculate overall status
    const totalRouters = routers.length;
    const activeRouters = routers.filter(r => r.status === 'ACTIVE').length;
    const totalUsers = routers.reduce((sum, r) => sum + r.connectedUsers, 0);
    
    // Check if any router hasn't been seen in 5 minutes
    const now = new Date();
    const offlineThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    const offlineRouters = routers.filter(r => {
      if (!r.lastSeen) return true;
      return (now - new Date(r.lastSeen)) > offlineThreshold;
    });

    const status = {
      totalRouters,
      activeRouters,
      inactiveRouters: totalRouters - activeRouters,
      totalUsers,
      offlineRouters: offlineRouters.length,
      uptime: totalRouters > 0 ? (activeRouters / totalRouters * 100).toFixed(2) : 0
    };

    res.json({
      success: true,
      data: {
        status,
        routers
      }
    });
  } catch (error) {
    next(error);
  }
};

const getRecentActivity = async (req, res, next) => {
  try {
    const activities = await prisma.activityLog.findMany({
      take: 20,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    next(error);
  }
};

const getUpcomingInvoices = async (req, res, next) => {
  try {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const upcomingInvoices = await prisma.invoice.findMany({
      where: {
        dueDate: {
          gte: today,
          lte: nextWeek
        },
        status: { in: ['PENDING', 'OVERDUE'] }
      },
      include: {
        customer: {
          select: {
            name: true,
            phone: true,
            email: true
          }
        }
      },
      orderBy: {
        dueDate: 'asc'
      },
      take: 10
    });

    res.json({
      success: true,
      data: upcomingInvoices
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getRevenueData,
  getCustomersGrowth,
  getNetworkStatus,
  getRecentActivity,
  getUpcomingInvoices
};