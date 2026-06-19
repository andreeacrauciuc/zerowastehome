import { describe, it, expect } from 'vitest';
import { convertUnit } from './formatters';

describe('Utility Functions - Formatters', () => {
  describe('convertUnit', () => {
    it('should convert grams to kilograms', () => {
      const result = convertUnit(1000, 'g');
      expect(result).toBeDefined();
      expect(result?.unit).toBe('kg');
      expect(result?.value).toBe(1);
    });

    it('should handle grams below 1000', () => {
      const result = convertUnit(500, 'g');
      expect(result?.unit).toBe('g');
      expect(result?.value).toBe(500);
    });

    it('should return null for unsupported units', () => {
      const result = convertUnit(500, 'ml');
      expect(result).toBeNull();
    });

    it('should return null for invalid amounts', () => {
      const result = convertUnit('invalid', 'g');
      expect(result).toBeNull();
    });

    it('should return null for negative values', () => {
      const result = convertUnit(-100, 'g');
      expect(result).toBeNull();
    });

    it('should handle null/undefined gracefully', () => {
      expect(convertUnit(null, 'g')).toEqual({ value: 0, unit: 'g', label: '0 g' });
      expect(convertUnit(undefined, 'ml')).toBeNull();
    });

    it('should handle zero value', () => {
      const result = convertUnit(0, 'g');
      expect(result).toBeDefined();
    });

    it('should handle large amounts', () => {
      const result = convertUnit(5000, 'g');
      expect(result?.value).toBe(5);
      expect(result?.unit).toBe('kg');
    });

    it('should handle decimal values', () => {
      const result = convertUnit(250.5, 'g');
      expect(result).toBeDefined();
    });

    it('should normalize unit names (lowercase)', () => {
      const result1 = convertUnit(1000, 'G');
      const result2 = convertUnit(1000, 'g');
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });
});
