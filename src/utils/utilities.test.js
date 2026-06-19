import { describe, it, expect } from 'vitest';
import {
  calculateCo2AvoidedKg,
  estimateDrivingKmEquivalent,
} from '../utils/co2';
import {
  normalizeItemName,
  buildCrossListDuplicateGuard,
} from '../utils/itemDeduplication';

describe('Utility Functions - CO2 Calculations', () => {
  describe('calculateCo2AvoidedKg', () => {
    it('should calculate CO2 avoided for food waste prevention', () => {
      const result = calculateCo2AvoidedKg(1); 
      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe('number');
    });

    it('should scale linearly with weight', () => {
      const result1 = calculateCo2AvoidedKg(1);
      const result2 = calculateCo2AvoidedKg(2);
      expect(result2).toBeGreaterThan(result1);
      expect(result2).toBeCloseTo(result1 * 2, 1);
    });

    it('should handle zero weight', () => {
      const result = calculateCo2AvoidedKg(0);
      expect(result).toBe(0);
    });

    it('should handle decimal weights', () => {
      const result = calculateCo2AvoidedKg(0.5);
      expect(result).toBeGreaterThan(0);
    });

    it('should handle large weights', () => {
      const result = calculateCo2AvoidedKg(100);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('estimateDrivingKmEquivalent', () => {
    it('should convert CO2kg to driving km equivalent', () => {
      const result = estimateDrivingKmEquivalent(10);
      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe('number');
    });

    it('should scale appropriately with CO2 amount', () => {
      const result1 = estimateDrivingKmEquivalent(10);
      const result2 = estimateDrivingKmEquivalent(20);
      expect(result2).toBeGreaterThan(result1);
    });

    it('should handle zero CO2', () => {
      const result = estimateDrivingKmEquivalent(0);
      expect(result).toBe(0);
    });

    it('should provide realistic estimates', () => {
      const result = estimateDrivingKmEquivalent(1);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThan(20);
    });
  });
});

describe('Utility Functions - Item Deduplication', () => {
  describe('normalizeItemName', () => {
    it('should create consistent keys for identical items', () => {
      const name1 = 'Tomato';
      const name2 = 'TOMATO';
      const name3 = '  Tomato  ';

      const key1 = normalizeItemName(name1);
      const key2 = normalizeItemName(name2);
      const key3 = normalizeItemName(name3);

      expect(key1).toBe(key2);
      expect(key1).toBe(key3);
    });

    it('should differentiate similar but different items', () => {
      const key1 = normalizeItemName('Tomato');
      const key2 = normalizeItemName('Cherry Tomato');

      expect(key1).not.toBe(key2);
    });

    it('should handle special characters', () => {
      const result = normalizeItemName("Tomato's");
      expect(typeof result).toBe('string');
    });
  });

  describe('buildCrossListDuplicateGuard', () => {
    it('should detect duplicates across shopping and inventory', () => {
      const inventory = [
        { id: 'inv-1', name: 'Tomato', quantity: 2 },
      ];
      const shopping = [
        { id: 'shop-1', name: 'Tomato', quantity: 1 },
      ];

      const result = buildCrossListDuplicateGuard({
        name: 'Tomato',
        shoppingItems: shopping,
        inventoryItems: inventory,
      });

      expect(result.isDuplicate).toBe(true);
    });

    it('should identify which list has the duplicate', () => {
      const inventory = [
        { id: 'inv-1', name: 'Tomato', quantity: 2 },
      ];

      const result = buildCrossListDuplicateGuard({
        name: 'Tomato',
        shoppingItems: [],
        inventoryItems: inventory,
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.source).toBe('inventory');
    });

    it('should return matched item details', () => {
      const inventory = [
        { id: 'inv-1', name: 'Tomato', quantity: 2 },
      ];

      const result = buildCrossListDuplicateGuard({
        name: 'Tomato',
        shoppingItems: [],
        inventoryItems: inventory,
      });

      expect(result.matchedItem).toBeDefined();
      expect(result.matchedItem.id).toBe('inv-1');
    });

    it('should handle case-insensitive matching', () => {
      const inventory = [
        { id: 'inv-1', name: 'TOMATO', quantity: 2 },
      ];

      const result = buildCrossListDuplicateGuard({
        name: 'tomato',
        shoppingItems: [],
        inventoryItems: inventory,
      });

      expect(result.isDuplicate).toBe(true);
    });

    it('should not flag different items as duplicates', () => {
      const inventory = [
        { id: 'inv-1', name: 'Tomato', quantity: 2 },
      ];

      const result = buildCrossListDuplicateGuard({
        name: 'Cucumber',
        shoppingItems: [],
        inventoryItems: inventory,
      });

      expect(result.isDuplicate).toBe(false);
    });

    it('should respect excludeShoppingItemId', () => {
      const shopping = [
        { id: 'shop-1', name: 'Tomato', quantity: 1 },
        { id: 'shop-2', name: 'Tomato', quantity: 2 },
      ];

      const result = buildCrossListDuplicateGuard({
        name: 'Tomato',
        shoppingItems: shopping,
        inventoryItems: [],
        excludeShoppingItemId: 'shop-1',
      });

      expect(result.isDuplicate).toBe(true);
    });
  });
});
