import { Router } from "express";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();

// Get stock movements
router.get("/movements", authenticate, async (req: AuthRequest, res) => {
  try {
    const {
      productId,
      type,
      startDate,
      endDate,
      page = "1",
      pageSize = "50",
    } = req.query;

    const where: any = {};

    if (productId) where.productId = productId;
    if (type) where.type = type;

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const [movements, total] = await Promise.all([
      req.prisma.stockMovement.findMany({
        where,
        include: {
          product: {
            select: { id: true, name: true, sku: true },
          },
          user: {
            select: { id: true, username: true },
          },
        },
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      req.prisma.stockMovement.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        movements,
        total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        totalPages: Math.ceil(total / parseInt(pageSize as string)),
      },
    });
  } catch (error) {
    console.error("Get stock movements error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get stock movements",
    });
  }
});

// Add stock (receive inventory)
router.post(
  "/receive",
  authenticate,
  authorize("admin", "manager"),
  async (req: AuthRequest, res) => {
    try {
      const { productId, quantity, notes } = req.body;

      if (!productId || !quantity || quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: "Product ID and positive quantity are required",
        });
      }

      const product = await req.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          error: "Product not found",
        });
      }

      // Update stock and create movement in transaction
      const [updatedProduct, movement] = await req.prisma.$transaction([
        req.prisma.product.update({
          where: { id: productId },
          data: {
            stockQuantity: {
              increment: quantity,
            },
          },
        }),
        req.prisma.stockMovement.create({
          data: {
            productId,
            quantity,
            type: "in",
            reason: "purchase",
            notes,
            userId: req.user!.id,
          },
        }),
      ]);

      res.status(201).json({
        success: true,
        data: {
          product: updatedProduct,
          movement,
        },
      });
    } catch (error) {
      console.error("Receive stock error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to receive stock",
      });
    }
  }
);

// Adjust stock (for corrections, damage, theft, etc.)
router.post(
  "/adjust",
  authenticate,
  authorize("admin", "manager"),
  async (req: AuthRequest, res) => {
    try {
      const { productId, quantity, reason, notes } = req.body;

      if (!productId || quantity === undefined || !reason) {
        return res.status(400).json({
          success: false,
          error: "Product ID, quantity, and reason are required",
        });
      }

      const product = await req.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          error: "Product not found",
        });
      }

      const newQuantity = product.stockQuantity + quantity;
      if (newQuantity < 0) {
        return res.status(400).json({
          success: false,
          error: "Adjustment would result in negative stock",
        });
      }

      const type = quantity >= 0 ? "in" : "out";

      // Update stock and create movement in transaction
      const [updatedProduct, movement] = await req.prisma.$transaction([
        req.prisma.product.update({
          where: { id: productId },
          data: {
            stockQuantity: newQuantity,
          },
        }),
        req.prisma.stockMovement.create({
          data: {
            productId,
            quantity: Math.abs(quantity),
            type,
            reason,
            notes,
            userId: req.user!.id,
          },
        }),
      ]);

      res.status(201).json({
        success: true,
        data: {
          product: updatedProduct,
          movement,
        },
      });
    } catch (error) {
      console.error("Adjust stock error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to adjust stock",
      });
    }
  }
);

export default router;
