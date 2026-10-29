ALTER TABLE "orders"
ADD COLUMN "recipient_name" VARCHAR(255),
ADD COLUMN "recipient_email" VARCHAR(254),
ADD COLUMN "shipping_address" JSONB;

UPDATE "orders" AS order_snapshot
SET
  "recipient_name" = LEFT(CONCAT_WS(' ', account."first_name", account."last_name"), 255),
  "recipient_email" = account."email",
  "shipping_address" = jsonb_build_object(
    'street', account."street",
    'number', account."number",
    'neighborhood', account."neighborhood",
    'locality', account."locality",
    'state', account."state",
    'postalCode', account."postal_code"
  )
FROM "accounts" AS account
WHERE account."id" = order_snapshot."account_id";

ALTER TABLE "orders"
ALTER COLUMN "recipient_name" SET NOT NULL,
ALTER COLUMN "recipient_email" SET NOT NULL,
ALTER COLUMN "shipping_address" SET NOT NULL;
