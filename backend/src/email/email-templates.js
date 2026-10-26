function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function linkFor(baseUrl, path, token) {
  const url = new URL(path, baseUrl);
  url.searchParams.set('token', token);
  return url.toString();
}

export function createAccountEmail({ type, account, token, appBaseUrl }) {
  const name = account.firstName;
  const safeName = escapeHtml(name);
  let subject;
  let text;
  let introduction;
  let action;
  let path;

  if (type === 'ACCOUNT_CONFIRMATION') {
    subject = 'Confirma tu cuenta de Señor del Mictlán';
    introduction = 'Gracias por crear tu cuenta. Confirma tu correo para dejarlo verificado.';
    action = 'Confirmar mi correo';
    path = '/cuenta/confirmar-correo';
  } else if (type === 'EMAIL_CHANGE_CONFIRMATION') {
    subject = 'Confirma el cambio de correo';
    introduction = `Recibimos una solicitud para cambiar tu correo a ${account.pendingEmail}. Confirma el cambio de correo desde este enlace. Tu correo actual seguirá activo hasta que lo confirmes.`;
    action = 'Confirmar cambio de correo';
    path = '/cuenta/confirmar-correo';
  } else if (type === 'PASSWORD_RESET') {
    subject = 'Restablece tu contraseña de Señor del Mictlán';
    introduction = 'Recibimos una solicitud para restablecer la contraseña de tu cuenta.';
    action = 'Elegir una nueva contraseña';
    path = '/cuenta/restablecer-contrasena';
  } else {
    throw new TypeError('Tipo de correo de cuenta desconocido.');
  }

  const link = linkFor(appBaseUrl, path, token);
  if (type === 'EMAIL_CHANGE_CONFIRMATION') {
    text = `Hola ${name},\n\n${introduction}\n\nAbre este enlace para confirmar: ${link}\n\nSi no solicitaste este cambio, ignora este mensaje.`;
  } else {
    text = `Hola ${name},\n\n${introduction}\n\nAbre este enlace: ${link}\n\nSi no solicitaste esta acción, ignora este mensaje.`;
  }
  const html = `<div style="background:#100e0b;color:#f1e7d6;font-family:Arial,sans-serif;padding:32px"><div style="margin:0 auto;max-width:560px"><p style="color:#e9bd82;font-size:13px;letter-spacing:2px;text-transform:uppercase">Señor del Mictlán</p><h1 style="font-family:Georgia,serif;font-size:26px;font-weight:400">${escapeHtml(subject)}</h1><p>Hola ${safeName},</p><p>${escapeHtml(introduction)}</p><p style="margin:32px 0"><a href="${escapeHtml(link)}" style="background:#e9bd82;border-radius:3px;color:#100e0b;display:inline-block;padding:13px 18px;text-decoration:none">${escapeHtml(action)}</a></p><p style="color:#bfc9c3;font-size:13px">Si no solicitaste esta acción, puedes ignorar este mensaje.</p></div></div>`;

  return { subject, text, html };
}
