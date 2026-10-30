# Dominio y DNS: Neubox y cPanel

Esta guía explica dónde crear los registros que piden Resend, Railway o Cloudflare. El dominio de este proyecto es `srmictlan.com`; cada lector debe sustituirlo por el suyo. El registrador y el editor DNS pueden ser pantallas distintas.

## Identificar quién administra la zona

1. Consulta los *nameservers* actuales del dominio en Neubox o con `dig NS srmictlan.com +short`. Esos servidores indican dónde está la zona DNS autoritativa.
2. Si la zona está en el hosting Neubox, abre **cPanel → Zone Editor → Manage** para `srmictlan.com`. Ahí se crean y editan registros A, CNAME, TXT y MX. [Zone Editor de cPanel](https://docs.cpanel.net/cpanel/domains/zone-editor/96/).
3. Antes de cambiar algo, guarda un inventario de los registros existentes de web y correo: A/AAAA, CNAME, MX, TXT de SPF/DKIM/DMARC y cualquier verificación externa. Conserva sus valores hasta saber qué servicio usa cada uno.

La pantalla **Nameservers** del registrador cambia la delegación de toda la zona. **Servidores DNS privados / Registrar NameServer** crea *child nameservers* para operar servidores DNS propios; no sirve para añadir los TXT, CNAME o MX de Resend. Si cPanel no muestra la zona o sus registros no aparecen en DNS público, vuelve al paso 1 antes de editar.

## Añadir registros de Resend

Primero crea el dominio o subdominio de envío en Resend como explica la [guía de correo](resend.md). Resend mostrará los registros necesarios para ese dominio. En **Zone Editor → Manage → Add Record**:

1. Copia el tipo, nombre/host, valor y prioridad exactamente como los muestra Resend. Si cPanel completa automáticamente `.srmictlan.com`, comprueba la vista final antes de guardar para no duplicar el sufijo.
2. Añade registros nuevos sin reemplazar el MX que recibe el correo del dominio principal ni borrar SPF/DKIM de otros servicios. Un MX que Resend solicita para su subdominio de retorno no equivale al MX de tu buzón existente.
3. Guarda, revisa cada nombre final en la tabla y vuelve a Resend para verificar. La propagación puede tardar; consulta el estado de cada registro en Resend y, si hace falta, verifica la respuesta DNS pública con `dig`.
4. Guarda en documentación sólo el nombre del dominio de envío y los tipos de registros; las claves API y secretos no pertenecen al repositorio.

El proyecto usa `mail.srmictlan.com` como subdominio de envío. Los valores DNS concretos deben tomarse de la cuenta de Resend que se esté configurando, porque cambian por dominio y cuenta. [Dominios verificados de Resend](https://resend.com/docs/dashboard/domains/introduction).

## Conectar Railway o migrar DNS después

Para un dominio personalizado de Railway, crea únicamente los registros de verificación y destino que Railway entregue para ese servicio y entorno. Valida HTTPS antes de reemplazar URLs de la aplicación. El despliegue inicial puede usar dominios públicos de Railway sin mover la delegación del dominio. Consulta [Railway](railway.md).

Si más adelante decides administrar DNS en Cloudflare, copia primero todos los registros vigentes a la nueva zona, incluidos los de web, correo, Resend y verificaciones. Sólo entonces cambia los *nameservers* en Neubox y comprueba web, recepción de correo y envío desde Resend. Un cambio de *nameservers* afecta toda la zona, no sólo un subdominio. La URL de desarrollo `r2.dev` no requiere cambiar los *nameservers*; un hostname propio de medios de producción se prepara como explica [Medios](media.md).

Al conectar dominios propios de frontend y API, comprueba HTTPS y el certificado del origen antes de activar el proxy o un modo TLS estricto. Evalúa WAF y Bot Fight Mode después: publicar registros DNS no activa automáticamente esos controles. Contrasta la configuración vigente con las guías de [Railway para dominios](https://docs.railway.com/networking/domains/working-with-domains) y [Cloudflare Full (Strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/).

## Errores reconocibles

| Síntoma | Causa probable |
|---|---|
| “Child Nameserver … no es un hostname válido” | Se está usando el registro de servidores DNS privados en vez del Zone Editor. |
| Resend no encuentra un registro guardado | Se editó una zona que no es autoritativa, el nombre final tiene el dominio duplicado o aún no terminó la propagación. |
| Deja de llegar correo al buzón existente | Se reemplazó un MX o registro de autenticación que pertenecía al servicio anterior; restaura el inventario guardado. |
