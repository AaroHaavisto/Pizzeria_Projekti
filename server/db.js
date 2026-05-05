// server/db.js

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
} from './repositories/orderRepository.js';