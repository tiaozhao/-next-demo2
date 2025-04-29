-- CreateTable
CREATE TABLE "Subscription_Recommendation_Rules" (
    "id" BIGSERIAL NOT NULL,
    "storeName" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ruleType" TEXT,
    "ruleGroup" TEXT,
    "engineName" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "conditions" JSONB NOT NULL,
    "event" JSONB NOT NULL,
    "scopeFilters" JSONB,
    "metadata" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_Recommendation_Rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_Recommendation_Rules_storeName_ruleKey_version_key" ON "Subscription_Recommendation_Rules"("storeName", "ruleKey", "version");
