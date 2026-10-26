ALTER TABLE "accounts"
ADD COLUMN "first_name" VARCHAR(120),
ADD COLUMN "last_name" VARCHAR(120);

WITH normalized_accounts AS (
  SELECT "id", regexp_replace(btrim("name"), '\s+', ' ', 'g') AS "full_name"
  FROM "accounts"
)
UPDATE "accounts" AS account
SET
  "first_name" = split_part(normalized."full_name", ' ', 1),
  "last_name" = CASE
    WHEN strpos(normalized."full_name", ' ') = 0 THEN ''
    ELSE substring(normalized."full_name" FROM strpos(normalized."full_name", ' ') + 1)
  END
FROM normalized_accounts AS normalized
WHERE account."id" = normalized."id";

ALTER TABLE "accounts"
ALTER COLUMN "first_name" SET NOT NULL,
ALTER COLUMN "last_name" SET NOT NULL,
DROP COLUMN "name";
