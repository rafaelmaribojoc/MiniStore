import { Router } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

// Get dashboard stats
router.get("/stats", authenticate, async (req: AuthRequest, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's sales
    const todaySales = await req.prisma.sale.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
        status: "completed",
      },
    });

    const todayRevenue = todaySales.reduce(
      (sum: number, sale: any) => sum + Number(sale.total),
      0
    );
    const todayTransactions = todaySales.length;

    // Low stock and out of stock counts
    const lowStockProducts = await req.prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count
      FROM products
      WHERE "isActive" = true AND "stockQuantity" <= "minStockLevel" AND "stockQuantity" > 0
    `;

    const outOfStockProducts = await req.prisma.product.count({
      where: {
        isActive: true,
        stockQuantity: 0,
      },
    });

    // Total products
    const totalProducts = await req.prisma.product.count({
      where: { isActive: true },
    });

    // Recent sales
    const recentSales = await req.prisma.sale.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { username: true, fullName: true },
        },
        _count: {
          select: { items: true },
        },
      },
    });

    res.json({
      success: true,
      data: {
        todaySales: todayRevenue,
        todayRevenue,
        todayTransactions,
        lowStockCount: parseInt(lowStockProducts[0]?.count || "0"),
        outOfStockCount: outOfStockProducts,
        totalProducts,
        recentSales,
      },
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get dashboard stats",
    });
  }
});

// Get sales report
router.get("/reports/sales", authenticate, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, groupBy = "day" } = req.query;

    const start = startDate
      ? new Date(startDate as string)
      : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate as string) : new Date();
    end.setHours(23, 59, 59, 999);

    const sales = await req.prisma.sale.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
        status: "completed",
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Calculate totals
    const totalRevenue = sales.reduce(
      (sum: number, sale: any) => sum + Number(sale.total),
      0
    );
    const totalProfit = sales.reduce((sum: number, sale: any) => {
      const saleCost = sale.items.reduce((itemSum: number, item: any) => {
        return itemSum + Number(item.product.cost) * item.quantity;
      }, 0);
      return sum + (Number(sale.total) - saleCost);
    }, 0);

    // Group by date
    const salesByDate: { [key: string]: { count: number; total: number } } = {};
    sales.forEach((sale: any) => {
      let dateKey: string;
      const saleDate = new Date(sale.createdAt);

      if (groupBy === "month") {
        dateKey = `${saleDate.getFullYear()}-${(saleDate.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
      } else if (groupBy === "week") {
        const weekStart = new Date(saleDate);
        weekStart.setDate(saleDate.getDate() - saleDate.getDay());
        dateKey = weekStart.toISOString().split("T")[0];
      } else {
        dateKey = saleDate.toISOString().split("T")[0];
      }

      if (!salesByDate[dateKey]) {
        salesByDate[dateKey] = { count: 0, total: 0 };
      }
      salesByDate[dateKey].count++;
      salesByDate[dateKey].total += Number(sale.total);
    });

    // Sales by payment method
    const salesByPaymentMethod: {
      [key: string]: { count: number; total: number };
    } = {};
    sales.forEach((sale: any) => {
      const method = sale.paymentMethod;
      if (!salesByPaymentMethod[method]) {
        salesByPaymentMethod[method] = { count: 0, total: 0 };
      }
      salesByPaymentMethod[method].count++;
      salesByPaymentMethod[method].total += Number(sale.total);
    });

    res.json({
      success: true,
      data: {
        totalSales: sales.length,
        totalRevenue,
        totalProfit,
        averageOrderValue: sales.length > 0 ? totalRevenue / sales.length : 0,
        salesByDate: Object.entries(salesByDate).map(([date, data]) => ({
          date,
          ...data,
        })),
        salesByPaymentMethod: Object.entries(salesByPaymentMethod).map(
          ([method, data]) => ({
            method,
            ...data,
          })
        ),
      },
    });
  } catch (error) {
    console.error("Get sales report error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get sales report",
    });
  }
});

// Get inventory report
router.get(
  "/reports/inventory",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      // Total inventory value
      const products = await req.prisma.product.findMany({
        where: { isActive: true },
        include: {
          category: true,
        },
      });

      const totalStockValue = products.reduce(
        (sum: number, p: any) => sum + Number(p.cost) * p.stockQuantity,
        0
      );
      const totalRetailValue = products.reduce(
        (sum: number, p: any) => sum + Number(p.price) * p.stockQuantity,
        0
      );

      // Low stock products
      const lowStockProducts = products.filter(
        (p: any) => p.stockQuantity <= p.minStockLevel && p.stockQuantity > 0
      );

      // Out of stock products
      const outOfStockProducts = products.filter(
        (p: any) => p.stockQuantity === 0
      );

      // Top selling products (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const topSelling = await req.prisma.saleItem.groupBy({
        by: ["productId"],
        _sum: {
          quantity: true,
          subtotal: true,
        },
        where: {
          sale: {
            createdAt: {
              gte: thirtyDaysAgo,
            },
            status: "completed",
          },
        },
        orderBy: {
          _sum: {
            quantity: "desc",
          },
        },
        take: 10,
      });

      const topSellingProducts = await Promise.all(
        topSelling.map(async (item: any) => {
          const product = await req.prisma.product.findUnique({
            where: { id: item.productId },
          });
          return {
            product,
            quantitySold: item._sum.quantity || 0,
            revenue: item._sum.subtotal || 0,
          };
        })
      );

      res.json({
        success: true,
        data: {
          totalProducts: products.length,
          totalStockValue,
          totalRetailValue,
          potentialProfit: totalRetailValue - totalStockValue,
          lowStockProducts,
          outOfStockProducts,
          topSellingProducts,
        },
      });
    } catch (error) {
      console.error("Get inventory report error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get inventory report",
      });
    }
  }
);

export default router;
