CREATE TABLE "site_visit_counter" (
  "id" SMALLINT NOT NULL DEFAULT 1,
  "visit_count" BIGINT NOT NULL DEFAULT 0,
  CONSTRAINT "site_visit_counter_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "site_visit_counter_singleton" CHECK ("id" = 1),
  CONSTRAINT "site_visit_counter_nonnegative" CHECK ("visit_count" >= 0)
);

INSERT INTO "site_visit_counter" ("id", "visit_count")
SELECT 1, COUNT(*) FROM "site_visits";

CREATE FUNCTION increment_site_visit_counter() RETURNS trigger AS $$
BEGIN
  UPDATE "site_visit_counter"
  SET "visit_count" = "visit_count" + 1
  WHERE "id" = 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "site_visits_increment_counter"
AFTER INSERT ON "site_visits"
FOR EACH ROW
EXECUTE FUNCTION increment_site_visit_counter();
