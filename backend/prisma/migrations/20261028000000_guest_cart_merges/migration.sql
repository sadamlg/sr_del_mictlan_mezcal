CREATE TABLE "account_cart_merges" (
    "account_id" UUID NOT NULL,
    "transfer_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_cart_merges_pkey" PRIMARY KEY ("account_id", "transfer_id"),
    CONSTRAINT "account_cart_merges_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
