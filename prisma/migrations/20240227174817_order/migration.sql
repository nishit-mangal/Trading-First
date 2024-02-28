-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "order_id" TEXT NOT NULL,
    "trading_symbol" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "average_price" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL,
    "order_type" TEXT NOT NULL,
    "validity" TEXT NOT NULL,
    "order_timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_order_id_key" ON "Order"("order_id");
