import {createContext, useContext, useMemo, useState} from 'react';

const CART_STORAGE_KEY = 'pizzeria_pro_cart';

const CartContext = createContext(null);

function safeParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
}

function getInitialCartItems() {
  if (typeof window === 'undefined') {
    return [];
  }

  return safeParse(window.localStorage.getItem(CART_STORAGE_KEY), []);
}

function formatCartItem(menuItem) {
  return {
    id: menuItem.id,
    name: menuItem.name,
    description: menuItem.description,
    image: menuItem.image,
    price: menuItem.price,
    priceCents: menuItem.priceCents,
    quantity: 1,
  };
}

function sumCartTotals(items) {
  return items.reduce(
    (totals, item) => {
      if (item.quantity > 0) {
        totals.quantity += item.quantity;
        totals.priceCents += item.priceCents * item.quantity;
      }
      return totals;
    },
    {quantity: 0, priceCents: 0}
  );
}

function sortCartItems(items) {
  return items
    .map((item, index) => ({item, index}))
    .sort((left, right) => {
      const leftActive = left.item.quantity > 0 ? 0 : 1;
      const rightActive = right.item.quantity > 0 ? 0 : 1;

      if (leftActive !== rightActive) {
        return leftActive - rightActive;
      }

      return left.index - right.index;
    })
    .map(entry => entry.item);
}

export function CartProvider({children}) {
  const [items, setItems] = useState(() => getInitialCartItems());

  function persist(nextItems) {
    const orderedItems = sortCartItems(nextItems);
    setItems(orderedItems);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(orderedItems));
    }
  }

  const value = useMemo(() => {
    const totals = sumCartTotals(items);

    return {
      items,
      itemCount: totals.quantity,
      totalCents: totals.priceCents,
      addToCart(menuItem) {
        const cartItem = formatCartItem(menuItem);

        const existing = items.find(item => item.id === cartItem.id);

        if (existing) {
          persist(
            items.map(item =>
              item.id === cartItem.id
                ? {...item, quantity: Math.max(0, item.quantity) + 1}
                : item
            )
          );
          return;
        }

        persist([...items, cartItem]);
      },
      updateQuantity(itemId, quantity) {
        persist(
          items.map(item =>
            item.id === itemId
              ? {...item, quantity: Math.max(0, Math.trunc(quantity))}
              : item
          )
        );
      },
      removeFromCart(itemId) {
        persist(items.filter(item => item.id !== itemId));
      },
      clearCart() {
        persist([]);
      },
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }

  return context;
}
