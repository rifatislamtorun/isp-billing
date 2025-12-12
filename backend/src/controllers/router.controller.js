const { prisma } = require('../index');

const createRouter = async (req, res, next) => {
  try {
    const { name, ipAddress, macAddress, model, location, bandwidthLimit, latitude, longitude } = req.body;

    // Check if IP or MAC already exists
    const existingRouter = await prisma.router.findFirst({
      where: {
        OR: [
          { ipAddress },
          { macAddress }
        ]
      }
    });

    if (existingRouter) {
      return res.status(400).json({
        success: false,
        message: 'Router with this IP or MAC already exists'
      });
    }

    // Get ISP
    const isp = await prisma.iSP.findFirst();
    if (!isp) {
      return res.status(400).json({
        success: false,
        message: 'ISP not configured'
      });
    }

    const router = await prisma.router.create({
      data: {
        name,
        ipAddress,
        macAddress,
        model,
        location,
        bandwidthLimit,
        latitude,
        longitude,
        ispId: isp.id
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_ROUTER',
        entityType: 'ROUTER',
        entityId: router.id,
        details: JSON.stringify({ name, ipAddress }),
        ipAddress: req.ip
      }
    });

    res.status(201).json({
      success: true,
      message: 'Router created successfully',
      data: router
    });
  } catch (error) {
    next(error);
  }
};

const getRouters = async (req, res, next) => {
  try {
    const { status } = req.query;
    
    const where = {};
    if (status) {
      where.status = status;
    }

    const routers = await prisma.router.findMany({
      where,
      include: {
        _count: {
          select: {
            customers: true,
            bandwidthLogs: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      data: routers
    });
  } catch (error) {
    next(error);
  }
};

const getRouter = async (req, res, next) => {
  try {
    const { id } = req.params;

    const router = await prisma.router.findUnique({
      where: { id },
      include: {
        customers: {
          select: {
            id: true,
            name: true,
            customerId: true,
            status: true,
            package: {
              select: {
                name: true,
                speed: true
              }
            }
          }
        },
        bandwidthLogs: {
          take: 100,
          orderBy: {
            timestamp: 'desc'
          }
        },
        _count: {
          select: {
            customers: true
          }
        }
      }
    });

    if (!router) {
      return res.status(404).json({
        success: false,
        message: 'Router not found'
      });
    }

    // Calculate current bandwidth usage
    const recentLogs = await prisma.routerBandwidthLog.findMany({
      where: {
        routerId: id,
        timestamp: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last 1 hour
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    const currentUsage = recentLogs.length > 0 ? recentLogs[0].totalUsage : 0;
    const utilization = (currentUsage / router.bandwidthLimit) * 100;

    res.json({
      success: true,
      data: {
        ...router,
        currentUsage,
        utilization: utilization.toFixed(2)
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateRouter = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const router = await prisma.router.findUnique({
      where: { id }
    });

    if (!router) {
      return res.status(404).json({
        success: false,
        message: 'Router not found'
      });
    }

    const updatedRouter = await prisma.router.update({
      where: { id },
      data: updateData
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_ROUTER',
        entityType: 'ROUTER',
        entityId: id,
        details: JSON.stringify(updateData),
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: 'Router updated successfully',
      data: updatedRouter
    });
  } catch (error) {
    next(error);
  }
};

const deleteRouter = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if router has customers
    const customersCount = await prisma.customer.count({
      where: { routerId: id }
    });

    if (customersCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete router with connected customers'
      });
    }

    await prisma.router.delete({
      where: { id }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE_ROUTER',
        entityType: 'ROUTER',
        entityId: id,
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: 'Router deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

const getBandwidthStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { period = 'day' } = req.query;

    let startDate;
    const now = new Date();

    switch (period) {
      case 'hour':
        startDate = new Date(now.setHours(now.getHours() - 1));
        break;
      case 'day':
        startDate = new Date(now.setDate(now.getDate() - 1));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 1));
    }

    const logs = await prisma.routerBandwidthLog.findMany({
      where: {
        routerId: id,
        timestamp: {
          gte: startDate
        }
      },
      orderBy: {
        timestamp: 'asc'
      }
    });

    // Aggregate data for chart
    const chartData = logs.map(log => ({
      timestamp: log.timestamp,
      usage: log.totalUsage,
      devices: log.connectedDevices
    }));

    const stats = {
      totalLogs: logs.length,
      averageUsage: logs.reduce((sum, log) => sum + log.totalUsage, 0) / logs.length || 0,
      peakUsage: Math.max(...logs.map(log => log.totalUsage), 0),
      averageDevices: logs.reduce((sum, log) => sum + log.connectedDevices, 0) / logs.length || 0
    };

    res.json({
      success: true,
      data: {
        stats,
        chartData,
        period
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateRouterStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const router = await prisma.router.findUnique({
      where: { id }
    });

    if (!router) {
      return res.status(404).json({
        success: false,
        message: 'Router not found'
      });
    }

    const updatedRouter = await prisma.router.update({
      where: { id },
      data: {
        status,
        lastSeen: status === 'ACTIVE' ? new Date() : router.lastSeen
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_ROUTER_STATUS',
        entityType: 'ROUTER',
        entityId: id,
        details: JSON.stringify({ oldStatus: router.status, newStatus: status, reason }),
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: 'Router status updated successfully',
      data: updatedRouter
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRouter,
  getRouters,
  getRouter,
  updateRouter,
  deleteRouter,
  getBandwidthStats,
  updateRouterStatus
};