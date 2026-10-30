export function createPurchaseEmailDelivery({
  nodeEnv,
  smtpTransport,
  resendTransport,
  mailFrom,
  resendFrom,
}) {
  const useLocalSmtp = nodeEnv === 'development';
  return {
    transport: useLocalSmtp ? smtpTransport : resendTransport,
    from: useLocalSmtp ? mailFrom : resendFrom || mailFrom,
  };
}
