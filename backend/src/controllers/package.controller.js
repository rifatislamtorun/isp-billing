const { prisma } = require('../index');

const createPackage = async (req, res, next) => {
  try {
    const { name, code, speed, bandwidth, price, setupFee, taxRate, features, description } = req.body;

    // Check if package code already exists
    const existingPackage = await prisma.package.findUnique({
      where: { code }
    });

    if (existingPackage) {
      return res.status(400).json({
        success: false,
        message: 'Package code already exists'
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

    const package = await prisma.package.create({
      data: {
        name,
        code,
        speed,
        bandwidth,
        price,
        setupFee,
        taxRate,
        features,
        description,
        ispId: isp.id
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_PACKAGE',
        entityType: 'PACKAGE',
        entityId: package.id,
        details: JSON.stringify({ name, code, price }),
        ipAddress: req.ip
      }
    });

    res.status(201).json({
      success: true,
      message: 'Package created successfully',
      data: package
    });
  } catch (error) {
    next(error);
  }
};

const getPackages = async (req, res, next) => {
  try {
    const { isActive } = req.query;
    
    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const packages = await prisma.package.findMany({
      where,
      include: {
        _count: {
          select: {
            customers: true
          }
        }
      },
      orderBy: {
        price: 'asc'
      }
    });

    res.json({
      success: true,
      data: packages
    });
  } catch (error) {
    next(error);
  }
};

const getPackage = async (req, res, next) => {
  try {
    const { id } = req.params;

    const package = await prisma.package.findUnique({
      where: { id },
      include: {
        customers: {
          select: {
            id: true,
            name: true,
            customerId: true,
            status: true
          },
          take: 10
        },
        _count: {
          select: {
            customers: true
          }
        }
      }
    });

    if (!package) {
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }

    res.json({
      success: true,
      data: package
    });
  } catch (error) {
    next(error);
  }
};

const updatePackage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const package = await prisma.package.findUnique({
      where: { id }
    });

    if (!package) {
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }

    const updatedPackage = await prisma.package.update({
      where: { id },
      data: updateData
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_PACKAGE',
        entityType: 'PACKAGE',
        entityId: id,
        details: JSON.stringify(updateData),
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: 'Package updated successfully',
      data: updatedPackage
    });
  } catch (error) {
    next(error);
  }
};

const deletePackage = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if package has customers
    const customersCount = await prisma.customer.count({
      where: { packageId: id }
    });

    if (customersCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete package with active customers'
      });
    }

    await prisma.package.delete({
      where: { id }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE_PACKAGE',
        entityType: 'PACKAGE',
        entityId: id,
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: 'Package deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

const togglePackageStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const package = await prisma.package.findUnique({
      where: { id }
    });

    if (!package) {
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }

    const updatedPackage = await prisma.package.update({
      where: { id },
      data: {
        isActive: !package.isActive
      }
    });

    res.json({
      success: true,
      message: `Package ${updatedPackage.isActive ? 'activated' : 'deactivated'} successfully`,
      data: updatedPackage
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPackage,
  getPackages,
  getPackage,
  updatePackage,
  deletePackage,
  togglePackageStatus
};