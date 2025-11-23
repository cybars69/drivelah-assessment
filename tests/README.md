# Test Coverage

Comprehensive test suite covering all API endpoints and business logic.

## Test Files

### vouchers.test.js
- Create voucher with all fields
- Auto-generate code when not provided
- Reject duplicate codes
- Reject invalid types and negative values
- List all vouchers with status filters (active/expired/deleted)
- Get voucher by code
- Update voucher
- Soft delete voucher

### promotions.test.js
- Create promotion with eligible categories
- Create promotion with eligible items
- Auto-generate code when not provided
- Reject duplicate codes
- Support maxDiscountAmount
- List all promotions with status filters (active/expired/deleted)
- Get promotion by code
- Update promotion
- Soft delete promotion

### orders.test.js
- Calculate order without discount
- Calculate order with percentage voucher
- Calculate order with fixed voucher
- Calculate order with category-specific promotion
- Prioritize promotion over voucher
- Cap discount at 50% of subtotal
- Respect maxDiscountAmount
- Reject expired codes
- Reject codes at usage limit
- Reject when minimum order value not met
- Reject promotion with no eligible items
- Reject when product not found
- Reject when product out of stock
- Create order without discount
- Create order with voucher and increment usage
- Create order with promotion and increment usage
- Handle concurrent usage attempts (atomic increment)
- Apply 50% cap on order creation

### products.test.js
- Get all in-stock products
- Get product by ID
- Return 404 for non-existent product
- Return out of stock products by ID

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test tests/vouchers.test.js

# Run specific test
npm test -t "should create a voucher"
```

## Test Database

Tests use a separate MongoDB database: `voucher-api-test`

Each test suite cleans up its collections before each test to ensure isolation.
