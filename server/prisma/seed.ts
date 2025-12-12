import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create default admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      fullName: "System Administrator",
      email: "admin@vendoa.com",
      passwordHash: adminPassword,
      role: "admin",
    },
  });
  console.log("✅ Created admin user:", admin.username);

  // Create default manager user
  const managerPassword = await bcrypt.hash("manager123", 10);
  const manager = await prisma.user.upsert({
    where: { username: "manager" },
    update: {},
    create: {
      username: "manager",
      fullName: "Store Manager",
      email: "manager@vendoa.com",
      passwordHash: managerPassword,
      role: "manager",
    },
  });
  console.log("✅ Created manager user:", manager.username);

  // Create default cashier user
  const cashierPassword = await bcrypt.hash("cashier123", 10);
  const cashier = await prisma.user.upsert({
    where: { username: "cashier" },
    update: {},
    create: {
      username: "cashier",
      fullName: "Juan Dela Cruz",
      email: "cashier@vendoa.com",
      passwordHash: cashierPassword,
      role: "cashier",
    },
  });
  console.log("✅ Created cashier user:", cashier.username);

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: "Beverages" },
      update: {},
      create: { name: "Beverages", description: "Drinks and beverages" },
    }),
    prisma.category.upsert({
      where: { name: "Snacks" },
      update: {},
      create: {
        name: "Snacks",
        description: "Chips, candies, and snack items",
      },
    }),
    prisma.category.upsert({
      where: { name: "Dairy" },
      update: {},
      create: {
        name: "Dairy",
        description: "Milk, cheese, and dairy products",
      },
    }),
    prisma.category.upsert({
      where: { name: "Canned Goods" },
      update: {},
      create: { name: "Canned Goods", description: "Canned food items" },
    }),
    prisma.category.upsert({
      where: { name: "Personal Care" },
      update: {},
      create: {
        name: "Personal Care",
        description: "Hygiene and personal care items",
      },
    }),
  ]);
  console.log("✅ Created categories:", categories.length);

  // Create suppliers
  const supplier = await prisma.supplier.upsert({
    where: { id: "default-supplier" },
    update: {},
    create: {
      id: "default-supplier",
      name: "General Supplier",
      contactPerson: "John Doe",
      email: "supplier@example.com",
      phone: "123-456-7890",
    },
  });
  console.log("✅ Created supplier:", supplier.name);

  // Create sample products
  const beveragesCategory = categories.find((c) => c.name === "Beverages");
  const snacksCategory = categories.find((c) => c.name === "Snacks");
  const dairyCategory = categories.find((c) => c.name === "Dairy");

  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: "BEV001" },
      update: {},
      create: {
        name: "Coca-Cola 330ml",
        sku: "BEV001",
        barcode: "5449000000996",
        price: 1.5,
        cost: 0.8,
        stockQuantity: 100,
        minStockLevel: 20,
        categoryId: beveragesCategory?.id,
        supplierId: supplier.id,
      },
    }),
    prisma.product.upsert({
      where: { sku: "BEV002" },
      update: {},
      create: {
        name: "Bottled Water 500ml",
        sku: "BEV002",
        barcode: "4800000000001",
        price: 0.75,
        cost: 0.3,
        stockQuantity: 200,
        minStockLevel: 50,
        categoryId: beveragesCategory?.id,
        supplierId: supplier.id,
      },
    }),
    prisma.product.upsert({
      where: { sku: "SNK001" },
      update: {},
      create: {
        name: "Potato Chips Original",
        sku: "SNK001",
        barcode: "0028400000001",
        price: 2.5,
        cost: 1.5,
        stockQuantity: 50,
        minStockLevel: 15,
        categoryId: snacksCategory?.id,
        supplierId: supplier.id,
      },
    }),
    prisma.product.upsert({
      where: { sku: "SNK002" },
      update: {},
      create: {
        name: "Chocolate Bar",
        sku: "SNK002",
        barcode: "0000000000000",
        price: 1.25,
        cost: 0.7,
        stockQuantity: 80,
        minStockLevel: 25,
        categoryId: snacksCategory?.id,
        supplierId: supplier.id,
      },
    }),
    prisma.product.upsert({
      where: { sku: "DRY001" },
      update: {},
      create: {
        name: "Fresh Milk 1L",
        sku: "DRY001",
        barcode: "4800000000002",
        price: 2.0,
        cost: 1.2,
        stockQuantity: 30,
        minStockLevel: 10,
        categoryId: dairyCategory?.id,
        supplierId: supplier.id,
      },
    }),
  ]);
  console.log("✅ Created products:", products.length);

  // Create initial stock movements
  for (const product of products) {
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        quantity: product.stockQuantity,
        type: "in",
        reason: "initial",
        notes: "Initial stock",
        userId: admin.id,
      },
    });
  }
  console.log("✅ Created initial stock movements");

  console.log("🎉 Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
