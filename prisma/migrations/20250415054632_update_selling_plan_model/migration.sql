/*
  Warnings:

  - You are about to drop the column `status` on the `Selling_Plan` table. All the data in the column will be lost.
  - You are about to drop the `Selling_Plan_Item` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Selling_Plan" DROP COLUMN "status",
ADD COLUMN     "companyLocationId" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedById" TEXT;

-- DropTable
DROP TABLE "Selling_Plan_Item";

-- CreateTable
CREATE TABLE "Selling_Plan_Line" (
    "id" BIGSERIAL NOT NULL,
    "storeName" TEXT NOT NULL,
    "sellingPlanId" BIGINT NOT NULL,
    "variantId" VARCHAR(50) NOT NULL,
    "sku" VARCHAR(50) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Selling_Plan_Line_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Selling_Plan_Line_sellingPlanId_idx" ON "Selling_Plan_Line"("sellingPlanId");
