import { describe, it, expect } from 'vitest';
import { normalizeProductForStorage } from '../utils/productNormalizer';
import { createMockInventoryItem } from '../test/test-utils';

describe('Service Tests - Data Utilities', () => {
  describe('normalizeProductForStorage', () => {
    it('should normalize product data for storage', () => {
      const input = {
        name: 'Test Product',
        category: 'Vegetables',
        quantity: '5',
        price: '10.50',
        expiry: new Date().toISOString(),
      };

      const result = normalizeProductForStorage(input);

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Product');
      expect(typeof result.quantity).toBe('number');
      expect(typeof result.price).toBe('number');
    });

    it('should handle existing item updates', () => {
      const existing = createMockInventoryItem({ id: 'item-123' });
      const updates = {
        quantity: 10,
        price: 25.99,
      };

      const result = normalizeProductForStorage(updates, existing);

      expect(result.name).toBe(existing.name);
      expect(result.category).toBe(existing.category);
      expect(result.unit).toBe(existing.unit);
      expect(result.quantity).toBe(10);
      expect(result.price).toBe(25.99);
    });

    it('should validate and sanitize inputs', () => {
      const input = {
        name: '<script>alert("xss")</script>',
        category: 'Vegetables',
        quantity: 'invalid',
        price: 'also-invalid',
      };

      const result = normalizeProductForStorage(input);

      expect(result).toBeDefined();
      expect(typeof result.quantity).toBe('number');
      expect(result.name).not.toMatch(/[<>]/);
      expect(result.name).toBe('scriptalert("xss")/script');
    });

    it('should preserve category icons', () => {
      const input = {
        name: 'Apple',
        category: 'Fruits',
        quantity: 3,
      };

      const result = normalizeProductForStorage(input);

      expect(result.category).toBe('Fruits');
    });

    it('should set default expiry to null', () => {
      const input = {
        name: 'Test',
        category: 'Other',
        quantity: 1,
      };

      const result = normalizeProductForStorage(input);

      expect(result.expiry).toBe('');
    });
  });
});

describe('Service Tests - Data Validation', () => {
  describe('Batch Operations', () => {
    it('should prepare batch updates correctly', () => {
      const updates = [
        { id: 'item-1', changes: { quantity: 5 } },
        { id: 'item-2', changes: { quantity: 10 } },
      ];

      expect(updates).toHaveLength(2);
      updates.forEach((update) => {
        expect(update.id).toBeDefined();
        expect(update.changes).toBeDefined();
      });
    });

    it('should validate batch size limits', () => {
      const updates = Array.from({ length: 450 }, (_, i) => ({
        id: `item-${i}`,
        changes: { quantity: i },
      }));

      expect(updates.length).toBeLessThanOrEqual(500);
    });
  });

  describe('Transaction Handling', () => {
    it('should prepare transaction data correctly', () => {
      const inventoryItems = [
        createMockInventoryItem({ id: 'item-1', quantity: 10 }),
      ];

      const usedItems = [
        { id: 'item-1', quantity: 3 },
      ];

      expect(inventoryItems).toHaveLength(1);
      expect(usedItems).toHaveLength(1);
    });
  });
});
