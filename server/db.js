// server/db.js
/**
 * Re-export database helpers and repository functions.
 *
 * This file gathers commonly used database utilities and repository
 * methods together so other modules can import them from a single
 * path (e.g. `import { initDatabase } from './server/db.js'`).
 */

export {pool, pingDatabase} from './db/pool.js';
export {initDatabase} from './db/initDatabase.js';

export {
  getAllMenuItems,
  getFeaturedMenuItems,
  getMenuItemById,
  upsertMenuItem,
  deleteMenuItem,
} from './repositories/menuRepository.js';

export {
  registerCustomerAccount,
  loginCustomerAccount,
  getUserByEmail,
} from './repositories/userRepository.js';

export {
  getRatings,
  updateRating,
} from './repositories/ratingRepository.js';

export {
  getOpeningHours,
  getLunchOffer,
  updateLunchOffer,
} from './repositories/settingsRepository.js';

export {
  createOrder,
  addOrderItem,
  getOrder,
  getOrdersByCustomer,
} from './repositories/orderRepository.js';