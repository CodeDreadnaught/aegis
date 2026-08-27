-- CreateEnum
CREATE TYPE "PredictionJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "PredictionJob" (
    "id" TEXT NOT NULL,
    "operationalReadingId" TEXT NOT NULL,
    "status" "PredictionJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PredictionJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PredictionJob_operationalReadingId_key" ON "PredictionJob"("operationalReadingId");

-- CreateIndex
CREATE INDEX "PredictionJob_status_createdAt_idx" ON "PredictionJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PredictionJob_processedAt_idx" ON "PredictionJob"("processedAt");

-- AddForeignKey
ALTER TABLE "PredictionJob" ADD CONSTRAINT "PredictionJob_operationalReadingId_fkey" FOREIGN KEY ("operationalReadingId") REFERENCES "OperationalReading"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
