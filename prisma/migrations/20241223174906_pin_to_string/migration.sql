/*
  Warnings:

  - You are about to alter the column `pin` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `VarChar(4)`.

*/
-- AlterTable
ALTER TABLE "users" ALTER COLUMN "pin" SET DATA TYPE VARCHAR(4);
