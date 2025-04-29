-- CreateTable
CREATE TABLE "Subscription_Recommendation_Result" (
    "id" BIGSERIAL NOT NULL,
    "storeName" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "companyLocationId" TEXT NOT NULL,
    "ruleResults" JSONB NOT NULL,
    "llmOutput" JSONB,
    "finalRecommendations" JSONB NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'v1',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_Recommendation_Result_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Subscription_Recommendation_Result_expiresAt_idx" ON "Subscription_Recommendation_Result"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_Recommendation_Result_storeName_customerId_com_key" ON "Subscription_Recommendation_Result"("storeName", "customerId", "companyLocationId", "version");
