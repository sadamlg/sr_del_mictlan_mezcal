CREATE TABLE "site_visits" (
  "id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "site_visits_pkey" PRIMARY KEY ("id")
);
