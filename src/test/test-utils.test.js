import { describe, it, expect } from 'vitest';
import {
  createMockInventoryItem,
  createMockShoppingItem,
  createMockCurrentUser,
  createMockAuthUser,
  createMockHousehold,
} from '../test/test-utils';

describe('Test Utilities & Factories', () => {
  describe('Inventory Item Factory', () => {
    it('should create a mock inventory item with defaults', () => {
      const item = createMockInventoryItem();

      expect(item).toBeDefined();
      expect(item.id).toBe('item-123');
      expect(item.name).toBe('Test Item');
      expect(item.category).toBe('Vegetables');
      expect(item.quantity).toBe(1);
      expect(item.price).toBe(5.99);
    });

    it('should override default properties', () => {
      const item = createMockInventoryItem({
        name: 'Custom Item',
        quantity: 10,
        price: 25.50,
      });

      expect(item.name).toBe('Custom Item');
      expect(item.quantity).toBe(10);
      expect(item.price).toBe(25.50);
      expect(item.id).toBe('item-123'); 
    });

    it('should include all required fields', () => {
      const item = createMockInventoryItem();

      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('category');
      expect(item).toHaveProperty('quantity');
      expect(item).toHaveProperty('unit');
      expect(item).toHaveProperty('price');
      expect(item).toHaveProperty('unitPrice');
      expect(item).toHaveProperty('createdAt');
      expect(item).toHaveProperty('ownerId');
      expect(item).toHaveProperty('householdId');
    });

    it('should have valid data types', () => {
      const item = createMockInventoryItem();

      expect(typeof item.id).toBe('string');
      expect(typeof item.name).toBe('string');
      expect(typeof item.quantity).toBe('number');
      expect(typeof item.price).toBe('number');
    });
  });

  describe('Shopping Item Factory', () => {
    it('should create a mock shopping item with defaults', () => {
      const item = createMockShoppingItem();

      expect(item.id).toBe('shopping-123');
      expect(item.name).toBe('Test Product');
      expect(item.quantity).toBe(2);
      expect(item.checked).toBe(false);
    });

    it('should override properties', () => {
      const item = createMockShoppingItem({
        name: 'Milk',
        quantity: 1,
        checked: true,
      });

      expect(item.name).toBe('Milk');
      expect(item.quantity).toBe(1);
      expect(item.checked).toBe(true);
    });
  });

  describe('User Factory', () => {
    it('should create a mock auth user', () => {
      const user = createMockAuthUser();

      expect(user.uid).toBe('test-uid-123');
      expect(user.email).toBe('test@example.com');
      expect(user.emailVerified).toBe(true);
    });

    it('should create a mock current user', () => {
      const user = createMockCurrentUser();

      expect(user.uid).toBe('test-uid-123');
      expect(user.email).toBe('test@example.com');
      expect(user.householdId).toBe('household-123');
    });

    it('should customize auth user properties', () => {
      const user = createMockAuthUser({
        email: 'custom@example.com',
        displayName: 'Custom User',
      });

      expect(user.email).toBe('custom@example.com');
      expect(user.displayName).toBe('Custom User');
    });

    it('should customize current user properties', () => {
      const user = createMockCurrentUser({
        fullName: 'John Doe',
        householdId: 'custom-id',
      });

      expect(user.fullName).toBe('John Doe');
      expect(user.householdId).toBe('custom-id');
    });
  });

  describe('Household Factory', () => {
    it('should create a mock household', () => {
      const household = createMockHousehold();

      expect(household.id).toBe('household-123');
      expect(household.name).toBe('Test Household');
      expect(household.ownerId).toBe('test-uid-123');
      expect(household.joinCode).toMatch(/^[A-Z0-9]+$/);
    });

    it('should have members array', () => {
      const household = createMockHousehold();

      expect(Array.isArray(household.members)).toBe(true);
      expect(household.members.length).toBeGreaterThan(0);
    });

    it('should customize household properties', () => {
      const household = createMockHousehold({
        name: 'My Family',
        members: [
          { uid: 'user-1', email: 'user1@example.com', role: 'owner' },
          { uid: 'user-2', email: 'user2@example.com', role: 'member' },
        ],
      });

      expect(household.name).toBe('My Family');
      expect(household.members).toHaveLength(2);
    });
  });

  describe('Factory Data Consistency', () => {
    it('should use consistent IDs across multiple creations', () => {
      const item1 = createMockInventoryItem();
      const item2 = createMockInventoryItem();

      expect(item1.id).toBe('item-123');
      expect(item2.id).toBe('item-123');
    });

    it('should allow creating items with same name', () => {
      const item1 = createMockInventoryItem({ name: 'Apple', id: 'item-1' });
      const item2 = createMockInventoryItem({ name: 'Apple', id: 'item-2' });

      expect(item1.name).toBe(item2.name);
      expect(item1.id).not.toBe(item2.id);
    });

    it('should maintain data integrity when overriding', () => {
      const item = createMockInventoryItem({
        name: 'Custom Item',
      });

      expect(item.name).toBe('Custom Item');
      expect(item.id).toBe('item-123');
      expect(item.category).toBe('Vegetables'); 
      expect(item.quantity).toBe(1); 
    });
  });

  describe('Factory Usage Patterns', () => {
    it('should support creating multiple items for list testing', () => {
      const items = [
        createMockInventoryItem({ id: 'item-1', name: 'Apple' }),
        createMockInventoryItem({ id: 'item-2', name: 'Banana' }),
        createMockInventoryItem({ id: 'item-3', name: 'Orange' }),
      ];

      expect(items).toHaveLength(3);
      expect(items.map(i => i.name)).toEqual(['Apple', 'Banana', 'Orange']);
    });

    it('should support creating related objects', () => {
      const user = createMockCurrentUser({ uid: 'user-1' });
      const household = createMockHousehold({ ownerId: 'user-1' });

      expect(household.ownerId).toBe(user.uid);
    });

    it('should support creating deeply nested structures', () => {
      const user = createMockCurrentUser();
      const household = createMockHousehold({
        ownerId: user.uid,
        members: [
          { uid: user.uid, email: user.email, role: 'owner' },
        ],
      });
      const items = [
        createMockInventoryItem({ ownerId: user.uid, householdId: household.id }),
      ];

      expect(household.ownerId).toBe(user.uid);
      expect(items[0].ownerId).toBe(user.uid);
      expect(items[0].householdId).toBe(household.id);
    });
  });
});
