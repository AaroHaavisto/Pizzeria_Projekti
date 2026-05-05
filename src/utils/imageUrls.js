const IMAGE_BASE_PATH = `${import.meta.env.BASE_URL}images/`;

/**
 * Resolves image paths so they work both in development and under a subdirectory deployment.
 * @param {string} imagePath - Image path from API, JSON, or local fallback data
 * @returns {string} Deploy-safe image URL
 */
export function resolveImageUrl(imagePath) {
  if (typeof imagePath !== 'string' || imagePath.trim() === '') {
    return '';
  }

  const trimmedPath = imagePath.trim();

  if (/^https?:\/\//i.test(trimmedPath)) {
    return trimmedPath;
  }

  if (trimmedPath.startsWith(`${import.meta.env.BASE_URL}images/`)) {
    return trimmedPath;
  }

  if (trimmedPath.startsWith('/src/assets/images/')) {
    return `${IMAGE_BASE_PATH}${trimmedPath.split('/').pop()}`;
  }

  if (trimmedPath.startsWith('images/')) {
    return `${import.meta.env.BASE_URL}${trimmedPath}`;
  }

  return `${IMAGE_BASE_PATH}${trimmedPath.split('/').pop()}`;
}
