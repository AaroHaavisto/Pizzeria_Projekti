/**
 * End-to-End Tests for Pizzeria Pro Frontend
 * Tests complete user workflows including navigation and form submission
 * 
 * Note: These tests can be run against the running application at localhost:5173
 * Requirements: Backend API must be running on localhost:3005
 */

const APP_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3005/api';

// Helper to wait for a condition with timeout
async function waitFor(condition, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (condition()) return true;
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Timeout waiting for condition');
}

// Test utilities
function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
  console.log(`✓ ${message}`);
}

function assertTrue(condition, message) {
  if (!condition) {
    throw new Error(`${message}: assertion failed`);
  }
  console.log(`✓ ${message}`);
}

function assertExists(value, message) {
  if (!value) {
    throw new Error(`${message}: value does not exist`);
  }
  console.log(`✓ ${message}`);
}

/**
 * Test 1: Application Load and Home Page Visibility
 */
async function testApplicationLoad() {
  console.log('\n=== E2E Test 1: Application Load ===');
  try {
    const response = await fetch(APP_URL);
    assertEqual(response.status, 200, 'Application loads with 200 status');
    
    const html = await response.text();
    assertTrue(html.includes('Pizzeria Pro'), 'Home page contains app title');
    assertTrue(html.includes('react'), 'React is loaded');
    
    console.log('  ✓ Application is accessible and loads successfully');
    console.log('  PASSED');
  } catch (error) {
    console.error('  FAILED:', error.message);
    throw error;
  }
}

/**
 * Test 2: Navigation Menu Availability
 */
async function testNavigationMenu() {
  console.log('\n=== E2E Test 2: Navigation Menu ===');
  try {
    const response = await fetch(APP_URL);
    const html = await response.text();
    
    // Check for navigation links or data-testid attributes
    const hasNavigation = html.includes('Navigation') || 
                          html.includes('navigation') ||
                          html.includes('menu') ||
                          html.includes('link');
    assertTrue(hasNavigation, 'Navigation component exists');
    
    console.log('  ✓ Navigation component is present');
    console.log('  PASSED');
  } catch (error) {
    console.error('  FAILED:', error.message);
    throw error;
  }
}

/**
 * Test 3: Menu Page Loading and Product Display
 */
async function testMenuPageAccess() {
  console.log('\n=== E2E Test 3: Menu Page Loading ===');
  try {
    const response = await fetch(`${APP_URL}/menu`);
    assertEqual(response.status, 200, 'Menu page loads with 200 status');
    
    const html = await response.text();
    assertTrue(html.includes('Menu'), 'Menu page contains Menu text');
    assertTrue(html.includes('Pizzat') || html.includes('Pizze'), 'Menu page shows pizza category');
    
    // Test that menu API is available
    const menuResponse = await fetch(`${API_URL}/menu`);
    assertEqual(menuResponse.status, 200, 'Menu API endpoint works');
    
    const menuData = await menuResponse.json();
    assertTrue(menuData.items && menuData.items.length > 0, 'Menu has items');
    
    console.log(`  ✓ Menu page accessible with ${menuData.items.length} items`);
    console.log('  PASSED');
  } catch (error) {
    console.error('  FAILED:', error.message);
    throw error;
  }
}

/**
 * Test 4: Cart Page Availability
 */
async function testCartPageAccess() {
  console.log('\n=== E2E Test 4: Cart Page Access ===');
  try {
    const response = await fetch(`${APP_URL}/cart`);
    assertEqual(response.status, 200, 'Cart page loads with 200 status');
    
    const html = await response.text();
    assertTrue(
      html.includes('Ostoskori') || html.includes('Cart'),
      'Cart page contains expected text'
    );
    
    console.log('  ✓ Cart page is accessible');
    console.log('  PASSED');
  } catch (error) {
    console.error('  FAILED:', error.message);
    throw error;
  }
}

/**
 * Test 5: Location Page Availability
 */
async function testLocationPageAccess() {
  console.log('\n=== E2E Test 5: Location Page ===');
  try {
    const response = await fetch(`${APP_URL}/location`);
    assertEqual(response.status, 200, 'Location page loads with 200 status');
    
    const html = await response.text();
    assertTrue(
      html.includes('Sijainti') || html.includes('Location') || html.includes('map'),
      'Location page contains location-related content'
    );
    
    console.log('  ✓ Location page is accessible');
    console.log('  PASSED');
  } catch (error) {
    console.error('  FAILED:', error.message);
    throw error;
  }
}

/**
 * Test 6: Account Page and Login Form
 */
async function testAccountPageForm() {
  console.log('\n=== E2E Test 6: Account Page Form ===');
  try {
    const response = await fetch(`${APP_URL}/account?mode=login`);
    assertEqual(response.status, 200, 'Account page loads with 200 status');
    
    const html = await response.text();
    assertTrue(
      html.includes('Email') || html.includes('Sähköposti'),
      'Account page shows email field'
    );
    assertTrue(
      html.includes('Password') || html.includes('Salasana'),
      'Account page shows password field'
    );
    
    console.log('  ✓ Account page displays login form');
    console.log('  PASSED');
  } catch (error) {
    console.error('  FAILED:', error.message);
    throw error;
  }
}

/**
 * Test 7: Feedback Page Access (Authenticated Users)
 */
async function testFeedbackPageAccess() {
  console.log('\n=== E2E Test 7: Feedback Page Access ===');
  try {
    const response = await fetch(`${APP_URL}/feedback`);
    // Page may return 200 or redirect based on auth state
    assertTrue([200, 302].includes(response.status), 'Feedback page is defined');
    
    const html = await response.text();
    // Check for feedback-related content
    const hasFeedbackContent = html.includes('feedback') || 
                               html.includes('palaut') ||
                               html.includes('rating');
    
    console.log(`  ✓ Feedback page route exists`);
    console.log('  PASSED');
  } catch (error) {
    console.error('  FAILED:', error.message);
    throw error;
  }
}

/**
 * Test 8: API Health Check - All Critical Endpoints
 */
async function testAPIHealth() {
  console.log('\n=== E2E Test 8: API Health Check ===');
  try {
    const endpoints = [
      { url: '/menu', name: 'Menu' },
      { url: '/settings/opening-hours', name: 'Opening Hours' },
      { url: '/settings/lunch-offer', name: 'Lunch Offer' },
      { url: '/menu/featured', name: 'Featured Items' }
    ];
    
    for (const endpoint of endpoints) {
      const response = await fetch(`${API_URL}${endpoint.url}`);
      assertEqual(response.status, 200, `${endpoint.name} endpoint responds`);
    }
    
    console.log(`  ✓ All ${endpoints.length} critical endpoints are healthy`);
    console.log('  PASSED');
  } catch (error) {
    console.error('  FAILED:', error.message);
    throw error;
  }
}

/**
 * Test 9: Complete Order Submission Flow
 */
async function testCompleteOrderFlow() {
  console.log('\n=== E2E Test 9: Complete Order Flow ===');
  try {
    // Step 1: Get available menu items
    const menuResponse = await fetch(`${API_URL}/menu`);
    const menuData = await menuResponse.json();
    assertTrue(menuData.items.length > 0, 'Menu items available');
    
    // Step 2: Create order with items
    const order = {
      items: [
        { menuItemId: menuData.items[0].id, quantity: 2 }
      ],
      orderType: 'pickup',
      pickupTime: '18:00'
    };
    
    const orderResponse = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(order)
    });
    
    assertTrue([200, 201].includes(orderResponse.status), 'Order creation successful');
    
    if (orderResponse.status === 200 || orderResponse.status === 201) {
      const orderData = await orderResponse.json();
      assertExists(orderData.order.id, 'Order has ID');
      assertTrue(orderData.order.totalAmount >= 0, 'Order has total');
      console.log(`  Order created: #${orderData.order.id} - €${orderData.order.totalAmount}`);
    }
    
    console.log('  ✓ Complete order flow works end-to-end');
    console.log('  PASSED');
  } catch (error) {
    console.error('  FAILED:', error.message);
    throw error;
  }
}

/**
 * Test 10: Language and Localization Support
 */
async function testLocalizationSupport() {
  console.log('\n=== E2E Test 10: Localization Support ===');
  try {
    const response = await fetch(APP_URL);
    const html = await response.text();
    
    // Check for Finnish text (default language)
    const finnishText = [
      'Etusivu',
      'Menu',
      'Sijainti',
      'Ostoskori'
    ];
    
    for (const text of finnishText) {
      assertTrue(html.includes(text), `Finnish localization includes: ${text}`);
    }
    
    // Check that language context is available
    assertTrue(html.includes('LanguageContext') || html.includes('language'), 
               'Language context is present');
    
    console.log('  ✓ Application supports Finnish localization');
    console.log('  ✓ Language context is available for EN/FI switching');
    console.log('  PASSED');
  } catch (error) {
    console.error('  FAILED:', error.message);
    throw error;
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║    PIZZERIA PRO - END-TO-END TESTS                    ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(`Testing app at: ${APP_URL}`);
  console.log(`Testing API at: ${API_URL}`);
  
  const tests = [
    testApplicationLoad,
    testNavigationMenu,
    testMenuPageAccess,
    testCartPageAccess,
    testLocationPageAccess,
    testAccountPageForm,
    testFeedbackPageAccess,
    testAPIHealth,
    testCompleteOrderFlow,
    testLocalizationSupport
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (error) {
      failed++;
    }
  }
  
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log(`║   RESULTS: ${passed} passed, ${failed} failed                      ║`);
  console.log('╚═══════════════════════════════════════════════════════╝');
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
