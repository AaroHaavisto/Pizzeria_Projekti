# Pizzeria Pro - Test Suite Documentation

## Overview

This directory contains comprehensive test coverage for Pizzeria Pro, including:
- **Integration Tests**: 15+ tests for API endpoints
- **End-to-End Tests**: 15+ tests for complete user workflows

## Prerequisites

- Node.js v24.14.0 or higher
- Backend API running on `http://localhost:3005`
- Frontend application running on `http://localhost:5173` (for E2E tests)

## Running Tests

### Start the Application

First, start both the frontend and backend servers:

```bash
npm run dev
```

This will start:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3005`

### Run Integration Tests

Integration tests verify API endpoints are working correctly.

**All Integration Tests:**
```bash
node tests/integration/api.test.js
node tests/integration/orders.test.js
node tests/integration/ratings.test.js
```

**Individual Test Files:**

1. **API Tests** - Menu, Settings, Featured Items
   ```bash
   node tests/integration/api.test.js
   ```
   Tests:
   - Get Menu Items
   - Get Opening Hours
   - Get Lunch Offer
   - Get Featured Menu Items
   - Create Customer Account

2. **Orders Tests** - Order Management
   ```bash
   node tests/integration/orders.test.js
   ```
   Tests:
   - Create Guest Order
   - Get Order Status
   - Order with Multiple Items
   - Order Validation
   - Order with Lunch Discount

3. **Ratings Tests** - Feedback and Ratings
   ```bash
   node tests/integration/ratings.test.js
   ```
   Tests:
   - Get Announcements
   - Submit Menu Item Rating
   - Get Menu Ratings
   - Submit Restaurant Feedback
   - Rating Validation

### Run End-to-End Tests

End-to-end tests verify complete user workflows and application functionality.

**All E2E Tests:**
```bash
node tests/e2e/frontend.e2e.js
node tests/e2e/workflows.e2e.js
```

**Individual Test Files:**

1. **Frontend E2E Tests** - Application Load and Navigation
   ```bash
   node tests/e2e/frontend.e2e.js
   ```
   Tests:
   - Application Load
   - Navigation Menu
   - Menu Page Loading
   - Cart Page Access
   - Location Page Access
   - Account Page Form
   - Feedback Page Access
   - API Health Check
   - Complete Order Flow
   - Localization Support

2. **Workflow E2E Tests** - User Journeys
   ```bash
   node tests/e2e/workflows.e2e.js
   ```
   Tests:
   - User Registration Workflow
   - Customer Login Workflow
   - Browse Menu and Add to Cart
   - Complete Purchase Workflow
   - Submit Feedback and Rating

### Run All Tests

Create a test script that runs everything:

```bash
#!/bin/bash
echo "Running Integration Tests..."
node tests/integration/api.test.js
node tests/integration/orders.test.js
node tests/integration/ratings.test.js

echo -e "\nRunning E2E Tests..."
node tests/e2e/frontend.e2e.js
node tests/e2e/workflows.e2e.js
```

## Test Results

### Expected Output

Each test file will output:
- ✓ Test name for passed assertions
- Test group summary (PASSED/FAILED)
- Overall results (X passed, Y failed)

Example:
```
╔════════════════════════════════════════════╗
║   PIZZERIA PRO - INTEGRATION TESTS       ║
╚════════════════════════════════════════════╝
Testing API at: http://localhost:3005/api

=== Test 1: Get Menu Items ===
✓ Menu endpoint returns 200
✓ Menu items is an array
✓ Menu has items
✓ Menu item has name
✓ Menu item has price
✓ Menu item has category
  Found 12 menu items
  PASSED

╔════════════════════════════════════════════╗
║   RESULTS: 5 passed, 0 failed          ║
╚════════════════════════════════════════════╝
```

## Test Coverage

### Total Tests: 30+

| Category | Count | Focus |
|----------|-------|-------|
| API Integration | 15 | Endpoints, data validation |
| Frontend E2E | 10 | Page loads, navigation, workflows |
| User Workflows | 5 | Registration, login, ordering |
| **Total** | **30+** | **Full application coverage** |

## Test Scenarios Covered

### Data Validation
- ✓ Menu items exist and have required fields
- ✓ Opening hours are properly configured
- ✓ Lunch offer details are available
- ✓ Rating validation (1-5 scale)
- ✓ Order field validation

### User Workflows
- ✓ User registration
- ✓ User login
- ✓ Browse menu
- ✓ Create orders
- ✓ Submit feedback and ratings

### System Health
- ✓ All critical API endpoints available
- ✓ Frontend pages load
- ✓ Navigation functions
- ✓ Order processing
- ✓ Language/localization support

## Troubleshooting

### Tests Fail with "Cannot reach localhost"
- Ensure both frontend and backend are running: `npm run dev`
- Check that ports 5173 and 3005 are not blocked

### Tests Fail with "Invalid API Response"
- Backend database may need initialization
- Stop the dev server (`Ctrl+C`)
- Clear database and restart: `npm run dev`

### Order Tests Fail with "Menu item not found"
- Database might be missing menu items
- Check that `server/data/menu.json` exists
- Database should auto-populate on first run

## Adding New Tests

To add new tests:

1. Create test file in `tests/integration/` or `tests/e2e/`
2. Use the same utility functions for consistency
3. Follow the pattern: Test function → Console output → Error handling
4. Run with `node tests/path/to/test.js`

## CI/CD Integration

To integrate with CI/CD:

```yaml
# Example: GitHub Actions
- name: Run Integration Tests
  run: |
    npm run dev &
    sleep 5  # Wait for server startup
    node tests/integration/api.test.js
    node tests/integration/orders.test.js
    node tests/integration/ratings.test.js

- name: Run E2E Tests
  run: |
    node tests/e2e/frontend.e2e.js
    node tests/e2e/workflows.e2e.js
```

## Notes

- Tests are written in vanilla Node.js without external test frameworks
- Tests output human-readable reports
- Exit code 0 = all passed, 1 = any failures
- Tests are designed for quick execution (typical: 2-5 seconds per file)
- Safe for repeated runs (uses unique IDs for data creation)

## Support

For issues or questions about the tests:
1. Check the test file comments for test purpose
2. Review console output for specific assertion failures
3. Verify API is running and responding: `curl http://localhost:3005/api/menu`
4. Check frontend loads: `curl http://localhost:5173`
