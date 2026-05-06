const ALLOWED_MEAL_TYPES = new Set(['lunch', 'a_la_carte']);

export function validateItem(item, pathPrefix) {
  const errors = [];

  if (!item || typeof item !== 'object') {
    return [`${pathPrefix} must be an object`];
  }

  if (!item.itemId || typeof item.itemId !== 'string') {
    errors.push(`${pathPrefix}.itemId is required and must be string`);
  }

  if (!item.name || typeof item.name !== 'string') {
    errors.push(`${pathPrefix}.name is required and must be string`);
  }

  if (item.description != null && typeof item.description !== 'string') {
    errors.push(`${pathPrefix}.description must be string when provided`);
  }

  if (!Number.isInteger(item.priceCents) || item.priceCents < 0) {
    errors.push(`${pathPrefix}.priceCents is required and must be integer >= 0`);
  }

  if (!item.currency || typeof item.currency !== 'string') {
    errors.push(`${pathPrefix}.currency is required and must be string`);
  }

  if (!Array.isArray(item.diet) || item.diet.some(d => typeof d !== 'string')) {
    errors.push(`${pathPrefix}.diet must be string[]`);
  }

  if (!ALLOWED_MEAL_TYPES.has(item.mealType)) {
    errors.push(`${pathPrefix}.mealType must be one of: lunch, a_la_carte`);
  }

  if (item.image != null && typeof item.image !== 'string') {
    errors.push(`${pathPrefix}.image must be string when provided`);
  }

  return errors;
}