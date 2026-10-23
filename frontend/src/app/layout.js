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
