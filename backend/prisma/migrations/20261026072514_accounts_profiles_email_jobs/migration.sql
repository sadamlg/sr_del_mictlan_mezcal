-- CreateEnum
CREATE TYPE "AccountTokenPurpose" AS ENUM ('ACCOUNT_CONFIRMATION', 'PASSWORD_RESET', 'EMAIL_CHANGE');

-- CreateEnum
CREATE TYPE "EmailJobType" AS ENUM ('ACCOUNT_CONFIRMATION', 'PASSWORD_RESET', 'EMAIL_CHANGE_CONFIRMATION');

-- CreateEnum
CREATE TYPE "EmailJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'RETRY', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "pending_email" VARCHAR(254),
    "password_hash" VARCHAR(220) NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "street" VARCHAR(120) NOT NULL,
    "number" VARCHAR(120) NOT NULL,
    "neighborhood" VARCHAR(120) NOT NULL,
    "locality" VARCHAR(120) NOT NULL,
    "state" VARCHAR(120) NOT NULL,
    "postal_code" VARCHAR(5) NOT NULL,
    "email_verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_sessions" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "account_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_tokens" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "purpose" "AccountTokenPurpose" NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_jobs" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "type" "EmailJobType" NOT NULL,
    "status" "EmailJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMPTZ(6),
    "sent_at" TIMESTAMPTZ(6),
    "last_error" VARCHAR(120),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_email_key" ON "accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_pending_email_key" ON "accounts"("pending_email");

-- CreateIndex
CREATE UNIQUE INDEX "account_sessions_token_hash_key" ON "account_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "account_sessions_account_id_expires_at_idx" ON "account_sessions"("account_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "account_tokens_token_hash_key" ON "account_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "account_tokens_account_id_purpose_expires_at_idx" ON "account_tokens"("account_id", "purpose", "expires_at");

-- CreateIndex
CREATE INDEX "email_jobs_status_next_attempt_at_created_at_idx" ON "email_jobs"("status", "next_attempt_at", "created_at");

-- AddForeignKey
ALTER TABLE "account_sessions" ADD CONSTRAINT "account_sessions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_tokens" ADD CONSTRAINT "account_tokens_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_jobs" ADD CONSTRAINT "email_jobs_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
