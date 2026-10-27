const EMAIL_COLORS = {
  background: '#100e0b',
  carbon: '#050505',
  ivory: '#f1e7d6',
  bone: '#e2e3e0',
  sageMuted: '#bfc9c3',
  earthMuted: '#99907c',
  teal: '#97d2c6',
  tealDeep: '#0f5047',
};

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

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <style>@import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&display=swap');</style>
  </head>
  <body style="margin:0;padding:0;background-color:${EMAIL_COLORS.background};color:${EMAIL_COLORS.ivory};font-family:'Open Sans',Arial,sans-serif">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:${EMAIL_COLORS.background}">
      <tr>
        <td align="center" style="padding:36px 16px">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="width:100%;max-width:560px;background-color:${EMAIL_COLORS.carbon};border:1px solid rgba(151,210,198,0.24)">
            <tr>
              <td style="padding:32px 28px">
                <p style="margin:0;color:${EMAIL_COLORS.bone};font-family:'Cinzel Decorative',Georgia,'Times New Roman',serif;font-size:17px;font-weight:400;letter-spacing:1.5px;line-height:1.5;text-transform:uppercase">Señor del Mictlán</p>
                <div style="width:40px;height:1px;margin:18px 0 24px;background-color:${EMAIL_COLORS.teal}"></div>
                <h1 style="margin:0 0 24px;color:${EMAIL_COLORS.ivory};font-family:'Cinzel Decorative',Georgia,'Times New Roman',serif;font-size:25px;font-weight:400;letter-spacing:0.01em;line-height:1.4">${escapeHtml(heading)}</h1>
                <p style="margin:0 0 16px;color:${EMAIL_COLORS.ivory};font-size:16px;line-height:1.65">Hola ${safeName},</p>
                <p style="margin:0;color:${EMAIL_COLORS.sageMuted};font-size:15px;line-height:1.75">${escapeHtml(introduction)}</p>
                <p style="margin:28px 0">
                  <a href="${escapeHtml(link)}" style="display:inline-block;border:1px solid ${EMAIL_COLORS.teal};background-color:${EMAIL_COLORS.tealDeep};padding:13px 20px;color:${EMAIL_COLORS.bone};font-family:'Montserrat',Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:1.5px;line-height:1.4;text-decoration:none;text-transform:uppercase">${escapeHtml(action)}</a>
                </p>
                <p style="margin:0 0 12px;color:${EMAIL_COLORS.sageMuted};font-size:13px;line-height:1.65">${escapeHtml(expiry)}</p>
                <p style="margin:0;color:${EMAIL_COLORS.sageMuted};font-size:13px;line-height:1.65">${escapeHtml(securityNote)}</p>
                <p style="margin:28px 0 0;border-top:1px solid rgba(224,205,184,0.16);padding-top:18px;color:${EMAIL_COLORS.earthMuted};font-size:11px;letter-spacing:1.2px;line-height:1.6;text-transform:uppercase">Señor del Mictlán · Etúcuaro, Michoacán</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}
