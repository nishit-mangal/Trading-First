/*
  Warnings:

  - Added the required column `otp_type` to the `otp` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "otp" ADD COLUMN     "otp_type" VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "upstox_users" (
    "upstox_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "user_name" TEXT,
    "is_active" BOOLEAN,
    "user_id" BIGINT NOT NULL,
    "id" BIGSERIAL NOT NULL,

    CONSTRAINT "upstox_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holdings" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "company_name" TEXT,
    "quantity" INTEGER,
    "pnl" DECIMAL(10,2),
    "trading_symbol" TEXT,
    "last_price" DECIMAL(10,2),
    "instrument_token" TEXT,
    "average_price" DECIMAL(10,2),

    CONSTRAINT "holdings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "upstox_users" ADD CONSTRAINT "upstox_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
