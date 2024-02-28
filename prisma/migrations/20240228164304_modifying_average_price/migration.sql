/*
  Warnings:

  - You are about to alter the column `average_price` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "average_price" SET DATA TYPE DECIMAL(10,2);
