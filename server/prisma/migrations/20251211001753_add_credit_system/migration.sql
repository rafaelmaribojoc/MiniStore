-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('purchase', 'payment', 'adjustment');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'credit';

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "address" TEXT,
ADD COLUMN     "creditBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "creditLimit" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" "CreditTransactionType" NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "balanceAfter" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" TEXT NOT NULL,
    "saleId" TEXT,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_transactions_customerId_idx" ON "credit_transactions"("customerId");

-- CreateIndex
CREATE INDEX "credit_transactions_createdAt_idx" ON "credit_transactions"("createdAt");

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
