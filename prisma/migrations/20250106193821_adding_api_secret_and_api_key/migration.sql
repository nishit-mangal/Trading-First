-- AlterTable
ALTER TABLE "users" ADD COLUMN     "user_api_key" UUID,
ADD COLUMN     "user_api_secret" VARCHAR(255);
