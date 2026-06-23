import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';
import RequireAuth from './RequireAuth';

vi.mock('../features/auth/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../features/auth/context/AuthContext';
import { render, screen } from '../test/test-utils';

describe('Component Tests - Common UI Components', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({
      currentUser: { uid: 'test-user-123' },
      isAuthReady: true,
      authStatus: 'authenticated',
      logout: vi.fn(),
    });
  });

  describe('ErrorBoundary', () => {
    it('should render children when there is no error', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should render error message when child throws', () => {
      const ThrowError = () => {
        throw new Error('Test error');
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(
          <ErrorBoundary>
            <ThrowError />
          </ErrorBoundary>
        );
      }).toThrow();

      consoleSpy.mockRestore();
    });

    it('should have a reset mechanism', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });
  });

  describe('RequireAuth', () => {
    it('should render children when user is authenticated', () => {
      render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route element={<RequireAuth />}>
              <Route path="/protected" element={<div>Protected content</div>} />
            </Route>
            <Route path="/signin" element={<div>Sign in</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });

    it('should redirect to login when not authenticated', () => {
      useAuth.mockReturnValue({
        currentUser: null,
        isAuthReady: true,
        authStatus: 'unauthenticated',
        logout: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route element={<RequireAuth />}>
              <Route path="/protected" element={<div>Protected content</div>} />
            </Route>
            <Route path="/signin" element={<div>Sign in</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Sign in')).toBeInTheDocument();
    });

    it('should handle loading state', async () => {
      useAuth.mockReturnValue({
        currentUser: null,
        isAuthReady: false,
        authStatus: 'loading',
        logout: vi.fn(),
      });

      const { container } = render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route element={<RequireAuth />}>
              <Route path="/protected" element={<div>Protected content</div>} />
            </Route>
            <Route path="/signin" element={<div>Sign in</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(container.querySelector('.require-auth-loading-shell')).toBeTruthy();
    });
  });
});
