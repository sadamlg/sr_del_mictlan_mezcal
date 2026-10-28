'use client';

import { useEffect } from 'react';
import { useCart } from './cart-provider.js';

export default function CartCatalogRegistry({ products }) {
  const { registerCatalog } = useCart();

  useEffect(() => {
    registerCatalog(products);
  }, [products, registerCatalog]);

  return null;
}
