import {getAdminRequestHeaders} from '../utils/adminAuth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchRatings() {
  const response = await fetch(`${API_BASE_URL}/api/ratings`);

  if (!response.ok) {
    throw new Error(`Failed to fetch ratings: ${response.status}`);
  }

  const data = await response.json();
  return data.ratings || [];
}

export async function updateRating(ratingId, {score, description}) {
  const response = await fetch(`${API_BASE_URL}/api/ratings/${ratingId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAdminRequestHeaders(),
    },
    body: JSON.stringify({score, description}),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.error?.message || `Failed to update rating: ${response.status}`
    );
  }

  const data = await response.json();
  return data.ratings || [];
}