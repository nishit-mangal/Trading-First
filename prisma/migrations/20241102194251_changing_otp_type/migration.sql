/*
  Warnings:

  - You are about to alter the column `otp` on the `otp` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - Made the column `otp` on table `otp` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "otp" ALTER COLUMN "otp" SET NOT NULL,
ALTER COLUMN "otp" SET DATA TYPE INTEGER;
