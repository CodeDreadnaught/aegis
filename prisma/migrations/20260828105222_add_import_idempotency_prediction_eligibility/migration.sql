ALTER TABLE "OperationalReading"
ADD COLUMN "predictionEligible" BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX "OperationalReading_equipmentId_recordedAt_key"
ON "OperationalReading"("equipmentId", "recordedAt");

CREATE INDEX "OperationalReading_predictionEligible_recordedAt_idx"
ON "OperationalReading"("predictionEligible", "recordedAt");

CREATE UNIQUE INDEX "MaintenanceRecord_equipmentId_type_performedAt_description_key"
ON "MaintenanceRecord"("equipmentId", "type", "performedAt", "description");