/**
 * auth.ts — JWT Authentication Utilities
 * ========================================
 * Handles token storage, retrieval, validation, session timeout,
 * and password strength checks for the KSPG Kaizen system.
 */

// ─── Storage Keys ─────────────────────────────────────────────────────────────
const ACCESS_TOKEN_KEY = 'kspg_access_token';
const REFRESH_TOKEN_KEY = 'kspg_refresh_token';
const USER_DATA_KEY = 'kspg_user_data';
const LAST_ACTIVITY_KEY = 'kspg_last_activity';

// Session timeout: 60 minutes of inactivity
const SESSION_TIMEOUT_MS = 60 * 60 * 1000;

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  employee_id: string;
  department: string;
  designation: string;
  plant: string;
  role_name?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

// ─── Token Management ─────────────────────────────────────────────────────────

export function saveTokens(tokens: AuthTokens): void {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
  sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
  updateLastActivity();
}

export function saveUser(user: AuthUser): void {
  sessionStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
}

export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  const raw = sessionStorage.getItem(USER_DATA_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(USER_DATA_KEY);
  sessionStorage.removeItem(LAST_ACTIVITY_KEY);
}

// ─── Session Timeout ───────────────────────────────────────────────────────────

export function updateLastActivity(): void {
  sessionStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

export function isSessionExpired(): boolean {
  const last = sessionStorage.getItem(LAST_ACTIVITY_KEY);
  if (!last) return true;
  return Date.now() - parseInt(last, 10) > SESSION_TIMEOUT_MS;
}

export function isAuthenticated(): boolean {
  const token = getAccessToken();
  if (!token) return false;
  if (isSessionExpired()) {
    clearAuth();
    return false;
  }
  return true;
}

// ─── Password Strength Validation ─────────────────────────────────────────────

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('At least 8 characters required');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('At least one uppercase letter required');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('At least one lowercase letter required');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('At least one number required');
  }
  if (!/[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('At least one special character required');
  }

  const commonPasswords = [
    'password', 'password1', '12345678', 'qwerty123', 'admin123',
    'letmein1', 'welcome1', 'monkey123', 'dragon12', 'master12'
  ];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common — choose a unique password');
  }

  return { valid: errors.length === 0, errors };
}

export function getPasswordStrengthLevel(
  password: string
): 'weak' | 'fair' | 'strong' | 'very-strong' {
  if (password.length === 0) return 'weak';
  const { errors } = validatePasswordStrength(password);
  const score = 5 - errors.length;
  if (score <= 1) return 'weak';
  if (score === 2) return 'fair';
  if (score === 3 || score === 4) return 'strong';
  return 'very-strong';
}

// ─── Username Sanitisation ─────────────────────────────────────────────────────

export function sanitiseUsername(raw: string): string {
  return raw.trim().replace(/\s+/g, '');
}

// ─── Fetch with Auth Header ────────────────────────────────────────────────────

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  updateLastActivity();

  // credentials: 'include' is required so the browser sends the HttpOnly
  // kspg_sid cookie alongside every API request
  return fetch(url, { ...options, headers, credentials: 'include' });
}

// ─── Logout ───────────────────────────────────────────────────────────────────

/**
 * Full logout:
 * 1. POST /api/v1/auth/logout/ with refresh token → backend deletes Redis session
 *    + blacklists JWT + clears kspg_sid cookie via Set-Cookie header
 * 2. Clear all sessionStorage tokens locally
 */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();

  try {
    await fetch('/api/v1/auth/logout/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',           // sends + receives kspg_sid cookie
      body: JSON.stringify({ refresh: refreshToken || '' }),
    });
  } catch {
    // Network error — clear local tokens anyway
  }

  clearAuth();
}
