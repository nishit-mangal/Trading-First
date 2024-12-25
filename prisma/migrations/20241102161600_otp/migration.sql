-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "order_id" TEXT NOT NULL,
    "trading_symbol" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "average_price" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL,
    "order_type" TEXT NOT NULL,
    "validity" TEXT NOT NULL,
    "order_timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp" (
    "is_valid" BOOLEAN,
    "id" BIGSERIAL NOT NULL,
    "otp" BIGINT,
    "otp_sent_date" TIMESTAMP(6),
    "user_id" BIGINT,
    "phone_number" VARCHAR(255),

    CONSTRAINT "otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "email" VARCHAR(255),
    "password" VARCHAR(255),
    "username" VARCHAR(255),
    "phone_number" VARCHAR(255),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_order_id_key" ON "Order"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
