const API_BASE = import.meta.env.VITE_API_BASE || '';

export async function submitOrder({customerId, totalCents, items}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Order must include at least one item');
  }

  const response = await fetch(`${API_BASE}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerId: customerId || null,
      totalCents,
      items,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData?.error?.message || `Failed to submit order: ${response.status}`
    );
  }

  const data = await response.json();
  return data.order;
}
