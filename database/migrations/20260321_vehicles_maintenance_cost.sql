-- Add maintenance cost and linked transaction to vehicles
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS maintenance_cost DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS maintenance_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vehicles_maintenance_transaction_id ON vehicles(maintenance_transaction_id);
