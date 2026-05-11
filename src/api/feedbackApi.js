const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function createFeedback(feedback) {
  const response = await fetch(`${API_BASE_URL}/api/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(feedback),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload?.error?.message || 'Feedback could not be saved.'
    );
  }

  return payload.feedback;
}

export async function fetchCustomerFeedback(customerId) {
  if (!customerId) {
    return [];
  }

  const response = await fetch(
    `${API_BASE_URL}/api/feedback/customer/${encodeURIComponent(customerId)}`
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload?.error?.message || 'Feedback could not be loaded.'
    );
  }

  return Array.isArray(payload.feedbackItems) ? payload.feedbackItems : [];
}