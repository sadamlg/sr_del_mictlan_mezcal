import { EMAIL_COLORS, emailBrandImageUrl, escapeHtml, renderBrandedEmail } from './email-layout.js';

function linkFor(baseUrl, path, token) {
  const url = new URL(path, baseUrl);
  url.searchParams.set('token', token);
  return url.toString();
}

export function createAccountEmail({ type, account, token, appBaseUrl }) {
  const name = account.firstName;
  const safeName = escapeHtml(name);
  let subject;
  let heading;
  let introduction;
  let action;
  let path;
  let expiry;
  let securityNote;

  if (type === 'ACCOUNT_CONFIRMATION') {
    subject = 'Activa tu cuenta | Señor del Mictlán';
    heading = 'Activa tu cuenta';
    introduction = 'Recibimos tu solicitud para crear una cuenta. Confirma que tienes acceso a esta dirección para activarla.';
    action = 'Activar mi cuenta';
    path = '/cuenta/confirmar-correo';
    expiry = 'Este enlace vence en 24 horas y solo puede usarse una vez.';
    securityNote = 'Después de confirmar, volverás a la tienda con tu sesión iniciada.';
  } else if (type === 'EMAIL_CHANGE_CONFIRMATION') {
    subject = 'Confirma tu nuevo correo | Señor del Mictlán';
    heading = 'Confirma el cambio de correo';
    introduction = 'Recibimos una solicitud para cambiar el correo de tu cuenta. Confirma el cambio de correo a '
      + String(account.pendingEmail)
      + '. Confirma que tienes acceso a esta dirección. Tu correo actual seguirá activo hasta entonces.';
    action = 'Confirmar nuevo correo';
    path = '/cuenta/confirmar-correo';
    expiry = 'Este enlace vence en 24 horas y solo puede usarse una vez.';
    securityNote = 'Si no solicitaste este cambio, ignora el mensaje. Tu correo actual seguirá asociado a tu cuenta.';
  } else if (type === 'PASSWORD_RESET') {
    subject = 'Restablece tu contraseña | Señor del Mictlán';
    heading = 'Restablece tu contraseña';
    introduction = 'Recibimos una solicitud para cambiar la contraseña de tu cuenta.';
    action = 'Elegir nueva contraseña';
    path = '/cuenta/restablecer-contrasena';
    expiry = 'Este enlace vence en 30 minutos y solo puede usarse una vez.';
    securityNote = 'Si no solicitaste este cambio, ignora el mensaje. Tu contraseña actual seguirá activa.';
  } else {
    throw new TypeError('Tipo de correo de cuenta desconocido.');
  }

  const link = linkFor(appBaseUrl, path, token);
  const text = [
    'Hola ' + name + ',',
    '',
    introduction,
    '',
    action + ': ' + link,
    '',
    expiry,
    securityNote,
    '',
    'Señor del Mictlán · Etúcuaro, Michoacán',
  ].join('\n');

  const html = renderBrandedEmail(`
                <h1 style="margin:0 0 24px;color:${EMAIL_COLORS.ivory};font-family:Georgia,'Times New Roman',serif;font-size:25px;font-weight:400;letter-spacing:0.01em;line-height:1.4">${escapeHtml(heading)}</h1>
                <p style="margin:0 0 16px;color:${EMAIL_COLORS.ivory};font-size:16px;line-height:1.65">Hola ${safeName},</p>
                <p style="margin:0;color:${EMAIL_COLORS.sageMuted};font-size:15px;line-height:1.75">${escapeHtml(introduction)}</p>
                <p style="margin:28px 0">
                  <a href="${escapeHtml(link)}" style="display:inline-block;border:1px solid ${EMAIL_COLORS.teal};background-color:${EMAIL_COLORS.tealDeep};padding:13px 20px;color:${EMAIL_COLORS.bone};font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:600;letter-spacing:1.5px;line-height:1.4;text-decoration:none;text-transform:uppercase">${escapeHtml(action)}</a>
                </p>
                <p style="margin:0 0 12px;color:${EMAIL_COLORS.sageMuted};font-size:13px;line-height:1.65">${escapeHtml(expiry)}</p>
                <p style="margin:0;color:${EMAIL_COLORS.sageMuted};font-size:13px;line-height:1.65">${escapeHtml(securityNote)}</p>`, {
    brandImageUrl: emailBrandImageUrl(appBaseUrl),
  });

  return { subject, text, html };
}
