import { createOpaqueToken, hashToken } from '../accounts/crypto.js';
import { createAccountEmail } from './email-templates.js';

const TOKEN_LIFETIME_MS = {
  ACCOUNT_CONFIRMATION: 24 * 60 * 60 * 1000,
  EMAIL_CHANGE_CONFIRMATION: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 30 * 60 * 1000,
};

const TOKEN_PURPOSE = {
  ACCOUNT_CONFIRMATION: 'ACCOUNT_CONFIRMATION',
  EMAIL_CHANGE_CONFIRMATION: 'EMAIL_CHANGE',
  PASSWORD_RESET: 'PASSWORD_RESET',
};

export function createEmailWorker({
  repository,
  transport,
  from,
  appBaseUrl,
  now = () => new Date(),
  tokenFactory = createOpaqueToken,
  hashTokenValue = hashToken,
  logger = console,
}) {
  return {
    async processNext() {
      const job = await repository.claimNextEmailJob(now());
      if (!job) return false;

      try {
        const emailJob = await repository.getEmailJob(job.id);
        if (!emailJob?.account) {
          await repository.markEmailJobSent(job.id, now());
          return true;
        }

        const token = tokenFactory();
        const timestamp = now();
        const issued = await repository.issueEmailToken({
          accountId: emailJob.accountId,
          purpose: TOKEN_PURPOSE[emailJob.type],
          tokenHash: hashTokenValue(token),
          expiresAt: new Date(timestamp.getTime() + TOKEN_LIFETIME_MS[emailJob.type]),
          now: timestamp,
        });
        if (!issued || issued.alreadyDone || (job.type === 'EMAIL_CHANGE_CONFIRMATION' && !issued.account.pendingEmail)) {
          await repository.markEmailJobSent(job.id, now());
          return true;
        }

        const account = issued.account;
        const message = createAccountEmail({ type: job.type, account, token, appBaseUrl });
        const recipient = job.type === 'EMAIL_CHANGE_CONFIRMATION' ? account.pendingEmail : account.email;
        if (!recipient) {
          await repository.markEmailJobSent(job.id, now());
          return true;
        }
        await transport.sendMail({ from, to: recipient, ...message });
        await repository.markEmailJobSent(job.id, now());
        return true;
      } catch (error) {
        const errorCode = typeof error?.code === 'string' ? error.code : error?.name || 'EMAIL_DELIVERY_FAILED';
        logger.error?.('[email-worker] delivery failed', { type: job.type, code: errorCode });
        try {
          await repository.markEmailJobFailed({ id: job.id, attempts: job.attempts, errorCode, now: now() });
        } catch (markError) {
          logger.error?.('[email-worker] failed to schedule retry', {
            type: job.type,
            code: typeof markError?.code === 'string' ? markError.code : markError?.name || 'DATABASE_ERROR',
          });
        }
        return false;
      }
    },
  };
}
