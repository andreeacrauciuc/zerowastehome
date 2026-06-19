import { describe, it, expect, beforeEach } from 'vitest';
import {
  CURRENT_USER_KEY,
  normalizeEmail,
  createFlowError,
  validateSignupPayload,
  validateLoginPayload,
  readJson,
  persistProfile,
  clearPersistedProfile,
  buildProfile,
} from '../services/authService';
import {
  normalizeCode,
  isPermissionDeniedError,
  createMemberPayload,
} from '../../household/householdService';
import { createMockAuthUser } from '../../../test/test-utils';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('authService — email normalization', () => {
  it('trims surrounding whitespace and lowercases', () => {
    expect(normalizeEmail('  Test@Example.COM  ')).toBe('test@example.com');
  });

  it('coerces null/undefined to an empty string instead of throwing', () => {
    expect(normalizeEmail(undefined)).toBe('');
    expect(normalizeEmail(null)).toBe('');
  });
});

describe('authService — createFlowError', () => {
  it('produces a real Error carrying the given code', () => {
    const err = createFlowError('boom', 'AUTH_X');
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('boom');
    expect(err.code).toBe('AUTH_X');
  });
});

describe('authService — validateSignupPayload (real signup validation)', () => {
  const valid = { fullName: 'Ada Lovelace', email: 'Ada@Example.com', password: 'secret1' };

  it('returns the normalized email for a valid payload', () => {
    expect(validateSignupPayload(valid)).toBe('ada@example.com');
  });

  it('rejects a missing/blank full name', () => {
    expect(() => validateSignupPayload({ ...valid, fullName: '   ' }))
      .toThrowError(/full name is required/i);
    try {
      validateSignupPayload({ ...valid, fullName: '' });
    } catch (e) {
      expect(e.code).toBe('AUTH_VALIDATION_FAILED');
    }
  });

  it('rejects an invalid email with the firebase-style code', () => {
    try {
      validateSignupPayload({ ...valid, email: 'not-an-email' });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e.code).toBe('auth/invalid-email');
    }
  });

  it('rejects a password shorter than 6 characters', () => {
    try {
      validateSignupPayload({ ...valid, password: '123' });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e.code).toBe('auth/weak-password');
    }
  });

  it('accepts a password of exactly 6 characters (boundary)', () => {
    expect(validateSignupPayload({ ...valid, password: '123456' })).toBe('ada@example.com');
  });

  it('throws (not silently passes) when called with no arguments', () => {
    expect(() => validateSignupPayload()).toThrow();
  });
});

describe('authService — validateLoginPayload (real login validation)', () => {
  it('returns the normalized email for valid credentials', () => {
    expect(validateLoginPayload({ email: '  USER@Mail.com ', password: 'hunter2' }))
      .toBe('user@mail.com');
  });

  it('rejects an invalid email', () => {
    try {
      validateLoginPayload({ email: 'bad', password: 'hunter2' });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e.code).toBe('auth/invalid-email');
    }
  });

  it('rejects a too-short password', () => {
    try {
      validateLoginPayload({ email: 'user@mail.com', password: 'no' });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e.code).toBe('auth/weak-password');
    }
  });
});

describe('authService — buildProfile (real profile shaping from a Firebase user)', () => {
  it('shapes a profile from the Firebase user when no Firestore data exists', () => {
    const fbUser = createMockAuthUser({ uid: 'u1', email: 'Person@Example.com', displayName: 'Person' });
    const profile = buildProfile(fbUser);

    expect(profile.uid).toBe('u1');
    expect(profile.ownerId).toBe('u1'); 
    expect(profile.fullName).toBe('Person');
    expect(profile.email).toBe('person@example.com'); 
    expect(profile.householdId).toBeNull();
    expect(profile.photoDataUrl).toBe('');
  });

  it('prefers stored Firestore userData over the Firebase user fields', () => {
    const fbUser = createMockAuthUser({ uid: 'u2', email: 'old@example.com', displayName: 'Old' });
    const profile = buildProfile(fbUser, {
      fullName: 'Stored Name',
      email: 'stored@example.com',
      householdId: 'house-9',
    });

    expect(profile.fullName).toBe('Stored Name');
    expect(profile.email).toBe('stored@example.com');
    expect(profile.householdId).toBe('house-9');
  });

  it('falls back to the provided fallbackEmail when both sources lack an email', () => {
    const fbUser = createMockAuthUser({ uid: 'u3', email: null, displayName: '' });
    const profile = buildProfile(fbUser, {}, 'Fallback@Example.com');
    expect(profile.email).toBe('fallback@example.com');
  });
});

describe('authService — session persistence (real read/write/clear)', () => {
  it('persists a profile and reads it back, but never stores photoDataUrl', () => {
    const profile = {
      uid: 'u1',
      email: 'a@b.com',
      fullName: 'A B',
      householdId: 'h1',
      photoDataUrl: 'data:image/png;base64,VERYLONG', 
    };
    persistProfile(profile);

    const stored = readJson(CURRENT_USER_KEY, null);
    expect(stored).toMatchObject({ uid: 'u1', email: 'a@b.com', householdId: 'h1' });
    expect(stored.photoDataUrl).toBeUndefined();
  });

  it('readJson returns the fallback when nothing is stored', () => {
    expect(readJson(CURRENT_USER_KEY, 'FALLBACK')).toBe('FALLBACK');
  });

  it('readJson returns the fallback for corrupted JSON instead of throwing', () => {
    sessionStorage.setItem(CURRENT_USER_KEY, '{not valid json');
    expect(readJson(CURRENT_USER_KEY, null)).toBeNull();
  });

  it('clearPersistedProfile removes the stored session', () => {
    persistProfile({ uid: 'u1', email: 'a@b.com' });
    expect(readJson(CURRENT_USER_KEY, null)).not.toBeNull();
    clearPersistedProfile();
    expect(readJson(CURRENT_USER_KEY, null)).toBeNull();
  });

  it('persists to localStorage so the cache survives a new tab/session', () => {
    persistProfile({ uid: 'u1', email: 'a@b.com', fullName: 'A B' });

    expect(localStorage.getItem(CURRENT_USER_KEY)).not.toBeNull();
    sessionStorage.clear();
    expect(readJson(CURRENT_USER_KEY, null)).toMatchObject({ uid: 'u1', email: 'a@b.com' });
  });

  it('migrates a legacy sessionStorage profile into localStorage on first read', () => {
    localStorage.clear();
    sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify({ uid: 'legacy', email: 'old@x.com' }));

    const migrated = readJson(CURRENT_USER_KEY, null);
    expect(migrated).toMatchObject({ uid: 'legacy', email: 'old@x.com' });
    expect(localStorage.getItem(CURRENT_USER_KEY)).not.toBeNull();
    expect(sessionStorage.getItem(CURRENT_USER_KEY)).toBeNull();
  });
});

describe('householdService — join-code & membership helpers (real logic)', () => {
  it('normalizeCode trims and uppercases', () => {
    expect(normalizeCode('  abc123 ')).toBe('ABC123');
    expect(normalizeCode(null)).toBe('');
  });

  it('isPermissionDeniedError detects the Firestore permission-denied code', () => {
    expect(isPermissionDeniedError({ code: 'permission-denied' })).toBe(true);
  });

  it('isPermissionDeniedError detects the message-based variant', () => {
    expect(isPermissionDeniedError({ message: 'Missing or insufficient permissions.' })).toBe(true);
  });

  it('isPermissionDeniedError returns false for unrelated errors', () => {
    expect(isPermissionDeniedError({ code: 'not-found' })).toBe(false);
    expect(isPermissionDeniedError(null)).toBe(false);
  });

  it('createMemberPayload builds a member record with the requested role', () => {
    const profile = { uid: 'u7', fullName: 'Mara', email: 'Mara@Example.com' };
    const member = createMemberPayload(profile, 'member');

    expect(member).toMatchObject({ uid: 'u7', fullName: 'Mara', email: 'Mara@Example.com', role: 'member' });
    expect(typeof member.joinedAt).toBe('string');
    expect(Number.isNaN(Date.parse(member.joinedAt))).toBe(false);
  });

  it('createMemberPayload defaults the role to "member"', () => {
    expect(createMemberPayload({ uid: 'u8' }).role).toBe('member');
  });

  it('createMemberPayload tolerates a sparse profile without throwing', () => {
    const member = createMemberPayload({ uid: 'u9' }, 'owner');
    expect(member.uid).toBe('u9');
    expect(member.fullName).toBe('');
    expect(member.email).toBe('');
    expect(member.role).toBe('owner');
  });
});
