const Order = require('../models/order.model');
const Product = require('../models/product.model');
const voucherService = require('./voucher.service');
const promotionService = require('./promotion.service');

class OrderService {
  async enrichItemsWithProductData(items) {
    const enrichedItems = [];
    
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found`);
      }
      if (!product.inStock) {
        throw new Error(`Product ${product.name} is out of stock`);
      }
      
      enrichedItems.push({
        productId: product._id,
        category: product.category,
        price: product.price,
        qty: item.qty
      });
    }
    
    return enrichedItems;
  }

  calculateSubTotal(items) {
    return items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  }

  calculateEligibleAmount(items, promotion) {
    return items
      .filter(item => {
        const categoryMatch = promotion.eligibleCategories.length === 0 || 
          promotion.eligibleCategories.includes(item.category);
        const itemMatch = promotion.eligibleItems.length === 0 || 
          promotion.eligibleItems.some(id => id.toString() === item.productId.toString());
        return categoryMatch || itemMatch;
      })
      .reduce((sum, item) => sum + (item.price * item.qty), 0);
  }

  calculateDiscount(type, value, eligibleAmount, maxDiscountAmount) {
    if (type === 'percentage') {
      const percentDiscount = eligibleAmount * (value / 100);
      if (maxDiscountAmount && maxDiscountAmount > 0) {
        return Math.min(percentDiscount, maxDiscountAmount);
      }
      return percentDiscount;
    }
    return Math.min(value, eligibleAmount);
  }

  applyDiscountToItems(items, totalDiscount, eligibleAmount, promotion = null) {
    const discountedItems = items.map(item => {
      const itemTotal = item.price * item.qty;
      let itemDiscount = 0;

      let isEligible = true;
      if (promotion) {
        const categoryMatch = promotion.eligibleCategories.length === 0 || 
          promotion.eligibleCategories.includes(item.category);
        const itemMatch = promotion.eligibleItems.length === 0 || 
          promotion.eligibleItems.some(id => id.toString() === item.productId.toString());
        isEligible = categoryMatch || itemMatch;
      }

      if (isEligible && eligibleAmount > 0) {
        const itemProportion = itemTotal / eligibleAmount;
        itemDiscount = totalDiscount * itemProportion;
      }

      const discountedPrice = Math.max(0, itemTotal - itemDiscount);

      return {
        ...item,
        actualPrice: Math.round(itemTotal * 100) / 100,
        discountedPrice: Math.round(discountedPrice * 100) / 100,
        discountAmount: Math.round(itemDiscount * 100) / 100
      };
    });

    return discountedItems;
  }

  async calculateOrder(data) {
    const { items, code } = data;
    
    // Enrich items with product data from database
    const enrichedItems = await this.enrichItemsWithProductData(items);
    const subTotal = this.calculateSubTotal(enrichedItems);
    
    let totalDiscount = 0;
    let discountedItems = [];
    let appliedCode = null;
    let discountType = null;
    let eligibleAmount = subTotal;

    // If code provided, check promotions first, then vouchers
    if (code) {
      // Try promotion first
      const promotion = await promotionService.findByCode(code);
      
      if (promotion) {
        // Validate promotion
        if (new Date() > promotion.expiresAt) {
          throw new Error('Promotion has expired');
        }
        if (promotion.uses >= promotion.usageLimit) {
          throw new Error('Promotion usage limit reached');
        }
        if (promotion.minOrderValue && subTotal < promotion.minOrderValue) {
          throw new Error(`Minimum order value of ${promotion.minOrderValue} not met for promotion`);
        }

        eligibleAmount = this.calculateEligibleAmount(enrichedItems, promotion);
        if (eligibleAmount === 0) {
          throw new Error('No eligible items for this promotion');
        }

        totalDiscount = this.calculateDiscount(
          promotion.type, 
          promotion.value, 
          eligibleAmount, 
          promotion.maxDiscountAmount
        );
        
        appliedCode = code;
        discountType = 'promotion';
        discountedItems = this.applyDiscountToItems(enrichedItems, totalDiscount, eligibleAmount, promotion);
      } else {
        // Try voucher
        const voucher = await voucherService.findByCode(code);
        
        if (voucher) {
          // Validate voucher
          if (new Date() > voucher.expiresAt) {
            throw new Error('Voucher has expired');
          }
          if (voucher.uses >= voucher.usageLimit) {
            throw new Error('Voucher usage limit reached');
          }
          if (voucher.minOrderValue && subTotal < voucher.minOrderValue) {
            throw new Error(`Minimum order value of ${voucher.minOrderValue} not met for voucher`);
          }

          totalDiscount = this.calculateDiscount(
            voucher.type, 
            voucher.value, 
            subTotal, 
            voucher.maxDiscountAmount
          );
          
          appliedCode = code;
          discountType = 'voucher';
          discountedItems = this.applyDiscountToItems(enrichedItems, totalDiscount, subTotal);
        }
      }
    }

    // Cap total discount at 50% of subtotal
    const maxDiscount = subTotal * 0.5;
    if (totalDiscount > maxDiscount) {
      totalDiscount = maxDiscount;
      discountedItems = this.applyDiscountToItems(enrichedItems, totalDiscount, eligibleAmount, discountType === 'promotion' ? await promotionService.findByCode(code) : null);
    }

    // If no discount applied, return items with no discount
    if (!appliedCode) {
      discountedItems = enrichedItems.map(item => ({
        ...item,
        actualPrice: Math.round(item.price * item.qty * 100) / 100,
        discountedPrice: Math.round(item.price * item.qty * 100) / 100,
        discountAmount: 0
      }));
    }

    const finalTotal = Math.max(0, subTotal - totalDiscount);

    return {
      items: discountedItems,
      subTotal: Math.round(subTotal * 100) / 100,
      discount: appliedCode ? {
        code: appliedCode,
        type: discountType,
        amount: Math.round(totalDiscount * 100) / 100
      } : null,
      finalTotal: Math.round(finalTotal * 100) / 100
    };
  }

  async createOrder(data) {
    const { items, code } = data;
    
    // Enrich items with product data from database
    const enrichedItems = await this.enrichItemsWithProductData(items);
    const subTotal = this.calculateSubTotal(enrichedItems);
    
    let totalDiscount = 0;
    let appliedCode = null;
    let discountType = null;
    let eligibleAmount = subTotal;
    let discountEntity = null;

    // If code provided, check promotions first, then vouchers
    if (code) {
      // Try promotion first
      const promotion = await promotionService.findByCode(code);
      
      if (promotion) {
        // Validate promotion
        if (new Date() > promotion.expiresAt) {
          throw new Error('Promotion has expired');
        }
        if (promotion.uses >= promotion.usageLimit) {
          throw new Error('Promotion usage limit reached');
        }
        if (promotion.minOrderValue && subTotal < promotion.minOrderValue) {
          throw new Error(`Minimum order value of ${promotion.minOrderValue} not met for promotion`);
        }

        eligibleAmount = this.calculateEligibleAmount(enrichedItems, promotion);
        if (eligibleAmount === 0) {
          throw new Error('No eligible items for this promotion');
        }

        totalDiscount = this.calculateDiscount(
          promotion.type, 
          promotion.value, 
          eligibleAmount, 
          promotion.maxDiscountAmount
        );
        
        appliedCode = code;
        discountType = 'promotion';
        discountEntity = { id: promotion._id, currentUses: promotion.uses };
      } else {
        // Try voucher
        const voucher = await voucherService.findByCode(code);
        
        if (voucher) {
          // Validate voucher
          if (new Date() > voucher.expiresAt) {
            throw new Error('Voucher has expired');
          }
          if (voucher.uses >= voucher.usageLimit) {
            throw new Error('Voucher usage limit reached');
          }
          if (voucher.minOrderValue && subTotal < voucher.minOrderValue) {
            throw new Error(`Minimum order value of ${voucher.minOrderValue} not met for voucher`);
          }

          totalDiscount = this.calculateDiscount(
            voucher.type, 
            voucher.value, 
            subTotal, 
            voucher.maxDiscountAmount
          );
          
          appliedCode = code;
          discountType = 'voucher';
          discountEntity = { id: voucher._id, currentUses: voucher.uses };
        }
      }
    }

    // Cap total discount at 50% of subtotal
    const maxDiscount = subTotal * 0.5;
    if (totalDiscount > maxDiscount) {
      totalDiscount = maxDiscount;
    }

    // Atomically increment usage count if discount applied
    if (discountEntity) {
      let updated;
      if (discountType === 'voucher') {
        updated = await voucherService.incrementUse(
          discountEntity.id,
          discountEntity.currentUses,
          discountEntity.currentUses + 1
        );
      } else {
        updated = await promotionService.incrementUse(
          discountEntity.id,
          discountEntity.currentUses,
          discountEntity.currentUses + 1
        );
      }

      if (!updated) {
        throw new Error(`${discountType} usage limit reached due to concurrent usage`);
      }
    }

    const finalTotal = Math.max(0, subTotal - totalDiscount);

    const order = new Order({
      items: enrichedItems,
      subTotal: Math.round(subTotal * 100) / 100,
      applied: {
        code: appliedCode,
        discountType: discountType,
        discountAmount: Math.round(totalDiscount * 100) / 100
      },
      finalTotal: Math.round(finalTotal * 100) / 100
    });
    
    return await order.save();
  }
}

module.exports = new OrderService();
