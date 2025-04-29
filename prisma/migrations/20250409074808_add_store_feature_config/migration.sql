-- CreateTable
CREATE TABLE "store_feature_config" (
    "id" BIGSERIAL NOT NULL,
    "storeName" TEXT NOT NULL,
    "features" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_feature_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_feature_config_storeName_key" ON "store_feature_config"("storeName");
