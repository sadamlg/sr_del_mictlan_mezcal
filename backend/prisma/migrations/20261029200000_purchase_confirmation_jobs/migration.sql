ALTER TYPE "EmailJobType" ADD VALUE 'PURCHASE_CONFIRMATION';

ALTER TABLE "email_jobs"
ADD COLUMN "order_id" UUID;

CREATE UNIQUE INDEX "email_jobs_order_id_key" ON "email_jobs"("order_id");

ALTER TABLE "email_jobs"
ADD CONSTRAINT "email_jobs_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
