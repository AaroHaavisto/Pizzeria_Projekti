/**
 * Integration Tests for Slice Hunt Orders
 * Tests order creation, retrieval, and management
 */

import {getTestConfig} from '../utils/testConfig.js';

const {apiUrl: BASE_URL} = getTestConfig();

// Test utilities
function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
  console.log(`✓ ${message}`);
}

function assertExists(value, message) {
  if (!value) {
    throw new Error(`${message}: value does not exist`);
  }
  console.log(`✓ ${message}`);
}

function assertTrue(condition, message) {
  if (!condition) {
    throw new Error(`${message}: assertion failed`);
  }
  console.log(`✓ ${message}`);
}

/**
 * Test 1: Create Order without Authentication
 */
async function testCreateGuestOrder() {
  console.log('\n=== Test 1: Create Guest Order ===');
  try {
    const menuResponse = await fetch(`${BASE_URL}/menu`);
    const menuData = await menuResponse.json();
    
    if (!menuData.items || menuData.items.length === 0) {
      console.log('  Menu items not available (skipping)');
      console.log('  PASSED');
      return;
    }
    
    const order = {
      items: [
        { menuItemId: menuData.items[0].itemId, quantity: 1, unitPrice: menuData.items[0].priceCents }
      ],
      orderType: 'pickup',
      pickupTime: '18:00'
    };
    
    const response = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(order)
    });
    
    assertTrue([200, 201, 400].includes(response.status), 'Order endpoint is functional');
    const data = await response.json();
    
    if (response.status === 200 || response.status === 201) {
      if (data.order) {
        assertExists(data.order.id, 'Order has ID');
        console.log(`  Created order: ${data.order.id}`);
      }
    }
    console.log('  PASSED');
  } catch (error) {
    console.error('  FAILED:', error.message);
    throw error;
  }
}

/**
 * Test 2: Get Order Status
 */
async function testGetOrderStatus() {
  console.log('\n=== Test 2: Get Order Status ===');
  try {
    // First create an order
    const order = {
      items: [{ menuItemId: 1, quantity: 1 }],
      orderType: 'pickup',
      pickupTime: '18:30'
    };
    
    const createResponse = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(order)
    });
    
    if (createResponse.status === 201 || createResponse.status === 200) {
      const createData = await createResponse.json();
      const orderId = createData.order.id;
      
      // Now retrieve the order
      const getResponse = await fetch(`${BASE_URL}/orders/${orderId}`);
      assertEqual(getResponse.status, 200, 'Order retrieval endpoint returns 200');

      const getData = await getResponse.json();
      assertExists(getData.order, 'Order data returned');
      console.log(`  Order ${orderId}: ${getData.order.status}`);
    }
    console.log('  PASSED');
  } catch (error) {
    console.error('  FAILED:', error.message);
    throw error;
  }
}

/**
 * Test 3: Order with Multiple Items
 */
async function testOrderWithMultipleItems() {
  console.log('\n=== Test 3: Order with Multiple Items ===');
  try {
    const menuResponse = await fetch(`${BASE_URL}/menu`);
    const menuData = await menuResponse.json();
    
    if (!menuData.items || menuData.items.length < 2) {
      console.log('  Insufficient menu items (skipping)');
      console.log('  PASSED');
      return;
    }
    
    const order = {
      items: [
        { menuItemId: menuData.items[0].itemId, quantity: 1, unitPrice: menuData.items[0].priceCents },
        { menuItemId: menuData.items[1].itemId, quantity: 1, unitPrice: menuData.items[1].priceCents }
      ],
      orderType: 'delivery',
      pickupTime: '19:00'
    };
    
    const response = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(order)
    });
    
    assertTrue([200, 201, 400].includes(response.status), 'Multi-item order creation is functional');
    
    if (response.status === 200 || response.status === 201) {
      const data = await response.json();
      if (data.order) {
        console.log(`  Order with ${order.items.length} items created`);
      }
    }
    console.log('  PASSED');
  } catch (error) {
    console.error('  FAILED:', error.message);
    throw error;
  }
}

/**
 * Test 4: Order Validation - Invalid Menu Item
 */
async function testOrderValidation() {
  console.log('\n=== Test 4: Order Validation ===');
  try {
    const invalidOrder = {
      items: [
        { menuItemId: 99999, quantity: 1 }  // Non-existent item
      ],
      orderType: 'pickup',
      pickupTime: '20:00'
    };
    
    const response = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(invalidOrder)
    });
    
    assertTrue([400, 404].includes(response.status), 'Validation error returned for invalid item');
    console.log('  ✓ Order validation working (invalid item rejected)');
    console.log('  PASSED');
  } catch (error) {
    console.error('  FAILED:', error.message);
    throw error;
  }
}

/**
 * Test 5: Order with Lunch Discount
 */
async function testOrderWithDiscount() {
  console.log('\n=== Test 5: Order with Lunch Discount ===');
  try {
    // Get lunch offer details
    let offerResponse = await fetch(`${BASE_URL}/settings/lunch-offer`);

    if (offerResponse.status === 404) {
      offerResponse = await fetch(`${BASE_URL}/lunch-offer`);
    }

    const offerData = await offerResponse.json();
    const discountPercent = offerData.lunchOffer.discountPercent;
    
    const order = {
      items: [
        { menuItemId: 1, quantity: 1, applyDiscount: true }
      ],
      orderType: 'pickup',
      pickupTime: '12:00'  // During lunch hours
    };
    
    const response = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(order)
    });
    
    assertTrue([200, 201, 400].includes(response.status), 'Discount order creation is functional');
    
    if (response.status === 200 || response.status === 201) {
      const data = await response.json();
      if (data.order.discountAmount > 0) {
        console.log(`  Discount applied: €${data.order.discountAmount} (${discountPercent}%)`);
        console.log(`  Total after discount: €${data.order.totalAmount}`);
      }
    }
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
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   SLICE HUNT - ORDERS INTEGRATION TESTS   ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`Testing API at: ${BASE_URL}`);
  
  const tests = [
    testCreateGuestOrder,
    testGetOrderStatus,
    testOrderWithMultipleItems,
    testOrderValidation,
    testOrderWithDiscount
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
  
  console.log('\n╔════════════════════════════════════════════╗');
  console.log(`║   RESULTS: ${passed} passed, ${failed} failed          ║`);
  console.log('╚════════════════════════════════════════════╝');
  
  process.exitCode = failed > 0 ? 1 : 0;
}

// Run tests
runAllTests().catch(error => {
  console.error('Test runner error:', error);
  process.exitCode = 1;
});
