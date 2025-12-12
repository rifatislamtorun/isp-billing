const { prisma } = require('../index');
const { generateTicketNumber } = require('../utils/helper.util');

const createTicket = async (req, res, next) => {
  try {
    const { customerId, subject, description, priority, category } = req.body;

    // Generate ticket number
    const ticketNumber = await generateTicketNumber();

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        customerId,
        subject,
        description,
        priority: priority || 'MEDIUM',
        category: category || 'GENERAL'
      },
      include: {
        customer: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    // Create notification for support staff
    const supportStaff = await prisma.user.findMany({
      where: {
        role: { in: ['ISP_ADMIN', 'SUPPORT_STAFF'] }
      },
      select: { id: true }
    });

    for (const staff of supportStaff) {
      await prisma.notification.create({
        data: {
          userId: staff.id,
          title: 'New Support Ticket',
          message: `New ticket #${ticketNumber} created by ${ticket.customer.name}`,
          type: 'INFO',
          actionUrl: `/support/tickets/${ticket.id}`
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

const getTickets = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      category,
      assignedTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = {};
    
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (assignedTo) where.assignedToId = assignedTo;

    const total = await prisma.supportTicket.count({ where });

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        customer: {
          select: {
            name: true,
            customerId: true,
            phone: true
          }
        },
        assignedTo: {
          select: {
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            replies: true
          }
        }
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: parseInt(limit)
    });

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const getTicket = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
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
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            customer: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

const updateTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Ticket updated successfully',
      data: updatedTicket
    });
  } catch (error) {
    next(error);
  }
};

const addReply = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message, isInternalNote, attachments } = req.body;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    const reply = await prisma.ticketReply.create({
      data: {
        ticketId: id,
        userId: req.user.id,
        message,
        isInternalNote: isInternalNote || false,
        attachments: attachments || []
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

    // Update ticket last activity
    await prisma.supportTicket.update({
      where: { id },
      data: {
        updatedAt: new Date()
      }
    });

    // Send notification to customer if not internal note
    if (!isInternalNote) {
      await prisma.notification.create({
        data: {
          customerId: ticket.customerId,
          title: 'New Reply on Your Ticket',
          message: `Your ticket #${ticket.ticketNumber} has a new reply`,
          type: 'INFO',
          actionUrl: `/customer/tickets/${ticket.id}`
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Reply added successfully',
      data: reply
    });
  } catch (error) {
    next(error);
  }
};

const assignTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assignedToId } = req.body;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id },
      data: {
        assignedToId,
        status: 'IN_PROGRESS'
      }
    });

    // Notify assigned staff
    if (assignedToId) {
      await prisma.notification.create({
        data: {
          userId: assignedToId,
          title: 'Ticket Assigned',
          message: `Ticket #${ticket.ticketNumber} has been assigned to you`,
          type: 'INFO',
          actionUrl: `/support/tickets/${ticket.id}`
        }
      });
    }

    res.json({
      success: true,
      message: 'Ticket assigned successfully',
      data: updatedTicket
    });
  } catch (error) {
    next(error);
  }
};

const updateTicketStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, resolutionNotes } = req.body;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id },
      data: {
        status
      }
    });

    // Add resolution notes as internal reply
    if (resolutionNotes) {
      await prisma.ticketReply.create({
        data: {
          ticketId: id,
          userId: req.user.id,
          message: `Status changed to ${status}. Notes: ${resolutionNotes}`,
          isInternalNote: true
        }
      });
    }

    // Notify customer
    await prisma.notification.create({
      data: {
        customerId: ticket.customerId,
        title: 'Ticket Status Updated',
        message: `Your ticket #${ticket.ticketNumber} status changed to ${status}`,
        type: 'INFO',
        actionUrl: `/customer/tickets/${ticket.id}`
      }
    });

    res.json({
      success: true,
      message: 'Ticket status updated successfully',
      data: updatedTicket
    });
  } catch (error) {
    next(error);
  }
};

const getCustomerTickets = async (req, res, next) => {
  try {
    const { customerId } = req.params;

    const tickets = await prisma.supportTicket.findMany({
      where: { customerId },
      include: {
        assignedTo: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            replies: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: tickets
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicket,
  updateTicket,
  addReply,
  assignTicket,
  updateTicketStatus,
  getCustomerTickets
};