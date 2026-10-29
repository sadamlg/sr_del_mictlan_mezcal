---
name: Señor del Mictlán
description: Sistema visual oscuro y editorial para descubrir destilados artesanales de agave.
colors:
  mictlan-background: "#100e0b"
  mictlan-night: "#0a0b0a"
  mictlan-night-green: "#0a0c0b"
  mictlan-dark-forest: "#0d0f0e"
  mictlan-red-black: "#0f0b0c"
  mictlan-blood-shadow: "#4d0f16"
  mictlan-carbon: "#050505"
  mictlan-ink: "#060707"
  mictlan-brown-ink: "#17120b"
  mictlan-ivory: "#f1e7d6"
  mictlan-cream: "#f4ede3"
  mictlan-bone: "#e2e3e0"
  mictlan-sage: "#c6d1ca"
  mictlan-sage-muted: "#bfc9c3"
  mictlan-muted: "#d0c5af"
  mictlan-sand: "#e0cdb8"
  mictlan-earth: "#4d4635"
  mictlan-earth-muted: "#99907c"
  mictlan-gold: "#e9bd82"
  mictlan-red: "#a84652"
  mictlan-burgundy: "#711d28"
  mictlan-red-hover: "#bd5965"
  mictlan-burgundy-deep: "#7d1f2a"
  mictlan-error-text: "#f0a0a2"
  mictlan-error-text-muted: "#f0b7b9"
  mictlan-teal: "#97d2c6"
  mictlan-teal-bright: "#2dd4bf"
  mictlan-teal-deep: "#0f5047"
  mictlan-teal-hover: "#15695d"
  mictlan-stripe-purple: "#5145e5"
  mictlan-stripe-purple-hover: "#4338ca"
  mictlan-mint: "#d1fae5"
  mictlan-petrol: "#0e7490"
typography:
  display:
    fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif"
  body:
    fontFamily: "Open Sans Variable, Open Sans, Arial, sans-serif"
  ui:
    fontFamily: "Montserrat Variable, Montserrat, sans-serif"
components:
  account-primary:
    backgroundColor: "{colors.mictlan-teal-deep}"
    textColor: "{colors.mictlan-bone}"
    padding: "12px 20px"
  account-primary-hover:
    backgroundColor: "{colors.mictlan-teal-hover}"
  checkout-stripe-primary:
    backgroundColor: "{colors.mictlan-stripe-purple}"
    textColor: "{colors.mictlan-bone}"
  checkout-stripe-primary-hover:
    backgroundColor: "{colors.mictlan-stripe-purple-hover}"
  hero-action:
    backgroundColor: "{colors.mictlan-teal-deep}"
    textColor: "{colors.mictlan-bone}"
    padding: "15.6px 41.6px"
  hero-action-hover:
    backgroundColor: "{colors.mictlan-teal-hover}"
  account-card:
    backgroundColor: "{colors.mictlan-background}"
    padding: "24px"
  account-field:
    textColor: "{colors.mictlan-ivory}"
    padding: "12px 14px"
  navbar-link:
    textColor: "{colors.mictlan-bone}"
  product-insight-active:
    backgroundColor: "{colors.mictlan-gold}"
    textColor: "{colors.mictlan-brown-ink}"
---

# Sistema visual: Señor del Mictlán

## Dirección visual

**Concepto rector: «Ritual artesanal en penumbra»**

La tienda presenta destilados de agave con un lenguaje editorial, oscuro y sobrio. La fotografía del producto y los titulares de alto contraste llevan el peso visual; los acentos de color orientan la navegación y comunican estados sin competir con las imágenes.

La tipografía de títulos aporta carácter ceremonial, mientras las sans serif mantienen legibles la información y las acciones. El verde agua identifica la interacción; el dorado acompaña la lectura del producto; el rojo y el burdeos se reservan para errores, rechazo y detalles de marca.

**Rasgos principales:**

- Fondos oscuros en capas y fotografía de producto como protagonista.
- Verde agua para acciones, enlaces, foco y énfasis interactivo.
- Morado Stripe para la acción de pago alojado en Stripe dentro del resumen de compra.
- Dorado únicamente como acento cálido de producto.
- Formas sobrias, con geometría distintiva sólo en el aviso de edad y la acción del hero.

## Color

La paleta se organiza por función: verde agua para interacción, neutrales cálidos para lectura, dorado para detalles del destilado y tonos rojizos para estados destructivos.

### Principales

- **Verde agua (`mictlan-teal`):** iconos, enlaces, foco visible, bordes activos y subrayado de 2 px en la barra de navegación.
- **Verde agua profundo (`mictlan-teal-deep`):** fondo de las acciones principales de cuenta, aviso de edad y hero.
- **Verde agua de interacción (`mictlan-teal-hover`):** estado hover de las acciones principales. `mictlan-teal-bright` destaca títulos y estados activos de FAQ y escaparate.
- **Morado Stripe (`mictlan-stripe-purple`):** fondo de la acción para abrir Stripe desde el resumen; el hover usa `mictlan-stripe-purple-hover`. Es una excepción local al verde agua de las acciones principales.
- **Menta (`mictlan-mint`):** texto de navegación al pasar el cursor.

### Secundarios

- **Dorado (`mictlan-gold`):** precio, selectores y detalles del producto. No es el color por defecto de las acciones de cuenta ni de los indicadores de foco.
- **Petróleo (`mictlan-petrol`):** bordes decorativos de hero, ritual y CTA del pie de página.

### Estados y acentos

- **Rojo y burdeos (`mictlan-red`, `mictlan-burgundy`):** rechazo del aviso de edad, errores, barra de desplazamiento y detalles rojizos existentes.
- **Rojo de interacción (`mictlan-red-hover`):** estado hover de la opción de rechazo.
- **Burdeos profundo (`mictlan-burgundy-deep`):** corazón decorativo del pie de página.
- **Texto de error (`mictlan-error-text`, `mictlan-error-text-muted`):** mensajes y avisos de error.

### Neutrales

| Token | Uso |
|---|---|
| `mictlan-background` | Fondo general del sitio, cuerpo de página y superficies de cuenta. |
| `mictlan-night` | Fondos y transiciones oscuras de las secciones de landing. |
| `mictlan-night-green` | Extremos de gradientes de FAQ y Ritual. |
| `mictlan-dark-forest` | Superficie de las tarjetas de Ritual y fondos de FAQ. |
| `mictlan-red-black` | Gradientes del pie de página y contador de visitas. |
| `mictlan-blood-shadow` | Sombras rojizas del aviso de edad, fondo de cuenta y pie de página. |
| `mictlan-carbon` | Menú móvil, encabezado, opciones de cuenta y superficie translúcida de campos. |
| `mictlan-ink` | Oscuros profundos del aviso de edad; fondo de capas sobre producto y texto de selección sobre aqua. |
| `mictlan-brown-ink` | Texto oscuro sobre acentos dorados del escaparate. |
| `mictlan-ivory` | Texto de lectura y títulos de cuenta. |
| `mictlan-cream` | Texto de paneles y detalles del producto. |
| `mictlan-bone` | Texto de alto contraste en el aviso de edad, navegación y landing. |
| `mictlan-sage` | Párrafos de apoyo de landing y navegación móvil. |
| `mictlan-sage-muted` | Descripciones, texto secundario y metadatos de cuenta. |
| `mictlan-muted` | Copia secundaria de pie de página, Ritual y FAQ. |
| `mictlan-sand` | Etiquetas de campos y texto de navegación. |
| `mictlan-earth` | Divisores y detalles discretos. |
| `mictlan-earth-muted` | Texto pequeño secundario y estado cerrado del icono de menú móvil. |

### Excepciones visuales locales

Estos tonos siguen siendo parte de composiciones puntuales, no colores para reutilizar en controles nuevos:

| Color local | Uso que se conserva |
|---|---|
| `#111a14` | Inicio del gradiente de FAQ. |
| `#14201a` | Luz ambiental de la sección Ritual. |
| `#1a1c1b` | Superficie hover de las tarjetas de Ritual. |
| `#cda575`, `#14120f` | Borde y fondo del panel específico de detalles del destilado. |
| `rgba(20,8,10,0.54)`, `rgba(20,8,10,0.30)`, `rgba(20,8,10,0.96)` | Pasos casi negros de los velos radiales del aviso de edad y pie de página. |
| `#240b10`, `#14090b`, `#16090d` | Pista y controles de la barra de desplazamiento. |

Los gradientes del aviso de edad y del pie combinan sombras rojizas y casi negras. Las capas negras o blancas con opacidad sobre fotografía sirven para dar contraste, no son acentos de color. Conserva esos tratamientos donde ya existen; no los copies como colores de marca para otros componentes.

## Tipografía

**Títulos:** Cinzel Decorative con Georgia y serifas del sistema como respaldo.

**Texto:** Open Sans Variable con Open Sans y Arial como respaldo.

**Interfaz:** Montserrat Variable con Montserrat como respaldo.

**Carácter:** Cinzel Decorative da presencia a títulos de marca y producto. Open Sans prioriza la lectura de párrafos y formularios; Montserrat distingue navegación, etiquetas y acciones breves.

### Jerarquía

- **Títulos de marca:** titulares y secciones en Cinzel Decorative, con escala adaptable al espacio.
- **Títulos de página y producto:** serif decorativa.
- **Texto:** descripciones, avisos y contenido de cuenta en Open Sans.
- **Etiquetas:** campos, precios y controles en Montserrat; las breves suelen ir en mayúsculas y con espaciado amplio entre letras.

## Composición

La landing alterna escenas de ancho amplio con secciones de lectura contenidas. El hero aprovecha la fotografía en pantalla completa en escritorio y reorganiza el contenido sobre la imagen en móvil. Las superficies de cuenta mantienen un ancho de lectura limitado y se apilan en pantallas estrechas.

Los puntos de quiebre son los de Tailwind CSS 4 más ajustes puntuales para la composición existente. Mantén el contenido centrado y adapta tipografía y espacios al ancho; no conviertas ajustes de una sección en una nueva escala global.

## Profundidad

La profundidad se construye principalmente con capas tonales, gradientes y velos sobre fotografía. Las sombras más pronunciadas pertenecen al diálogo de edad y a elementos superpuestos; las tarjetas de contenido usan bordes discretos y superficies próximas al fondo.

Conserva la posición y el carácter de los velos y gradientes existentes: forman parte de la iluminación de cada escena y no son un efecto genérico para tarjetas.

## Formas

Los campos y controles de cuenta tienen esquinas discretas y bordes finos; las tarjetas son mayormente rectangulares. La acción del hero conserva su recorte angular. Las etiquetas usan forma de píldora y el aviso de edad mantiene su diálogo circular como pieza distintiva.

## Componentes

### Botones

- **Acciones principales de cuenta, aviso de edad y hero:** verde agua profundo, texto hueso y hover verde agua. El foco conserva un contorno verde agua.
- **Acción de pago con Stripe en el resumen:** morado Stripe con texto hueso; el foco conserva el contorno verde agua.
- **Acción del hero:** conserva su corte diagonal y crece al 110% al pasar el cursor; comparte color y transición con las acciones principales.
- **Acciones destructivas o de rechazo:** borde y hover rojos o burdeos, con texto que identifique la acción.
- **Acciones de producto:** el dorado puede aparecer en selectores y datos del destilado; el foco usa verde agua. El dorado no es el estilo predeterminado de las acciones de cuenta.

### Tarjetas y superficies

- **Cuenta:** superficie basada en el fondo general, borde verde agua tenue, sombra oscura contenida y relleno adaptable.
- **Ritual y FAQ:** fondos y bordes pertenecen a la escena; conserva las excepciones locales enumeradas arriba.
- **Detalles del producto:** el panel dorado es una excepción localizada del escaparate.

### Campos

Los campos usan una superficie carbón translúcida, texto marfil y una etiqueta arena. El foco cambia el borde y el indicador visible a verde agua. Los errores se distinguen con texto rojo, no sólo con el borde.

### Navegación

La barra de navegación usa texto arena y un subrayado verde agua de 2 px al pasar el cursor, con texto menta. El cambio dura 150 ms y también aparece al enfocar con teclado. En el menú móvil, las opciones de navegación y cuenta mantienen texto salvia por defecto; al pasar el cursor o recibir foco cambian a verde agua (`mictlan-teal`), sin subrayado. El menú conserva su fondo carbón.

### Componente distintivo: aviso de edad

El aviso circular combina el emblema del sitio, sombras rojizas y controles contrastados. Su silueta, iluminación y fondo son específicos; no generalices su gradiente a tarjetas comunes.

## Aplicación

- Usa primero los tokens de esta guía; ajusta opacidad cuando sólo necesites atenuar un color. Añade un token semántico sólo si la paleta no cubre el rol.
- `frontend/src/app/globals.css` implementa los tokens y los expone a Tailwind. Actualiza ambos archivos en el mismo cambio si agregas un token.
- No uses colores cromáticos genéricos de Tailwind para sustituir los tonos de marca ni reutilices los colores locales de excepción fuera de su escena.
- Revisa en navegador cualquier cambio de color, contraste o composición de capas.
