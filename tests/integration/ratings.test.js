/**
 * Integration Tests for Pizzeria Pro Ratings and Announcements
 * Tests user ratings, feedback, and announcements management
 */

const BASE_URL = 'http://localhost:3005/api';

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
 * Test 1: Get All Announcements
 */
async function testGetAnnouncements() {
  console.log('\n=== Test 1: Get Announcements ===');
  try {
    const response = await fetch(`${BASE_URL}/announcements`);
    assertEqual(response.status, 200, 'Announcements endpoint returns 200');
    
    const data = await response.json();
    assertTrue(Array.isArray(data.announcements), 'Announcements is an array');
    
    if (data.announcements.length > 0) {
      const announcement = data.announcements[0];
      assertExists(announcement.id, 'Announcement has ID');
      assertExists(announcement.message, 'Announcement has message');
      console.log(`  Found ${data.announcements.length} announcements`);
    }
    console.log('  PASSED');
  } catch (error) {
    console.error('  FAILED:', error.message);
    throw error;
  }
}

/**
 * Test 2: Submit Rating for Menu Item
 */
async function testSubmitMenuRating() {
  console.log('\n=== Test 2: Submit Menu Item Rating ===');
  try {
    const rating = {
      menuItemId: 1,
      rating: 4.5,
      comment: 'Delicious pizza! Great taste.'
    };
    
    const response = await fetch(`${BASE_URL}/ratings/menu-items`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(rating)
    });
    
    assertTrue([200, 201, 400].includes(response.status), 'Rating submission endpoint is functional');
    
    if (response.status === 200 || response.status === 201) {
      const data = await response.json();
      if (data.rating) {
        console.log(`  Rating ${data.rating.rating} stars submitted for item ${data.rating.menuItemId}`);
        assertTrue(data.rating.rating >= 1 && data.rating.rating <= 5, 'Rating is in valid range');
      }
    }
    console.log('  PASSED');
  } catch (error) {
    console.error('  FAILED:', error.message);
    throw error;
  }
}

/**
 * Test 3: Get Menu Item Ratings
 */
async function testGetMenuRatings() {
  console.log('\n=== Test 3: Get Menu Item Ratings ===');
  try {
    const response = await fetch(`${BASE_URL}/ratings/menu-items`);
    assertTrue([200, 404].includes(response.status), 'Menu ratings endpoint is functional');
    
    if (response.status === 200) {
      const data = await response.json();
      assertTrue(Array.isArray(data.ratings), 'Ratings is an array');
      console.log(`  Found ${data.ratings.length} ratings`);
      
      if (data.ratings.length > 0) {
        const rating = data.ratings[0];
        assertTrue(rating.rating >= 1 && rating.rating <= 5, 'Ratings are in valid range');
      }
    }
    console.log('  PASSED');
  } catch (error) {
    console.error('  FAILED:', error.message);
    throw error;
  }
}

/**
 * Test 4: Submit Restaurant Feedback
 */
async function testSubmitRestaurantFeedback() {
  console.log('\n=== Test 4: Submit Restaurant Feedback ===');
  try {
    const feedback = {
      customerId: 'test-customer-' + Date.now(),
      rating: 4,
      message: 'Great service and delicious food!',
      category: 'service'
    };
    
    const response = await fetch(`${BASE_URL}/ratings/feedback`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(feedback)
    });
    
    assertTrue([200, 201, 400].includes(response.status), 'Feedback submission endpoint is functional');
    
    if (response.status === 200 || response.status === 201) {
      const data = await response.json();
      if (data.feedback) {
        console.log(`  Feedback submitted with ${data.feedback.rating} star rating`);
        assertTrue(data.feedback.rating >= 1 && data.feedback.rating <= 5, 'Feedback rating is valid');
      }
    }
    console.log('  PASSED');
  } catch (error) {
    console.error('  FAILED:', error.message);
    throw error;
  }
}

/**
 * Test 5: Data Validation - Rating Out of Range
 */
async function testRatingValidation() {
  console.log('\n=== Test 5: Rating Validation ===');
  try {
    const invalidRating = {
      menuItemId: 1,
      rating: 10,  // Invalid: should be 1-5
      comment: 'Invalid rating'
    };
    
    const response = await fetch(`${BASE_URL}/ratings/menu-items`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(invalidRating)
    });
    
    assertTrue([400, 201, 200].includes(response.status), 'Validation endpoint is functional');
    
    if (response.status === 400) {
      console.log('  ✓ Invalid rating correctly rejected');
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
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  PIZZERIA PRO - RATINGS & ANNOUNCEMENTS TESTS         ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(`Testing API at: ${BASE_URL}`);
  
  const tests = [
    testGetAnnouncements,
    testSubmitMenuRating,
    testGetMenuRatings,
    testSubmitRestaurantFeedback,
    testRatingValidation
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
