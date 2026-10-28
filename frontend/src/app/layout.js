import '@fontsource/cinzel-decorative/400.css';
import '@fontsource/cinzel-decorative/700.css';
import '@fontsource-variable/open-sans/wght.css';
import '@fontsource-variable/montserrat/wght.css';
import './globals.css';
import CartDrawer from '../components/cart/cart-drawer';
import { CartProvider } from '../components/cart/cart-provider';

export const metadata = {
  title: 'Señor del Mictlán | Destilados para compartir',
  description: 'Un espacio para descubrir la colección de Señor del Mictlán.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full font-sans">
        <CartProvider>
          {children}
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
