const MAX_EMAIL_ATTEMPTS = 5;
const STALE_JOB_MS = 2 * 60 * 1000;

function isUsableToken(token, purpose, now) {
  return Boolean(
    token &&
    token.purpose === purpose &&
    token.consumedAt === null &&
    token.expiresAt.getTime() > now.getTime(),
  );
}

export function createAccountRepository(database) {
  return {
    async createAccount({ account, passwordHash, emailJobType }) {
      return database.$transaction(async (transaction) => {
        const created = await transaction.account.create({ data: { ...account, passwordHash } });
        await transaction.emailJob.create({ data: { accountId: created.id, type: emailJobType } });
        return created;
      });
    },

    findAccountByEmail(email) {
      return database.account.findUnique({ where: { email } });
    },

    findAccountByEmailForUpdate(email) {
      return database.account.findFirst({ where: { OR: [{ email }, { pendingEmail: email }] } });
    },

    findAccountById(id) {
      return database.account.findUnique({ where: { id } });
    },

    createSession({ accountId, tokenHash, expiresAt }) {
      return database.accountSession.create({
        data: { accountId, tokenHash, expiresAt },
      });
    },

    findSessionByTokenHash(tokenHash, now) {
      return database.accountSession.findFirst({
        where: { tokenHash, revokedAt: null, expiresAt: { gt: now } },
        include: { account: true },
      });
    },

    async revokeSession(tokenHash, now) {
      await database.accountSession.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: now },
      });
    },

    async enqueuePasswordReset(email) {
      const account = await database.account.findUnique({ where: { email }, select: { id: true } });
      if (!account) return;
      await database.emailJob.create({ data: { accountId: account.id, type: 'PASSWORD_RESET' } });
    },

    resetPassword({ tokenHash, passwordHash, now }) {
      return database.$transaction(async (transaction) => {
        const token = await transaction.accountToken.findUnique({
          where: { tokenHash },
          select: { id: true, accountId: true, purpose: true, consumedAt: true, expiresAt: true },
        });
        if (!isUsableToken(token, 'PASSWORD_RESET', now)) return false;

        const claim = await transaction.accountToken.updateMany({
          where: { id: token.id, consumedAt: null, expiresAt: { gt: now } },
          data: { consumedAt: now },
        });
        if (claim.count !== 1) return false;

        await transaction.account.update({ where: { id: token.accountId }, data: { passwordHash } });
        await transaction.accountToken.updateMany({
          where: {
            accountId: token.accountId,
            purpose: 'PASSWORD_RESET',
            consumedAt: null,
          },
          data: { consumedAt: now },
        });
        await transaction.accountSession.updateMany({
          where: { accountId: token.accountId, revokedAt: null },
          data: { revokedAt: now },
        });
        return true;
      });
    },

    changePassword({ accountId, passwordHash, tokenHash, expiresAt, now }) {
      return database.$transaction(async (transaction) => {
        await transaction.account.update({ where: { id: accountId }, data: { passwordHash } });
        await transaction.accountToken.updateMany({
          where: { accountId, purpose: 'PASSWORD_RESET', consumedAt: null },
          data: { consumedAt: now },
        });
        await transaction.accountSession.updateMany({
          where: { accountId, revokedAt: null },
          data: { revokedAt: now },
        });
        await transaction.accountSession.create({ data: { accountId, tokenHash, expiresAt } });
      });
    },

    confirmEmail(tokenHash, now) {
      return database.$transaction(async (transaction) => {
        const token = await transaction.accountToken.findUnique({
          where: { tokenHash },
          include: { account: true },
        });
        if (!token || token.purpose === 'PASSWORD_RESET' || token.consumedAt || token.expiresAt <= now) return false;
        if (token.purpose === 'EMAIL_CHANGE' && !token.account.pendingEmail) return false;

        const claim = await transaction.accountToken.updateMany({
          where: { id: token.id, consumedAt: null, expiresAt: { gt: now } },
          data: { consumedAt: now },
        });
        if (claim.count !== 1) return false;

        if (token.purpose === 'EMAIL_CHANGE') {
          await transaction.account.update({
            where: { id: token.accountId },
            data: {
              email: token.account.pendingEmail,
              pendingEmail: null,
              emailVerifiedAt: now,
            },
          });
        } else {
          await transaction.account.update({
            where: { id: token.accountId },
            data: { emailVerifiedAt: now },
          });
          await transaction.accountSession.updateMany({
            where: { accountId: token.accountId, revokedAt: null },
            data: { revokedAt: now },
          });
        }
        return { purpose: token.purpose, accountId: token.accountId };
      });
    },

    async updateProfile({ accountId, updates, pendingEmail, emailJobType }) {
      return database.$transaction(async (transaction) => {
        const data = { ...updates };
        if (pendingEmail !== undefined) data.pendingEmail = pendingEmail;
        const updated = await transaction.account.update({ where: { id: accountId }, data });
        if (emailJobType) {
          await transaction.emailJob.create({ data: { accountId, type: emailJobType } });
        }
        return updated;
      });
    },

    getEmailJob(id) {
      return database.emailJob.findUnique({ where: { id }, include: { account: true } });
    },

    issueEmailToken({ accountId, purpose, tokenHash, expiresAt, now }) {
      return database.$transaction(async (transaction) => {
        const account = await transaction.account.findUnique({ where: { id: accountId } });
        if (!account) return null;
        if (purpose === 'ACCOUNT_CONFIRMATION' && account.emailVerifiedAt) return { account, alreadyDone: true };
        if (purpose === 'EMAIL_CHANGE' && !account.pendingEmail) return null;

        await transaction.accountToken.updateMany({
          where: { accountId, purpose, consumedAt: null },
          data: { consumedAt: now },
        });
        await transaction.accountToken.create({
          data: { accountId, purpose, tokenHash, expiresAt },
        });
        return { account, alreadyDone: false };
      });
    },

    async claimNextEmailJob(now) {
      const staleBefore = new Date(now.getTime() - STALE_JOB_MS);
      return database.$transaction(async (transaction) => {
        await transaction.emailJob.updateMany({
          where: { status: 'PROCESSING', attempts: { gte: MAX_EMAIL_ATTEMPTS }, lockedAt: { lt: staleBefore } },
          data: { status: 'FAILED', lockedAt: null, lastError: 'RETRY_LIMIT' },
        });

        const rows = await transaction.$queryRaw`
          WITH candidate AS (
            SELECT "id"
            FROM "email_jobs"
            WHERE (
              "status" IN ('PENDING'::"EmailJobStatus", 'RETRY'::"EmailJobStatus")
              AND "next_attempt_at" <= ${now}
              AND "attempts" < ${MAX_EMAIL_ATTEMPTS}
            ) OR (
              "status" = 'PROCESSING'::"EmailJobStatus"
              AND "locked_at" < ${staleBefore}
              AND "attempts" < ${MAX_EMAIL_ATTEMPTS}
            )
            ORDER BY "created_at"
            LIMIT 1
            FOR UPDATE SKIP LOCKED
          )
          UPDATE "email_jobs" AS job
          SET "status" = 'PROCESSING'::"EmailJobStatus",
              "attempts" = job."attempts" + 1,
              "locked_at" = ${now}
          FROM candidate
          WHERE job."id" = candidate."id"
          RETURNING job."id", job."account_id" AS "accountId", job."type", job."attempts"
        `;
        return rows[0] ?? null;
      });
    },

    markEmailJobSent(id, now) {
      return database.emailJob.update({
        where: { id },
        data: { status: 'SENT', sentAt: now, lockedAt: null, lastError: null },
      });
    },

    markEmailJobFailed({ id, attempts, errorCode, now }) {
      const retry = attempts < MAX_EMAIL_ATTEMPTS;
      const delayMs = Math.min(2 ** attempts * 1000, 5 * 60 * 1000);
      return database.emailJob.update({
        where: { id },
        data: {
          status: retry ? 'RETRY' : 'FAILED',
          nextAttemptAt: new Date(now.getTime() + delayMs),
          lockedAt: null,
          lastError: retry ? String(errorCode).slice(0, 120) : 'RETRY_LIMIT',
        },
      });
    },
  };
}
