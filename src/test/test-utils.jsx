import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { vi } from 'vitest';

/**
 * @param {React.ReactElement} ui
 * @param {Object} options 
 * @returns {Object} 
 */
export function render(ui, { route = '/', ...renderOptions } = {}) {
  window.history.pushState({}, 'Test page', route);

  return rtlRender(ui, { ...renderOptions });
}

/**
 * @param {Object} data 
 * @param {string} id 
 * @returns {Object} 
 */
export function createMockFirestoreSnapshot(data, id = 'mock-id') {
  return {
    id,
    data: () => data,
    exists: () => true,
    get: (field) => data[field],
  };
}

/**
 * @param {Array<Object>} docs 
 * @returns {Object} 
 */
export function createMockQuerySnapshot(docs = []) {
  return {
    docs: docs.map((data, idx) =>
      createMockFirestoreSnapshot(data, data.id || `doc-${idx}`)
    ),
    empty: docs.length === 0,
    size: docs.length,
  };
}

/**
 * @param {Object} overrides 
 * @returns {Object}
 */
export function createMockAuthUser(overrides = {}) {
  return {
    uid: 'test-uid-123',
    email: 'test@example.com',
    emailVerified: true,
    displayName: 'Test User',
    photoURL: null,
    isAnonymous: false,
    metadata: {
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString(),
    },
    ...overrides,
  };
}

/**
 * @param {Object} overrides 
 * @returns {Object} 
 */
export function createMockCurrentUser(overrides = {}) {
  return {
    uid: 'test-uid-123',
    email: 'test@example.com',
    fullName: 'Test User',
    photoDataUrl: null,
    householdId: 'household-123',
    ...overrides,
  };
}

/**
 * @param {Object} overrides
 * @returns {Object} 
 */
export function createMockHousehold(overrides = {}) {
  return {
    id: 'household-123',
    name: 'Test Household',
    ownerId: 'test-uid-123',
    joinCode: 'ABC123XYZ',
    members: [
      {
        uid: 'test-uid-123',
        email: 'test@example.com',
        role: 'owner',
      },
    ],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * @param {Object} overrides 
 * @returns {Object}
 */
export function createMockInventoryItem(overrides = {}) {
  return {
    id: 'item-123',
    name: 'Test Item',
    category: 'Vegetables',
    icon: '🥬',
    quantity: 1,
    unit: 'unit',
    price: 5.99,
    unitPrice: 5.99,
    initialQuantity: 1,
    initialInvestment: 5.99,
    investedValueLeft: 5.99,
    consumedValue: 0,
    expiry: null,
    expiryDate: null,
    createdAt: new Date().toISOString(),
    ownerId: 'test-uid-123',
    householdId: 'household-123',
    ...overrides,
  };
}

/**
 * @param {Object} overrides 
 * @returns {Object} 
 */
export function createMockShoppingItem(overrides = {}) {
  return {
    id: 'shopping-123',
    name: 'Test Product',
    quantity: 2,
    unit: 'unit',
    estimatedPrice: 3.99,
    checked: false,
    sourceType: 'manual',
    createdAt: new Date().toISOString(),
    ownerId: 'test-uid-123',
    householdId: 'household-123',
    ...overrides,
  };
}

/**
 * @param {Object} overrides 
 * @returns {Object}
 */
export function createMockImpactEntry(overrides = {}) {
  return {
    id: 'impact-123',
    name: 'Test Item',
    quantity: 1,
    unit: 'unit',
    price: 5.99,
    status: 'eaten',
    actionDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ownerId: 'test-uid-123',
    householdId: 'household-123',
    isPriceEstimated: false,
    ...overrides,
  };
}

/**
 * @param {Array<Object>} docs 
 * @returns {Function} 
 */
export function mockOnSnapshot(docs = []) {
  return vi.fn((query, onNext) => {
    const snapshot = createMockQuerySnapshot(docs);
    onNext(snapshot);
    return vi.fn();
  });
}

/**
 * @param {Function} callback 
 * @param {Object} options 
 * @returns {Promise<any>} 
 */
export function waitForCallback(callback, options = {}) {
  const { timeout = 1000 } = options;
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Callback was not called within timeout'));
    }, timeout);

    callback((arg) => {
      clearTimeout(timeoutId);
      resolve(arg);
    });
  });
}

export { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
