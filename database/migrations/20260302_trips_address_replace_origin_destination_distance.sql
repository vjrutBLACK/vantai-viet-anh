-- Thay origin, destination, distance bằng một cột address (địa chỉ chuyến).
-- An toàn khi chạy nhiều lần (bỏ qua bước gộp nếu cột cũ đã xóa).

ALTER TABLE trips ADD COLUMN IF NOT EXISTS address TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'trips'
      AND column_name = 'origin'
  ) THEN
    UPDATE trips
    SET address = CASE
      WHEN COALESCE(TRIM(origin::text), '') = '' AND COALESCE(TRIM(destination::text), '') = '' THEN NULL
      WHEN COALESCE(TRIM(origin::text), '') = '' THEN TRIM(destination::text)
      WHEN COALESCE(TRIM(destination::text), '') = '' THEN TRIM(origin::text)
      ELSE TRIM(origin::text) || ' → ' || TRIM(destination::text)
    END
    WHERE address IS NULL;
  END IF;
END $$;

ALTER TABLE trips DROP COLUMN IF EXISTS origin;
ALTER TABLE trips DROP COLUMN IF EXISTS destination;
ALTER TABLE trips DROP COLUMN IF EXISTS distance;
