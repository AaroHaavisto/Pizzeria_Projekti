import {createContext, useContext, useMemo, useState} from 'react';
import {useLanguage} from './LanguageContext';

const CART_STORAGE_KEY = 'pizzeria_pro_cart';

const CartContext = createContext(null);
const MAX_CART_TOTAL = 100;

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
  const {language} = useLanguage();
  const [limitMessage, setLimitMessage] = useState('');

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

        const currentTotals = sumCartTotals(items);
        const remainingAllowed = Math.max(0, MAX_CART_TOTAL - currentTotals.quantity);

        if (existing) {
          if (remainingAllowed <= 0) {
            setLimitMessage(language === 'en' ? 'Maximum 100 pizzas in cart. To place a larger order, please contact us at 067 1234567.' : 'Sinulla on jo 100 pizzaa korissa! Jos haluat tehdä suuremman tilauksen, ota meihin yhteyttä ja soita 067 1234567.');
            return {ok: false, message: limitMessage};
          }

          const nextQuantity = existing.quantity + 1;
          const allowedQuantity = Math.min(nextQuantity, existing.quantity + remainingAllowed);

          const nextItems = items.map(item =>
            item.id === cartItem.id
              ? {
                  ...item,
                  quantity: allowedQuantity,
                  zeroedAt: allowedQuantity > 0 ? null : item.zeroedAt ?? Date.now(),
                }
              : item
          );

          persist(nextItems);

          if (allowedQuantity < nextQuantity) {
            setLimitMessage(language === 'en' ? 'Maximum 100 pizzas in cart. To place a larger order, please contact us at 067 1234567.' : 'Sinulla on jo 100 pizzaa korissa! Jos haluat tehdä suuremman tilauksen, ota meihin yhteyttä ja soita 067 1234567.');
            return {ok: false, message: limitMessage};
          }

          return {ok: true};
        }

        if (remainingAllowed <= 0) {
          setLimitMessage(language === 'en' ? 'Maximum 100 pizzas in cart. To place a larger order, please contact us at 067 1234567.' : 'Sinulla on jo 100 pizzaa korissa! Jos haluat tehdä suuremman tilauksen, ota meihin yhteyttä ja soita 067 1234567.');
          return {ok: false, message: limitMessage};
        }

        // For new item, only add one or the remaining allowed if it's 0
        const initialQuantity = Math.min(1, remainingAllowed);
        const newItem = {...cartItem, quantity: initialQuantity};
        persist([...items, newItem]);
        if (initialQuantity < 1) {
          setLimitMessage(language === 'en' ? 'Maximum 100 pizzas in cart' : 'Maksimi 100 pizzaa korissa');
          return {ok: false, message: limitMessage};
        }

        return {ok: true};
      },
      updateQuantity(itemId, quantity, options = {}) {
        const preserveOnZero = Boolean(options.preserveOnZero);
        const resolvedQuantity = Math.trunc(Number(quantity));

        if (!Number.isFinite(resolvedQuantity) || resolvedQuantity < 0) {
          persist(items.filter(item => item.id !== itemId));
          return {ok: true};
        }

        const currentTotals = sumCartTotals(items);
        const currentItem = items.find(i => i.id === itemId);
        const otherTotal = currentTotals.quantity - (currentItem ? currentItem.quantity : 0);
        const allowedForThis = Math.max(0, MAX_CART_TOTAL - otherTotal);

        const nextQuantity = Math.min(allowedForThis, resolvedQuantity);

        let nextItems = items.map(item =>
          item.id === itemId
            ? {
                ...item,
                quantity: nextQuantity,
                zeroedAt: nextQuantity === 0 ? item.zeroedAt ?? Date.now() : null,
              }
            : item
        );

        // If quantity is zero and caller didn't request preserving on-zero, remove the item entirely
        if (nextQuantity === 0 && !preserveOnZero) {
          nextItems = nextItems.filter(item => item.id !== itemId);
        }

        persist(nextItems);

        if (resolvedQuantity > allowedForThis) {
          setLimitMessage(language === 'en' ? 'Maximum 100 pizzas in cart. To place a larger order, please contact us at 067 1234567.' : 'Sinulla on jo 100 pizzaa korissa! Jos haluat tehdä suuremman tilauksen, ota meihin yhteyttä ja soita 067 1234567.');
          return {ok: false, message: limitMessage};
        }

        // Clear limit message if we're below the maximum now
        if (sumCartTotals(nextItems).quantity < MAX_CART_TOTAL && limitMessage) {
          setLimitMessage('');
        }

        return {ok: true};
      },

      removeFromCart(itemId) {
        persist(items.filter(item => item.id !== itemId));
        if (sumCartTotals(items).quantity < MAX_CART_TOTAL && limitMessage) {
          setLimitMessage('');
        }
      },
      clearCart() {
        persist([]);
      },
      cartLimitReached: limitMessage ? true : false,
      cartLimitMessage: limitMessage,
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
