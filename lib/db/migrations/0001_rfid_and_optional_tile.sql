-- Migration: RFID tags + optional Tile
-- Equipment may now carry any combination of trackers (Tile, QR, RFID).
-- Apply with: psql "$DATABASE_URL" -f lib/db/migrations/0001_rfid_and_optional_tile.sql
-- (or, in dev, just run: pnpm --filter @workspace/db run push)

ALTER TABLE equipment ALTER COLUMN tile_uuid DROP NOT NULL;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS rfid_tag text;
ALTER TABLE equipment ADD CONSTRAINT equipment_rfid_tag_unique UNIQUE (rfid_tag);
