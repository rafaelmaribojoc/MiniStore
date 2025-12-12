import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { authenticate, AuthRequest } from "../middleware/auth";
import type { Prisma } from "@prisma/client";

const router = Router();

// Generate receipt number
function generateReceiptNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `RCP-${year}${month}${day}-${random}`;
}

// Get all sales
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, page = "1", pageSize = "50" } = req.query;

    const where: any = {};

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const [sales, total] = await Promise.all([
      req.prisma.sale.findMany({
        where,
        include: {
          items: {
            include: {
              product: true,
            },
          },
          user: {
            select: { id: true, username: true, fullName: true },
          },
          customer: true,
        },
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      req.prisma.sale.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        sales,
        total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        totalPages: Math.ceil(total / parseInt(pageSize as string)),
      },
    });
  } catch (error) {
    console.error("Get sales error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get sales",
    });
  }
});

// Get sale by ID
router.get("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const sale = await req.prisma.sale.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: { id: true, username: true },
        },
        customer: true,
      },
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        error: "Sale not found",
      });
    }

    res.json({
      success: true,
      data: sale,
    });
  } catch (error) {
    console.error("Get sale error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get sale",
    });
  }
});

// Create sale (checkout)
router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const {
      items,
      paymentMethod,
      amountPaid,
      discount = 0,
      customerId,
      notes,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Cart is empty",
      });
    }

    // Fetch products and validate stock
    const productIds = items.map((item: any) => item.productId);
    const products = await req.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    type ProductType = (typeof products)[number];
    const productMap = new Map<string, ProductType>(
      products.map((p: ProductType) => [p.id, p])
    );

    // Validate all products exist and have sufficient stock
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return res.status(400).json({
          success: false,
          error: `Product not found: ${item.productId}`,
        });
      }
      if (product.stockQuantity < item.quantity) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}`,
        });
      }
    }

    // Calculate totals
    let subtotal = 0;
    const saleItems = items.map((item: any) => {
      const product = productMap.get(item.productId)!;
      const itemDiscount = item.discount || 0;
      const itemSubtotal = Number(product.price) * item.quantity - itemDiscount;
      subtotal += itemSubtotal;

      return {
        productId: item.productId,
        quantity: item.quantity,
        priceAtSale: Number(product.price),
        discount: itemDiscount,
        subtotal: itemSubtotal,
      };
    });

    const total = subtotal - discount;

    // Handle credit payment
    if (paymentMethod === "credit") {
      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: "Customer is required for credit payments",
        });
      }

      const customer = await req.prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        return res.status(400).json({
          success: false,
          error: "Customer not found",
        });
      }

      const currentBalance = Number(customer.creditBalance);
      const creditLimit = Number(customer.creditLimit);
      const newBalance = currentBalance + total;

      // Check credit limit (0 means no limit)
      if (creditLimit > 0 && newBalance > creditLimit) {
        return res.status(400).json({
          success: false,
          error: `Credit limit exceeded. Current balance: $${currentBalance.toFixed(
            2
          )}, Limit: $${creditLimit.toFixed(
            2
          )}, This purchase: $${total.toFixed(2)}`,
        });
      }
    }

    const change = paymentMethod === "credit" ? 0 : amountPaid - total;

    if (paymentMethod !== "credit" && change < 0) {
      return res.status(400).json({
        success: false,
        error: "Insufficient payment amount",
      });
    }

    // Create sale with items in a transaction
    const sale = await req.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Create sale
        const newSale = await tx.sale.create({
          data: {
            receiptNumber: generateReceiptNumber(),
            subtotal,
            discount,
            tax: 0,
            total,
            paymentMethod,
            amountPaid: paymentMethod === "credit" ? 0 : amountPaid,
            change,
            userId: req.user!.id,
            customerId,
            notes,
            items: {
              create: saleItems,
            },
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
            user: {
              select: { id: true, username: true },
            },
            customer: true,
          },
        });

        // Handle credit payment - update customer balance and create transaction
        if (paymentMethod === "credit" && customerId) {
          const customer = await tx.customer.findUnique({
            where: { id: customerId },
          });

          const currentBalance = Number(customer?.creditBalance || 0);
          const newBalance = currentBalance + total;

          await tx.customer.update({
            where: { id: customerId },
            data: { creditBalance: newBalance },
          });

          await tx.creditTransaction.create({
            data: {
              customerId,
              saleId: newSale.id,
              amount: total,
              type: "purchase",
              description: `Purchase - Receipt ${newSale.receiptNumber}`,
              reference: newSale.receiptNumber,
              balanceAfter: newBalance,
            },
          });
        }

        // Update stock and create stock movements
        for (const item of items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: {
                decrement: item.quantity,
              },
            },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: item.quantity,
              type: "out",
              reason: "sale",
              notes: `Sale ${newSale.receiptNumber}`,
              userId: req.user!.id,
            },
          });
        }

        return newSale;
      }
    );

    res.status(201).json({
      success: true,
      data: sale,
    });
  } catch (error) {
    console.error("Create sale error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create sale",
    });
  }
});

// Process refund
router.post("/:id/refund", authenticate, async (req: AuthRequest, res) => {
  try {
    const { itemIds } = req.body; // Optional: specific items to refund

    const sale = await req.prisma.sale.findUnique({
      where: { id: req.params.id },
      include: {
        items: true,
      },
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        error: "Sale not found",
      });
    }

    if (sale.status === "refunded") {
      return res.status(400).json({
        success: false,
        error: "Sale already refunded",
      });
    }

    const itemsToRefund = itemIds
      ? sale.items.filter((item: any) => itemIds.includes(item.id))
      : sale.items;

    // Process refund in transaction
    await req.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Restore stock
      for (const item of itemsToRefund) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              increment: item.quantity,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            type: "in",
            reason: "return_item",
            notes: `Refund for ${sale.receiptNumber}`,
            userId: req.user!.id,
          },
        });
      }

      // Update sale status
      await tx.sale.update({
        where: { id: sale.id },
        data: {
          status:
            itemIds && itemIds.length < sale.items.length
              ? "partial_refund"
              : "refunded",
        },
      });
    });

    res.json({
      success: true,
      message: "Refund processed successfully",
    });
  } catch (error) {
    console.error("Process refund error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process refund",
    });
  }
});

export default router;
