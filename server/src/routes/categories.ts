import { Router } from "express";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();

// Get all categories
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const categories = await req.prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get categories",
    });
  }
});

// Create category
router.post(
  "/",
  authenticate,
  authorize("admin", "manager"),
  async (req: AuthRequest, res) => {
    try {
      const { name, description } = req.body;

      const existing = await req.prisma.category.findUnique({
        where: { name },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          error: "Category already exists",
        });
      }

      const category = await req.prisma.category.create({
        data: { name, description },
      });

      res.status(201).json({
        success: true,
        data: category,
      });
    } catch (error) {
      console.error("Create category error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create category",
      });
    }
  }
);

// Update category
router.put(
  "/:id",
  authenticate,
  authorize("admin", "manager"),
  async (req: AuthRequest, res) => {
    try {
      const { name, description } = req.body;

      const category = await req.prisma.category.update({
        where: { id: req.params.id },
        data: { name, description },
      });

      res.json({
        success: true,
        data: category,
      });
    } catch (error) {
      console.error("Update category error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update category",
      });
    }
  }
);

// Delete category
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  async (req: AuthRequest, res) => {
    try {
      // Check if category has products
      const productsCount = await req.prisma.product.count({
        where: { categoryId: req.params.id },
      });

      if (productsCount > 0) {
        return res.status(400).json({
          success: false,
          error: "Cannot delete category with existing products",
        });
      }

      await req.prisma.category.delete({
        where: { id: req.params.id },
      });

      res.json({
        success: true,
        message: "Category deleted",
      });
    } catch (error) {
      console.error("Delete category error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete category",
      });
    }
  }
);

export default router;
