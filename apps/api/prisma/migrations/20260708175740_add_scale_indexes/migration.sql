-- CreateIndex
CREATE INDEX "Carrier_status_idx" ON "Carrier"("status");

-- CreateIndex
CREATE INDEX "CarrierCoverageArea_state_city_idx" ON "CarrierCoverageArea"("state", "city");

-- CreateIndex
CREATE INDEX "CarrierModality_modalityId_idx" ON "CarrierModality"("modalityId");

-- CreateIndex
CREATE INDEX "CarrierUser_carrierId_role_idx" ON "CarrierUser"("carrierId", "role");

-- CreateIndex
CREATE INDEX "Invite_carrierId_status_idx" ON "Invite"("carrierId", "status");

-- CreateIndex
CREATE INDEX "Seller_status_idx" ON "Seller"("status");

-- CreateIndex
CREATE INDEX "Shipment_sellerId_status_idx" ON "Shipment"("sellerId", "status");

-- CreateIndex
CREATE INDEX "Shipment_carrierId_status_idx" ON "Shipment"("carrierId", "status");

-- CreateIndex
CREATE INDEX "Shipment_ownerId_idx" ON "Shipment"("ownerId");

-- CreateIndex
CREATE INDEX "TrackingEvent_shipmentId_createdAt_idx" ON "TrackingEvent"("shipmentId", "createdAt");
