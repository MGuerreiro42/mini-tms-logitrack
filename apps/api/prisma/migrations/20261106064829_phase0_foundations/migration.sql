-- AlterTable
ALTER TABLE "User" ADD COLUMN     "name" TEXT;

-- AlterTable
ALTER TABLE "TrackingEvent" ADD COLUMN     "actorId" TEXT;

-- AddForeignKey
ALTER TABLE "TrackingEvent" ADD CONSTRAINT "TrackingEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "dueAt" TIMESTAMP(3);

-- Backfill: the modality's current slaHours is the only value available
UPDATE "Shipment" s
SET "dueAt" = s."createdAt" + m."slaHours" * INTERVAL '1 hour'
FROM "DeliveryModality" m
WHERE m."id" = s."modalityId" AND m."slaHours" IS NOT NULL;

UPDATE "Shipment" s
SET "deliveredAt" = e."deliveredAt"
FROM (
  SELECT "shipmentId", MIN("createdAt") AS "deliveredAt"
  FROM "TrackingEvent"
  WHERE "status" = 'DELIVERED'
  GROUP BY "shipmentId"
) e
WHERE e."shipmentId" = s."id";

-- Digits only; two documents equal after this fail the unique index and are resolved by hand
UPDATE "Seller" SET "document" = regexp_replace("document", '\D', '', 'g') WHERE "document" ~ '\D';
UPDATE "Carrier" SET "document" = regexp_replace("document", '\D', '', 'g') WHERE "document" ~ '\D';
UPDATE "Shipment" SET "addressZipCode" = regexp_replace("addressZipCode", '\D', '', 'g') WHERE "addressZipCode" ~ '\D';

-- DropIndex
DROP INDEX "CarrierCoverageArea_carrierId_state_city_key";

-- DropIndex
DROP INDEX "CarrierCoverageArea_state_city_idx";

-- AlterTable
ALTER TABLE "CarrierCoverageArea" ADD COLUMN     "cityKey" TEXT;

-- Same key as cityKey() in src/shared/transforms/normalize.ts, for the Portuguese accented letters
UPDATE "CarrierCoverageArea"
SET "cityKey" = translate(
  lower(btrim("city")),
  'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
  'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn'
)
WHERE "city" IS NOT NULL;

-- Rows that now share a key within a carrier and state merge into the oldest
DELETE FROM "CarrierCoverageArea" a
USING "CarrierCoverageArea" b
WHERE a."carrierId" = b."carrierId"
  AND a."state" = b."state"
  AND a."cityKey" = b."cityKey"
  AND (b."createdAt", b."id") < (a."createdAt", a."id");

-- CreateIndex
CREATE INDEX "CarrierCoverageArea_state_cityKey_idx" ON "CarrierCoverageArea"("state", "cityKey");

-- CreateIndex
CREATE UNIQUE INDEX "CarrierCoverageArea_carrierId_state_cityKey_key" ON "CarrierCoverageArea"("carrierId", "state", "cityKey");
