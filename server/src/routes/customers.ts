import { Router } from "express";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();

// Get all customers
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const { search, page = "1", pageSize = "50", hasCredit } = req.query;

    const where: any = {
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { email: { contains: search as string, mode: "insensitive" } },
        { phone: { contains: search as string } },
      ];
    }

    // Filter customers with outstanding credit
    if (hasCredit === "true") {
      where.creditBalance = { gt: 0 };
    }

    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const [customers, total] = await Promise.all([
      req.prisma.customer.findMany({
        where,
        skip,
        take,
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { sales: true, creditTransactions: true },
          },
        },
      }),
      req.prisma.customer.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        customers,
        total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        totalPages: Math.ceil(total / parseInt(pageSize as string)),
      },
    });
  } catch (error) {
    console.error("Get customers error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get customers",
    });
  }
});

// Get customer by ID with credit history
router.get("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const customer = await req.prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        creditTransactions: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            sale: {
              select: { receiptNumber: true, total: true, createdAt: true },
            },
          },
        },
        sales: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            receiptNumber: true,
            total: true,
            paymentMethod: true,
            createdAt: true,
          },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: "Customer not found",
      });
    }

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("Get customer error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get customer",
    });
  }
});

// Create customer
router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, email, phone, address, creditLimit } = req.body;

    const customer = await req.prisma.customer.create({
      data: {
        name,
        email,
        phone,
        address,
        creditLimit: creditLimit || 0,
      },
    });

    res.status(201).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("Create customer error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create customer",
    });
  }
});

// Update customer
router.put("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, email, phone, address, creditLimit, isActive } = req.body;

    const customer = await req.prisma.customer.update({
      where: { id: req.params.id },
      data: {
        name,
        email,
        phone,
        address,
        creditLimit,
        isActive,
      },
    });

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("Update customer error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update customer",
    });
  }
});

// Record credit payment
router.post("/:id/pay-credit", authenticate, async (req: AuthRequest, res) => {
  try {
    const { amount, description, reference } = req.body;
    const customerId = req.params.id;

    const customer = await req.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: "Customer not found",
      });
    }

    const currentBalance = Number(customer.creditBalance);
    const paymentAmount = Number(amount);

    if (paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Payment amount must be positive",
      });
    }

    if (paymentAmount > currentBalance) {
      return res.status(400).json({
        success: false,
        error: `Payment amount exceeds credit balance of $${currentBalance.toFixed(
          2
        )}`,
      });
    }

    const newBalance = currentBalance - paymentAmount;

    // Update customer and create transaction in a transaction
    const result = await req.prisma.$transaction(async (tx) => {
      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: { creditBalance: newBalance },
      });

      const transaction = await tx.creditTransaction.create({
        data: {
          customerId,
          amount: paymentAmount,
          type: "payment",
          description: description || "Credit payment",
          reference,
          balanceAfter: newBalance,
        },
      });

      return { customer: updatedCustomer, transaction };
    });

    res.json({
      success: true,
      data: result,
      message: `Payment of $${paymentAmount.toFixed(
        2
      )} recorded. New balance: $${newBalance.toFixed(2)}`,
    });
  } catch (error) {
    console.error("Pay credit error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to record payment",
    });
  }
});

// Adjust credit balance (admin only)
router.post(
  "/:id/adjust-credit",
  authenticate,
  authorize("admin"),
  async (req: AuthRequest, res) => {
    try {
      const { amount, description } = req.body;
      const customerId = req.params.id;

      const customer = await req.prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          error: "Customer not found",
        });
      }

      const currentBalance = Number(customer.creditBalance);
      const adjustmentAmount = Number(amount); // Can be positive or negative
      const newBalance = Math.max(0, currentBalance + adjustmentAmount);

      const result = await req.prisma.$transaction(async (tx) => {
        const updatedCustomer = await tx.customer.update({
          where: { id: customerId },
          data: { creditBalance: newBalance },
        });

        const transaction = await tx.creditTransaction.create({
          data: {
            customerId,
            amount: Math.abs(adjustmentAmount),
            type: "adjustment",
            description: description || "Manual adjustment",
            balanceAfter: newBalance,
          },
        });

        return { customer: updatedCustomer, transaction };
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Adjust credit error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to adjust credit",
      });
    }
  }
);

// Get credit summary (for dashboard)
router.get("/credit/summary", authenticate, async (req: AuthRequest, res) => {
  try {
    const customersWithCredit = await req.prisma.customer.findMany({
      where: {
        creditBalance: { gt: 0 },
        isActive: true,
      },
      orderBy: { creditBalance: "desc" },
      select: {
        id: true,
        name: true,
        phone: true,
        creditBalance: true,
        creditLimit: true,
      },
    });

    const totalOutstanding = customersWithCredit.reduce(
      (sum, c) => sum + Number(c.creditBalance),
      0
    );

    res.json({
      success: true,
      data: {
        totalOutstanding,
        customersWithCredit: customersWithCredit.length,
        customers: customersWithCredit,
      },
    });
  } catch (error) {
    console.error("Get credit summary error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get credit summary",
    });
  }
});

// Delete customer
router.delete(
  "/:id",
  authenticate,
  authorize("admin", "manager"),
  async (req: AuthRequest, res) => {
    try {
      // Soft delete - just mark as inactive
      await req.prisma.customer.update({
        where: { id: req.params.id },
        data: { isActive: false },
      });

      res.json({
        success: true,
        message: "Customer deleted",
      });
    } catch (error) {
      console.error("Delete customer error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete customer",
      });
    }
  }
);

export default router;
