-- AlterTable
ALTER TABLE "PredictionJob" ADD COLUMN "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "Prediction_operationalReadingId_key" ON "Prediction"("operationalReadingId");

-- DropIndex
DROP INDEX "PredictionJob_status_createdAt_idx";

-- CreateIndex
CREATE INDEX "PredictionJob_status_nextRunAt_createdAt_idx" ON "PredictionJob"("status", "nextRunAt", "createdAt");
