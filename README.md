# Voucher & Promotion Management API

A minimal, practical Node.js + Express API for managing vouchers and promotions with MongoDB.

## Features

- CRUD operations for vouchers and promotions
- Apply discounts to orders with validation
- Enforce business rules (expiration, usage limits, minimum order value, eligible categories)
- Cap maximum discount at 50% of order value
- Atomic usage count increments to prevent race conditions
- Rate limiting (in-memory for dev)
- Input validation with Joi
- Basic tests with Jest + SuperTest

## Tech Stack

- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Validation**: Joi
- **Rate Limiting**: express-rate-limit (in-memory)
- **Testing**: Jest + SuperTest

## Prerequisites

- Node.js (v16+)
- MongoDB (local or cloud instance)

## Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your MongoDB URI
# MONGODB_URI=mongodb://localhost:27017/voucher-api
# PORT=3000
```

## Running the Application

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start

# Seed sample data
npm run seed

# Run tests
npm test
```

## API Endpoints

### Vouchers

- `POST /vouchers` - Create a voucher
- `GET /vouchers` - List all vouchers (query: ?active=true or ?expired=true)
- `GET /vouchers/:code` - Get voucher by code
- `PUT /vouchers/:id` - Update voucher
- `DELETE /vouchers/:id` - Delete voucher

### Promotions

- `POST /promotions` - Create a promotion
- `GET /promotions` - List all promotions (query: ?active=true or ?expired=true)
- `GET /promotions/:code` - Get promotion by code
- `PUT /promotions/:id` - Update promotion
- `DELETE /promotions/:id` - Delete promotion

### Orders

- `POST /orders/apply` - Apply voucher/promotion and calculate discount
- `POST /orders` - Create order with applied discounts

## Example Requests

### Create a Voucher

```bash
curl -X POST http://localhost:3000/vouchers \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SAVE20",
    "type": "percentage",
    "value": 20,
    "expiresAt": "2025-12-31T23:59:59Z",
    "usageLimit": 100,
    "minOrderValue": 50
  }'
```

### Create a Promotion

```bash
curl -X POST http://localhost:3000/promotions \
  -H "Content-Type: application/json" \
  -d '{
    "code": "ELECTRONICS25",
    "eligibleCategories": ["electronics"],
    "type": "percentage",
    "value": 25,
    "expiresAt": "2025-12-31T23:59:59Z",
    "usageLimit": 200
  }'
```

### Apply Discount to Order

```bash
curl -X POST http://localhost:3000/orders/apply \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "507f1f77bcf86cd799439011",
        "category": "electronics",
        "price": 100,
        "qty": 2
      }
    ],
    "voucherCode": "SAVE20"
  }'
```

Response:
```json
{
  "subTotal": 200,
  "discounts": [
    {
      "type": "voucher",
      "code": "SAVE20",
      "amount": 40
    }
  ],
  "totalDiscount": 40,
  "finalTotal": 160
}
```

## Business Rules

1. **Expiration**: Codes must not be expired
2. **Usage Limits**: Global usage count enforced atomically
3. **One Code Per Type**: One voucher + one promotion max per order
4. **Minimum Order Value**: Optional minimum subtotal requirement
5. **Eligible Categories**: Promotions can target specific product categories
6. **Maximum Discount**: Total discount capped at 50% of subtotal
7. **Atomic Updates**: Race-condition-safe usage increments

## Project Structure

```
/src
  /models          # Mongoose schemas
  /routes          # Express route handlers
  /services        # Business logic
  /validators      # Joi validation schemas
  app.js           # Express app setup
  server.js        # Server entry point
/scripts
  seed.js          # Database seeding
/tests
  apply.test.js    # Integration tests
```

## Production Considerations

- **Rate Limiting**: Replace express-rate-limit with Redis-backed solution (rate-limiter-flexible)
- **Authentication**: Add JWT-based auth for protected endpoints
- **Logging**: Implement structured logging (Winston, Pino)
- **Monitoring**: Add APM and error tracking
- **Database**: Use connection pooling and indexes
- **Caching**: Cache frequently accessed vouchers/promotions
- **Validation**: Add more comprehensive input sanitization

## License

MIT
