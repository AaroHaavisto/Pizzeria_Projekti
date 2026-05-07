import {createContext, useContext, useMemo, useState} from 'react';

const CART_STORAGE_KEY = 'pizzeria_pro_cart';

const CartContext = createContext(null);

/**
 * Safely parses JSON string with fallback value.
 * @param {string} value - JSON string to parse
 * @param {*} fallback - Fallback value if parse fails
 * @returns {*} Parsed value or fallback
 */
function safeParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Retrieves initial cart items from localStorage.
 * @returns {Array} Array of cart items
 */
function getInitialCartItems() {
  if (typeof window === 'undefined') {
    return [];
  }

  const items = safeParse(window.localStorage.getItem(CART_STORAGE_KEY), []);
  
  // Validate cart items - if any item is missing required fields, reset cart
  if (Array.isArray(items)) {
    const isValid = items.every(item => 
      item && 
      typeof item.id !== 'undefined' && 
      Number.isFinite(Number(item.priceCents)) &&
      Number.isFinite(Number(item.quantity))
    );
    
    if (isValid) {
      return items;
    }
  }
  
  // Clear corrupted cart data
  window.localStorage.removeItem(CART_STORAGE_KEY);
  return [];
}

/**
 * Formats menu item for cart storage.
 * @param {Object} menuItem - Menu item object
 * @returns {Object} Formatted cart item with quantity
 */
function formatCartItem(menuItem) {
  return {
    id: menuItem.id,
    name: menuItem.name,
    description: menuItem.description,
    image: menuItem.image,
    price: menuItem.price,
    priceCents: Number.isFinite(Number(menuItem.priceCents)) ? Number(menuItem.priceCents) : 0,
    quantity: 1,
    zeroedAt: null,
  };
}

/**
 * Calculates total quantity and price from cart items.
 * @param {Array} items - Cart items array
 * @returns {Object} Object with total quantity and priceCents
 */
function sumCartTotals(items) {
  return items.reduce(
    (totals, item) => {
      if (item.quantity > 0) {
        totals.quantity += item.quantity;
        const itemPrice = Number.isFinite(Number(item.priceCents)) ? Number(item.priceCents) : 0;
        totals.priceCents += itemPrice * item.quantity;
      }
      return totals;
    },
    {quantity: 0, priceCents: 0}
  );
}

export function CartProvider({children}) {
  const [items, setItems] = useState(() => getInitialCartItems());

  function persist(nextItems) {
    setItems(nextItems);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextItems));
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
          const nextQuantity = Math.min(100, Math.max(0, existing.quantity) + 1);

          persist(
            items.map(item =>
              item.id === cartItem.id
                ? {
                    ...item,
                    quantity: nextQuantity,
                    zeroedAt: nextQuantity > 0 ? null : item.zeroedAt ?? Date.now(),
                  }
                : item
            )
          );
          return;
        }

        persist([...items, cartItem]);
      },
      updateQuantity(itemId, quantity) {
        const resolvedQuantity = Math.trunc(Number(quantity));

        if (!Number.isFinite(resolvedQuantity) || resolvedQuantity < 0) {
          persist(items.filter(item => item.id !== itemId));
          return;
        }

        const nextQuantity = Math.min(100, resolvedQuantity);

        persist(
          items.map(item =>
            item.id === itemId
              ? {
                  ...item,
                  quantity: nextQuantity,
                  zeroedAt: nextQuantity === 0 ? item.zeroedAt ?? Date.now() : null,
                }
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
