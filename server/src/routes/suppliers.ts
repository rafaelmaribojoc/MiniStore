import { Router } from "express";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();

// Get all suppliers
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const suppliers = await req.prisma.supplier.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    res.json({
      success: true,
      data: suppliers,
    });
  } catch (error) {
    console.error("Get suppliers error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get suppliers",
    });
  }
});

// Create supplier
router.post(
  "/",
  authenticate,
  authorize("admin", "manager"),
  async (req: AuthRequest, res) => {
    try {
      const { name, contactPerson, email, phone, address } = req.body;

      const supplier = await req.prisma.supplier.create({
        data: { name, contactPerson, email, phone, address },
      });

      res.status(201).json({
        success: true,
        data: supplier,
      });
    } catch (error) {
      console.error("Create supplier error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create supplier",
      });
    }
  }
);

// Update supplier
router.put(
  "/:id",
  authenticate,
  authorize("admin", "manager"),
  async (req: AuthRequest, res) => {
    try {
      const { name, contactPerson, email, phone, address } = req.body;

      const supplier = await req.prisma.supplier.update({
        where: { id: req.params.id },
        data: { name, contactPerson, email, phone, address },
      });

      res.json({
        success: true,
        data: supplier,
      });
    } catch (error) {
      console.error("Update supplier error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update supplier",
      });
    }
  }
);

// Delete supplier
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  async (req: AuthRequest, res) => {
    try {
      const productsCount = await req.prisma.product.count({
        where: { supplierId: req.params.id },
      });

      if (productsCount > 0) {
        return res.status(400).json({
          success: false,
          error: "Cannot delete supplier with existing products",
        });
      }

      await req.prisma.supplier.delete({
        where: { id: req.params.id },
      });

      res.json({
        success: true,
        message: "Supplier deleted",
      });
    } catch (error) {
      console.error("Delete supplier error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete supplier",
      });
    }
  }
);

export default router;
