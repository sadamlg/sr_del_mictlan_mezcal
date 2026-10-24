import '@fontsource/cinzel-decorative/400.css';
import '@fontsource/cinzel-decorative/700.css';
import '@fontsource-variable/open-sans/wght.css';
import '@fontsource-variable/montserrat/wght.css';
import './globals.css';

export const metadata = {
  title: 'Señor del Mictlán | Destilados para compartir',
  description: 'Un espacio para descubrir la colección de Señor del Mictlán.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
