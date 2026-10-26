import nodemailer from 'nodemailer';

export function createSmtpTransport(environment = process.env) {
  const port = Number(environment.SMTP_PORT || 1025);
  const options = {
    host: environment.SMTP_HOST || 'mailpit',
    port,
    secure: environment.SMTP_SECURE === 'true',
  };
  if (environment.SMTP_USER && environment.SMTP_PASSWORD) {
    options.auth = { user: environment.SMTP_USER, pass: environment.SMTP_PASSWORD };
  }
  return nodemailer.createTransport(options);
}
