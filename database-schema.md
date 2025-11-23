# Database Schema

This document describes the MongoDB database schema for the e-commerce promotion system.

## Collections

### Products

Stores product information for the catalog.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| _id | ObjectId | Yes | Auto-generated | Unique identifier |
| name | String | Yes | Trimmed | Product name |
| category | String | Yes | Trimmed | Product category |
| price | Number | Yes | >= 0 | Product price |
| description | String | No | Trimmed | Product description |
| inStock | Boolean | No | Default: true | Stock availability |
| createdAt | Date | Yes | Auto-generated | Creation timestamp |
| updatedAt | Date | Yes | Auto-generated | Last update timestamp |

**Indexes:**
- Primary: `_id`

---

### Orders

Stores customer orders with applied discounts.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| _id | ObjectId | Yes | Auto-generated | Unique identifier |
| items | Array | Yes | - | Array of order items |
| items[].productId | ObjectId | Yes | - | Reference to product |
| items[].category | String | Yes | - | Product category |
| items[].price | Number | Yes | >= 0 | Item price |
| items[].qty | Number | Yes | >= 1 | Item quantity |
| subTotal | Number | Yes | >= 0 | Order subtotal before discount |
| applied | Object | No | - | Applied discount information |
| applied.code | String | No | - | Discount code used |
| applied.discountType | String | No | Enum: 'promotion', 'voucher' | Type of discount |
| applied.discountAmount | Number | No | Default: 0 | Discount amount applied |
| finalTotal | Number | Yes | >= 0 | Final order total after discount |
| createdAt | Date | Yes | Auto-generated | Creation timestamp |
| updatedAt | Date | Yes | Auto-generated | Last update timestamp |

**Indexes:**
- Primary: `_id`

---

### Promotions

Stores promotional discount codes with category/item eligibility.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| _id | ObjectId | Yes | Auto-generated | Unique identifier |
| code | String | Yes | Uppercase, Trimmed | Promotion code |
| eligibleCategories | Array[String] | No | Trimmed | Categories eligible for discount |
| eligibleItems | Array[ObjectId] | No | - | Specific products eligible |
| type | String | Yes | Enum: 'percentage', 'fixed' | Discount type |
| value | Number | Yes | >= 0 | Discount value (% or fixed amount) |
| expiresAt | Date | Yes | - | Expiration date |
| usageLimit | Number | Yes | >= 1 | Maximum number of uses |
| uses | Number | No | >= 0, Default: 0 | Current usage count |
| minOrderValue | Number | No | >= 0 | Minimum order value required |
| maxDiscountAmount | Number | No | >= 0 | Maximum discount cap |
| deletedAt | Date | No | Default: null | Soft delete timestamp |
| createdAt | Date | Yes | Auto-generated | Creation timestamp |
| updatedAt | Date | Yes | Auto-generated | Last update timestamp |

**Indexes:**
- Primary: `_id`
- Unique: `code` (partial index where deletedAt is null)

**Business Rules:**
- Promotions can target specific categories or items
- Soft delete implemented via `deletedAt` field
- Unique code constraint only applies to non-deleted promotions

---

### Vouchers

Stores voucher discount codes applicable to entire orders.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| _id | ObjectId | Yes | Auto-generated | Unique identifier |
| code | String | Yes | Uppercase, Trimmed | Voucher code |
| type | String | Yes | Enum: 'percentage', 'fixed' | Discount type |
| value | Number | Yes | >= 0 | Discount value (% or fixed amount) |
| expiresAt | Date | Yes | - | Expiration date |
| usageLimit | Number | Yes | >= 1 | Maximum number of uses |
| uses | Number | No | >= 0, Default: 0 | Current usage count |
| minOrderValue | Number | No | >= 0 | Minimum order value required |
| maxDiscountAmount | Number | No | >= 0 | Maximum discount cap |
| deletedAt | Date | No | Default: null | Soft delete timestamp |
| createdAt | Date | Yes | Auto-generated | Creation timestamp |
| updatedAt | Date | Yes | Auto-generated | Last update timestamp |

**Indexes:**
- Primary: `_id`
- Unique: `code` (partial index where deletedAt is null)

**Business Rules:**
- Vouchers apply to entire order (no category/item restrictions)
- Soft delete implemented via `deletedAt` field
- Unique code constraint only applies to non-deleted vouchers

---

## Relationships

```
Products (1) ----< (N) Order Items
Orders (1) ----< (N) Order Items
Promotions (0..1) ----< (N) Orders (via applied.code)
Vouchers (0..1) ----< (N) Orders (via applied.code)
Promotions (N) ----< (N) Products (via eligibleItems)
```

## Notes

- All collections use MongoDB's automatic `_id` field as primary key
- Timestamps (`createdAt`, `updatedAt`) are automatically managed by Mongoose
- Soft deletes are implemented for Promotions and Vouchers using `deletedAt` field
- Discount codes (promotions and vouchers) are stored in uppercase
- Both percentage and fixed discount types are supported
