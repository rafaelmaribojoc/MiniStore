import { Router } from "express";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();

// Get all products
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const {
      search,
      categoryId,
      lowStock,
      page = "1",
      pageSize = "50",
    } = req.query;

    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { sku: { contains: search as string, mode: "insensitive" } },
        { barcode: { contains: search as string } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (lowStock === "true") {
      where.stockQuantity = { lte: req.prisma.$queryRaw`"minStockLevel"` };
    }

    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const [products, total] = await Promise.all([
      req.prisma.product.findMany({
        where,
        include: {
          category: true,
          supplier: true,
        },
        skip,
        take,
        orderBy: { name: "asc" },
      }),
      req.prisma.product.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        products,
        total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        totalPages: Math.ceil(total / parseInt(pageSize as string)),
      },
    });
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get products",
    });
  }
});

// Get product by ID
router.get("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const product = await req.prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        supplier: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get product",
    });
  }
});

// Get product by barcode
router.get("/barcode/:barcode", authenticate, async (req: AuthRequest, res) => {
  try {
    const product = await req.prisma.product.findFirst({
      where: {
        barcode: req.params.barcode,
        isActive: true,
      },
      include: {
        category: true,
        supplier: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Get product by barcode error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get product",
    });
  }
});

// Create product
router.post(
  "/",
  authenticate,
  authorize("admin", "manager"),
  async (req: AuthRequest, res) => {
    try {
      const {
        name,
        sku,
        barcode,
        description,
        price,
        cost,
        stockQuantity,
        minStockLevel,
        categoryId,
        supplierId,
        imageUrl,
      } = req.body;

      // Check for duplicate SKU
      const existingSku = await req.prisma.product.findUnique({
        where: { sku },
      });
      if (existingSku) {
        return res.status(400).json({
          success: false,
          error: "SKU already exists",
        });
      }

      // Check for duplicate barcode
      if (barcode) {
        const existingBarcode = await req.prisma.product.findFirst({
          where: { barcode },
        });
        if (existingBarcode) {
          return res.status(400).json({
            success: false,
            error: "Barcode already exists",
          });
        }
      }

      const product = await req.prisma.product.create({
        data: {
          name,
          sku,
          barcode,
          description,
          price: parseFloat(price),
          cost: parseFloat(cost),
          stockQuantity: parseInt(stockQuantity) || 0,
          minStockLevel: parseInt(minStockLevel) || 10,
          categoryId,
          supplierId,
          imageUrl,
        },
        include: {
          category: true,
          supplier: true,
        },
      });

      // Create initial stock movement if stockQuantity > 0
      if (product.stockQuantity > 0) {
        await req.prisma.stockMovement.create({
          data: {
            productId: product.id,
            quantity: product.stockQuantity,
            type: "in",
            reason: "initial",
            notes: "Initial stock on product creation",
            userId: req.user!.id,
          },
        });
      }

      res.status(201).json({
        success: true,
        data: product,
      });
    } catch (error) {
      console.error("Create product error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create product",
      });
    }
  }
);

// Update product
router.put(
  "/:id",
  authenticate,
  authorize("admin", "manager"),
  async (req: AuthRequest, res) => {
    try {
      const {
        name,
        sku,
        barcode,
        description,
        price,
        cost,
        minStockLevel,
        categoryId,
        supplierId,
        imageUrl,
        isActive,
      } = req.body;

      const existingProduct = await req.prisma.product.findUnique({
        where: { id: req.params.id },
      });
      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          error: "Product not found",
        });
      }

      // Check for duplicate SKU
      if (sku && sku !== existingProduct.sku) {
        const existingSku = await req.prisma.product.findUnique({
          where: { sku },
        });
        if (existingSku) {
          return res.status(400).json({
            success: false,
            error: "SKU already exists",
          });
        }
      }

      // Check for duplicate barcode
      if (barcode && barcode !== existingProduct.barcode) {
        const existingBarcode = await req.prisma.product.findFirst({
          where: { barcode },
        });
        if (existingBarcode) {
          return res.status(400).json({
            success: false,
            error: "Barcode already exists",
          });
        }
      }

      const product = await req.prisma.product.update({
        where: { id: req.params.id },
        data: {
          name,
          sku,
          barcode,
          description,
          price: price !== undefined ? parseFloat(price) : undefined,
          cost: cost !== undefined ? parseFloat(cost) : undefined,
          minStockLevel:
            minStockLevel !== undefined ? parseInt(minStockLevel) : undefined,
          categoryId,
          supplierId,
          imageUrl,
          isActive,
        },
        include: {
          category: true,
          supplier: true,
        },
      });

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      console.error("Update product error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update product",
      });
    }
  }
);

// Delete product (soft delete)
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  async (req: AuthRequest, res) => {
    try {
      const product = await req.prisma.product.update({
        where: { id: req.params.id },
        data: { isActive: false },
      });

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      console.error("Delete product error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete product",
      });
    }
  }
);

// Get low stock products
router.get("/alerts/low-stock", authenticate, async (req: AuthRequest, res) => {
  try {
    const products = await req.prisma.$queryRaw`
      SELECT p.*, c.name as "categoryName"
      FROM products p
      LEFT JOIN categories c ON p."categoryId" = c.id
      WHERE p."isActive" = true AND p."stockQuantity" <= p."minStockLevel"
      ORDER BY p."stockQuantity" ASC
    `;

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Get low stock products error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get low stock products",
    });
  }
});

export default router;
