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
  mictlan-green: "#047857"
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
  hero-action:
    backgroundColor: "{colors.mictlan-green}"
    textColor: "{colors.mictlan-bone}"
    padding: "15.6px 41.6px"
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

# Design System: Señor del Mictlán

## Overview

**Creative North Star: "Ritual artesanal en penumbra"**

La tienda presenta destilados de agave con un lenguaje editorial, oscuro y sobrio. La fotografía del producto y los titulares de alto contraste llevan el peso visual; los acentos de color orientan la navegación y comunican estados sin competir con las imágenes.

La tipografía display aporta carácter ceremonial, mientras la sans serif mantiene legibles la información y las acciones. El color verde agua identifica la interacción; el dorado queda ligado a la lectura del producto; el rojo y el burdeos se reservan para error, rechazo y detalles de la marca.

**Key Characteristics:**

- Fondos oscuros en capas y fotografía de producto como protagonista.
- Verde agua y teal para acciones, enlaces, foco y énfasis interactivo.
- Dorado únicamente como acento cálido de producto.
- Formas sobrias, con geometría distintiva sólo en el age-gate y el CTA del hero.

## Colors

La paleta se organiza por función: teal para interacción, neutrales cálidos para lectura, dorado para detalles del destilado y tonos rojizos para estados destructivos.

### Primary

- **Verde agua (`mictlan-teal`):** acento de iconos, enlaces, foco visible y bordes activos.
- **Teal profundo (`mictlan-teal-deep`):** fondo de las acciones principales del age-gate y de cuenta.
- **Teal de interacción (`mictlan-teal-hover`):** hover de las acciones principales. `mictlan-teal-bright` destaca títulos y estados activos de FAQ y escaparate.
- **Verde de escena (`mictlan-green`):** fondo del CTA del hero y subrayado hover del navbar. El CTA del hero mantiene ese mismo verde al 90% de opacidad en hover.
- **Menta (`mictlan-mint`):** texto de navegación en hover.

### Secondary

- **Dorado (`mictlan-gold`):** precio, selectores y detalles del producto. No es el color por defecto de las acciones de cuenta ni de los indicadores de foco.
- **Petróleo (`mictlan-petrol`):** bordes decorativos de hero, ritual y CTA del pie de página.

### Tertiary

- **Rojo y burdeos (`mictlan-red`, `mictlan-burgundy`):** rechazo del age-gate, errores, barra de desplazamiento y detalles rojizos existentes.
- **Rojo de interacción (`mictlan-red-hover`):** hover de la opción de rechazo.
- **Burdeos profundo (`mictlan-burgundy-deep`):** corazón decorativo del pie de página.
- **Texto de error (`mictlan-error-text`, `mictlan-error-text-muted`):** mensajes y avisos de error.

### Neutral

| Token | Uso |
|---|---|
| `mictlan-background` | Fondo general del sitio, cuerpo de página y superficies de cuenta. |
| `mictlan-night` | Fondos y transiciones oscuras de las secciones de landing. |
| `mictlan-night-green` | Extremos de gradientes de FAQ y Ritual. |
| `mictlan-dark-forest` | Superficie de las tarjetas de Ritual y fondos de FAQ. |
| `mictlan-red-black` | Gradientes del pie de página y contador de visitas. |
| `mictlan-blood-shadow` | Sombras rojizas del age-gate, fondo de cuenta y pie de página. |
| `mictlan-carbon` | Menú móvil, encabezado, opciones de cuenta y superficie translúcida de campos. |
| `mictlan-ink` | Oscuros profundos del age-gate; fondo de capas sobre producto y texto de selección sobre aqua. |
| `mictlan-brown-ink` | Texto oscuro sobre acentos dorados del escaparate. |
| `mictlan-ivory` | Texto de lectura y títulos de cuenta. |
| `mictlan-cream` | Texto de paneles y detalles del producto. |
| `mictlan-bone` | Texto de alto contraste en age-gate, navegación y landing. |
| `mictlan-sage` | Párrafos de apoyo de landing y navegación móvil. |
| `mictlan-sage-muted` | Descripciones, texto secundario y metadatos de cuenta. |
| `mictlan-muted` | Copia secundaria de pie de página, Ritual y FAQ. |
| `mictlan-sand` | Etiquetas de campos y texto de navegación. |
| `mictlan-earth` | Divisores y detalles discretos. |
| `mictlan-earth-muted` | Texto pequeño secundario y estado cerrado del icono de menú móvil. |

**The One Palette Rule.** Usa primero un token existente y ajusta su opacidad según el contexto; añade un color nuevo sólo cuando cumpla un rol visual distinto que la paleta no cubra.

### Excepciones visuales locales

Estos tonos siguen siendo parte de composiciones puntuales, no colores para reutilizar en controles nuevos:

| Color local | Uso que se conserva |
|---|---|
| `#111a14` | Inicio del gradiente de FAQ. |
| `#14201a` | Luz ambiental de la sección Ritual. |
| `#1a1c1b` | Superficie hover de las tarjetas de Ritual. |
| `#cda575`, `#14120f` | Borde y fondo del panel específico de detalles del destilado. |
| `rgba(20,8,10,0.54)`, `rgba(20,8,10,0.30)`, `rgba(20,8,10,0.96)` | Pasos casi negros de los velos radiales del age-gate y pie de página. |
| `#240b10`, `#14090b`, `#16090d` | Pista y controles de la barra de desplazamiento. |

Los gradientes del age-gate y del pie de página combinan sombras rojizas y casi negras para integrarse con su composición. Las capas negras o blancas con opacidad sobre fotografía son recursos de contraste, no acentos. Conserva esos tratamientos donde ya existen; no los copies como colores de marca para otros componentes.

## Typography

**Display Font:** Cinzel Decorative con Georgia y serifas del sistema como respaldo.

**Body Font:** Open Sans Variable con Open Sans y Arial como respaldo.

**Label Font:** Montserrat Variable con Montserrat como respaldo.

**Character:** La serif display da presencia a títulos de marca y producto. Open Sans prioriza la lectura de párrafos y formularios; Montserrat distingue navegación, etiquetas y acciones breves.

### Hierarchy

- **Display:** titulares de marca y de secciones, con escala adaptable al espacio disponible.
- **Headline:** títulos de página y producto en la serif display.
- **Body:** descripciones, avisos y contenido de cuenta en Open Sans.
- **Label:** nombres de campos, precios y controles en Montserrat; las etiquetas breves suelen ir en mayúsculas con tracking amplio.

**The Role Separation Rule.** Reserva la serif decorativa para títulos; no la uses para párrafos, mensajes de estado ni instrucciones largas.

## Layout

La landing alterna escenas de ancho amplio con secciones de lectura contenidas. El hero aprovecha la fotografía en pantalla completa en escritorio y reorganiza el contenido sobre la imagen en móvil. Las superficies de cuenta mantienen un ancho de lectura limitado y se apilan en pantallas estrechas.

Los breakpoints son los de Tailwind CSS 4 más ajustes puntuales que responden a la composición existente. Mantén el contenido centrado y adapta la escala tipográfica y los espacios fluidamente; no conviertas esos ajustes de una sección en una nueva escala global.

## Elevation & Depth

La profundidad se construye principalmente con capas tonales, gradientes y velos sobre fotografía. Las sombras más pronunciadas pertenecen al diálogo de edad y a elementos superpuestos; las tarjetas de contenido usan bordes discretos y superficies próximas al fondo.

**The Scene-Specific Layer Rule.** Conserva la posición y el carácter de los velos y gradientes existentes: son parte de la iluminación de cada escena, no un efecto genérico para tarjetas.

## Shapes

Los campos y controles de cuenta tienen esquinas discretas y bordes finos; las tarjetas son mayormente rectangulares. El CTA del hero conserva su recorte angular. Las etiquetas tipo chip usan píldora y el age-gate mantiene su diálogo circular como pieza distintiva.

## Components

### Buttons

- **Acciones principales de cuenta y age-gate:** teal profundo con texto hueso, borde teal sutil y hover teal. El foco visible conserva un contorno teal.
- **CTA del hero:** verde de escena con texto hueso y corte diagonal; en hover mantiene el verde al 90% de opacidad.
- **Acciones destructivas o de rechazo:** borde y hover en rojo/burdeos; conserva texto que nombre la acción.
- **Acciones de producto:** el dorado puede aparecer en selectores y datos del destilado; el foco visible usa teal. El dorado no es el estilo predeterminado de CTA de cuenta.

### Cards / Containers

- **Cuenta:** superficie basada en el fondo general, borde teal tenue, sombra oscura contenida y padding adaptable.
- **Ritual y FAQ:** fondos y bordes pertenecen a la escena; conserva las excepciones locales enumeradas arriba.
- **Detalles del producto:** el panel dorado es una excepción localizada del escaparate.

### Inputs / Fields

Los campos usan una superficie carbón translúcida, texto marfil y una etiqueta arena. El foco cambia el borde y el indicador visible a teal. Los errores se distinguen con texto rojo, no sólo con color de borde.

### Navigation

El navbar usa texto arena y subrayado verde en hover, con texto menta. El menú móvil conserva fondo carbón y texto sage; los controles de cuenta usan teal para hover y bordes activos.

### Signature Component: Age Gate

El diálogo circular combina el emblema del sitio, sombras rojizas y controles contrastados. Su silueta, iluminación y tratamientos de fondo son específicos; no generalices su gradiente a tarjetas corrientes.

## Do's and Don'ts

### Do:

- **Do** consultar este contrato antes de cambiar color, contraste o estado visual.
- **Do** implementar los tokens de color aquí definidos en `frontend/src/app/globals.css` y exponerlos en `@theme inline` para Tailwind.
- **Do** reutilizar un token con opacidad cuando sólo se necesita una variante más tenue.
- **Do** actualizar este documento y `globals.css` en el mismo cambio cuando se incorpore un nuevo color semántico.
- **Do** revisar el resultado en navegador cuando cambie un color o una composición de capas.

### Don't:

- **Don't** usar colores de Tailwind como `text-slate-300`, `bg-blue-*` o `text-green-*` para elementos de marca o texto de interfaz.
- **Don't** usar dorado como color predeterminado de botones, enlaces o navegación de cuenta.
- **Don't** inventar un tono para imitar teal o verde; busca primero el token visualmente más cercano.
- **Don't** reutilizar en pantallas nuevas los tonos locales listados como excepciones de landing o producto.
- **Don't** homogeneizar los gradientes y velos de la landing si su color depende de la fotografía y la escena.
