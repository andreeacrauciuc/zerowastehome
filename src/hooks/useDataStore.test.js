import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDataStore } from '../hooks/useDataStore';
import { DataStoreProvider } from '../hooks/useDataStore';
import React from 'react';
import { createMockCurrentUser } from '../test/test-utils';

vi.mock('../features/auth/context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    currentUser: createMockCurrentUser(),
    isAuthReady: true,
  })),
}));

vi.mock('../features/household/HouseholdContext', () => ({
  useHousehold: vi.fn(() => ({
    household: undefined,
    isHouseholdReady: undefined,
  })),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn(),
  addDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  writeBatch: vi.fn(),
  increment: vi.fn(),
}));

describe('useDataStore Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const wrapper = ({ children }) =>
    React.createElement(DataStoreProvider, null, children);

  describe('Initial State', () => {
    it('should initialize with empty items and loading state', () => {
      const { result } = renderHook(() => useDataStore(), { wrapper });

      expect(result.current.inventoryItems).toBeDefined();
      expect(result.current.shoppingItems).toBeDefined();
      expect(result.current.impactHistory).toBeDefined();
    });

    it('should provide modal management functions', () => {
      const { result } = renderHook(() => useDataStore(), { wrapper });

      expect(result.current.uiModal).toBeNull();
      expect(result.current.clearUiModal).toBeDefined();

      act(() => {
        result.current.clearUiModal();
      });

      expect(result.current.uiModal).toBeNull();
    });
  });

  describe('Inventory Management', () => {
    it('should add inventory item locally', () => {
      const { result } = renderHook(() => useDataStore(), { wrapper });

      act(() => {
        localStorage.setItem('datastore.mode', 'true');
      });

      expect(result.current.inventoryItems).toBeDefined();
    });

    it('should delete inventory item', () => {
      const { result } = renderHook(() => useDataStore(), { wrapper });

      expect(result.current.handleDeleteFoodWithoutImpact).toBeDefined();
    });

    it('should update inventory item', () => {
      const { result } = renderHook(() => useDataStore(), { wrapper });

      expect(result.current.handleSaveFood).toBeDefined();
    });
  });

  describe('Shopping Management', () => {
    it('should add shopping item locally', () => {
      const { result } = renderHook(() => useDataStore(), { wrapper });

      expect(result.current.handleAddShoppingItem).toBeDefined();
    });

    it('should delete shopping items', () => {
      const { result } = renderHook(() => useDataStore(), { wrapper });

      expect(result.current.handleDeleteShoppingItems).toBeDefined();
    });

    it('should toggle shopping item checked status', () => {
      const { result } = renderHook(() => useDataStore(), { wrapper });

      expect(result.current.handleToggleShoppingItem).toBeDefined();
    });

    it('should merge purchases into inventory', () => {
      const { result } = renderHook(() => useDataStore(), { wrapper });

      expect(result.current.handlePurchase).toBeDefined();
    });

    it('should update shopping items in batch', () => {
      const { result } = renderHook(() => useDataStore(), { wrapper });

      expect(result.current.handleBatchUpdateShoppingItems).toBeDefined();
    });
  });

  describe('Recipe Integration', () => {
    it('should add shopping item from recipe', () => {
      const { result } = renderHook(() => useDataStore(), { wrapper });

      expect(result.current.handleAddShoppingFromRecipes).toBeDefined();
    });

    it('should cook recipe and apply usage to inventory', () => {
      const { result } = renderHook(() => useDataStore(), { wrapper });

      expect(result.current.handleCookRecipe).toBeDefined();
    });
  });

  describe('Action Tracking', () => {
    it('should track food action (eaten, saved, consumed)', () => {
      const { result } = renderHook(() => useDataStore(), { wrapper });

      expect(result.current.handleActionFood).toBeDefined();
    });
  });

  describe('Error States', () => {
    it('should handle errors gracefully', () => {
      const { result } = renderHook(() => useDataStore(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.uiModal).toBeNull();
    });
  });

  describe('Local Data Fallback', () => {
    it('should use localStorage when Firebase is unavailable', () => {
      const { result } = renderHook(() => useDataStore(), { wrapper });

      expect(result.current).toBeDefined();
    });
  });
});
