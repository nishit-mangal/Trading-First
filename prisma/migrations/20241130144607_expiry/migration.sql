/*
  Warnings:

  - You are about to drop the column `is_valid` on the `otp` table. All the data in the column will be lost.
  - You are about to drop the column `otp_sent_date` on the `otp` table. All the data in the column will be lost.
  - Added the required column `expired_at` to the `otp` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "otp" DROP COLUMN "is_valid",
DROP COLUMN "otp_sent_date",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expired_at" TIMESTAMP(3) NOT NULL;
