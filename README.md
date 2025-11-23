# Voucher & Promotion API

A Node.js API for managing vouchers and promotions with discount calculation logic.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your MongoDB URI
npm run seed    # Optional: add sample data
npm run dev     # Start server
npm test        # Run tests
```

## What It Does

Manages vouchers (site-wide discounts) and promotions (category/item-specific discounts). Calculates order totals with applied discounts while enforcing business rules.

## Key Logic & Edge Cases

### Discount Application Priority

When a code is provided, the system checks promotions first, then vouchers. This allows category-specific deals to take precedence over generic discounts.

**Why?** Promotions are more targeted and typically offer better value for specific items. Checking them first ensures customers get the best applicable deal.

### Atomic Usage Tracking

Usage counts are incremented using MongoDB's conditional update with the current usage count in the query:

```javascript
findOneAndUpdate(
  { _id: id, uses: currentUses },  // Only update if uses hasn't changed
  { $inc: { uses: 1 } }
)
```

**Edge case handled:** Two users applying the same code simultaneously when only 1 use remains. The second request fails gracefully instead of exceeding the limit.

### 50% Maximum Discount Cap

Total discount is capped at 50% of the subtotal, regardless of voucher/promotion value.

**Why?** Prevents abuse scenarios like stacking multiple discounts or using percentage-based codes on already-discounted items that could result in negative totals or excessive losses.

### Proportional Discount Distribution

For promotions with eligible categories, the discount is distributed proportionally across eligible items only:

```javascript
itemDiscount = totalDiscount * (itemTotal / eligibleAmount)
```

**Edge case handled:** Mixed cart with eligible and non-eligible items. Only eligible items receive the discount, proportional to their contribution to the eligible subtotal.

### Code Generation with Collision Handling

Auto-generated codes retry up to 10 times if a collision occurs:

```javascript
while (!codeGenerated && attempts < maxAttempts) {
  code = generateCode();
  if (!existingCode) codeGenerated = true;
  attempts++;
}
```

**Edge case handled:** As the database grows, random code collisions become more likely. The retry mechanism ensures codes are eventually unique without manual intervention.

### Soft Deletes

Vouchers and promotions use `deletedAt` timestamps instead of hard deletes.

**Why?** Preserves historical order data. Orders reference codes that may later be "deleted" but still need to be queryable for reporting and auditing.

### Validation Order

Checks happen in this sequence: expiration -> usage limit -> minimum order value -> eligible items.

**Why?** Fail fast on the cheapest checks first. No point calculating eligible amounts if the code is already expired or maxed out.

## Important API Endpoints

- `POST /vouchers` - Create voucher
- `GET /vouchers` - List vouchers (query: ?status=active|expired|deleted)
- `POST /promotions` - Create promotion
- `GET /promotions` - List promotions (query: ?status=active|expired|deleted)
- `POST /orders/apply` - Calculate discount preview
- `POST /orders` - Create order with discount applied

## Tech Stack

Express, MongoDB (Mongoose), Joi validation, Jest testing
