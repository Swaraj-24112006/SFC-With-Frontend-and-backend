import React, { useState, useEffect, useCallback } from 'react';
import {
  saveTokens,
  saveUser,
  sanitiseUsername,
  AuthUser,
} from '../utils/auth';
import ForgotPasswordModal from './ForgotPasswordModal';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser) => void;
}

type LoginState = 'idle' | 'loading' | 'success' | 'error';

// ─── Component ─────────────────────────────────────────────────────────────────

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginState, setLoginState] = useState<LoginState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [focusedField, setFocusedField] = useState<'username' | 'password' | null>(null);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  // Reset error when user starts typing again
  useEffect(() => {
    if (errorMessage) setErrorMessage('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, password]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const cleanUsername = sanitiseUsername(username);

      // ── Client-side guard ─────────────────────────────────────────
      if (!cleanUsername) {
        setErrorMessage('Please enter your username or employee ID.');
        return;
      }
      if (!password) {
        setErrorMessage('Please enter your password.');
        return;
      }
      if (password.length < 8) {
        setErrorMessage('Invalid credentials. Please check and try again.');
        return;
      }

      setLoginState('loading');
      setErrorMessage('');

      try {
        // ── Call Django SecureLoginView ────────────────────────────────────
        const res = await fetch('/api/v1/auth/login/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',   // ← required: browser must store kspg_sid HttpOnly cookie
          body: JSON.stringify({ username: cleanUsername, password }),
        });

        // Parse JSON body regardless of status
        let body: any = null;
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          body = await res.json();
        }

        if (res.ok && (body?.access || body?.data?.tokens?.access)) {
          // ── Store tokens ────────────────────────────────────────
          const tokens = body?.data?.tokens ?? body;
          saveTokens({ access: tokens.access, refresh: tokens.refresh || '' });

          // ── User is in body.data.user (new LoginView) ───────────
          let user: AuthUser | null = null;

          const rawFromLogin = body?.data?.user;
          if (rawFromLogin) {
            const rawCategory = rawFromLogin.roleCategory || rawFromLogin.role_category;
            const roleName = rawFromLogin.roleDetail?.name || rawFromLogin.role_detail?.name || rawFromLogin.roleName || rawFromLogin.role_name || '';
            
            // Map to normalized category if not explicit
            let category: 'initiator' | 'coordinator' | 'committee' | 'admin' = 'initiator';
            if (rawCategory === 'admin' || roleName === 'admin') category = 'admin';
            else if (rawCategory === 'coordinator' || roleName === 'kaizen_lead') category = 'coordinator';
            else if (rawCategory === 'committee' || roleName === 'reviewer' || roleName === 'cft_member' || roleName === 'verifier') category = 'committee';

            user = {
              id: rawFromLogin.id,
              username: rawFromLogin.username || cleanUsername,
              email: rawFromLogin.email || '',
              first_name: rawFromLogin.firstName || rawFromLogin.first_name || '',
              last_name: rawFromLogin.lastName || rawFromLogin.last_name || '',
              full_name:
                rawFromLogin.fullName ||
                rawFromLogin.full_name ||
                `${rawFromLogin.firstName || rawFromLogin.first_name || ''} ${rawFromLogin.lastName || rawFromLogin.last_name || ''}`.trim() ||
                cleanUsername,
              employee_id: rawFromLogin.employeeId || rawFromLogin.employee_id || '',
              department: rawFromLogin.department || '',
              designation: rawFromLogin.designation || '',
              plant: rawFromLogin.plant || '',
              role_name: roleName,
              role_category: category,
            };
          }

          // ── Fallback: fetch profile if user not in login body ────
          if (!user) {
            try {
              const profileRes = await fetch('/api/v1/auth/profile/', {
                headers: {
                  Authorization: `Bearer ${tokens.access}`,
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
              });
              if (profileRes.ok) {
                const profileBody = await profileRes.json();
                const rawUser = profileBody?.data ?? profileBody;
                const rawCategory = rawUser.roleCategory || rawUser.role_category;
                const roleName = rawUser.roleDetail?.name || rawUser.role_detail?.name || rawUser.roleName || rawUser.role_name || '';
                
                let category: 'initiator' | 'coordinator' | 'committee' | 'admin' = 'initiator';
                if (rawCategory === 'admin' || roleName === 'admin') category = 'admin';
                else if (rawCategory === 'coordinator' || roleName === 'kaizen_lead') category = 'coordinator';
                else if (rawCategory === 'committee' || roleName === 'reviewer' || roleName === 'cft_member' || roleName === 'verifier') category = 'committee';

                user = {
                  id: rawUser.id,
                  username: rawUser.username || cleanUsername,
                  email: rawUser.email || '',
                  first_name: rawUser.firstName || rawUser.first_name || '',
                  last_name: rawUser.lastName || rawUser.last_name || '',
                  full_name:
                    rawUser.fullName ||
                    rawUser.full_name ||
                    `${rawUser.firstName || rawUser.first_name || ''} ${rawUser.lastName || rawUser.last_name || ''}`.trim() ||
                    cleanUsername,
                  employee_id: rawUser.employeeId || rawUser.employee_id || '',
                  department: rawUser.department || '',
                  designation: rawUser.designation || '',
                  plant: rawUser.plant || '',
                  role_name: roleName,
                  role_category: category,
                };
              }
            } catch {
              // Profile fetch failed — build minimal user
            }
          }

          if (!user) {
            user = {
              id: 0,
              username: cleanUsername,
              email: '',
              first_name: '',
              last_name: '',
              full_name: cleanUsername,
              employee_id: '',
              department: '',
              designation: '',
              plant: '',
              role_name: 'initiator',
              role_category: 'initiator',
            };
          }

          saveUser(user);
          setLoginState('success');

          // Brief "Access Granted" visual before redirecting
          setTimeout(() => {
            onLoginSuccess(user!);
          }, 900);
        } else {
          // ── Generic error — never reveal which field is wrong ───
          setLoginState('error');
          setErrorMessage(
            'Invalid credentials. Please check your username and password and try again.'
          );
          setTimeout(() => setLoginState('idle'), 3000);
        }
      } catch {
        setLoginState('error');
        setErrorMessage(
          'Unable to reach the authentication server. Please try again shortly.'
        );
        setTimeout(() => setLoginState('idle'), 3000);
      }
    },
    [username, password, onLoginSuccess]
  );

  // ─── Derived UI state ───────────────────────────────────────────────────────
  const isLoading = loginState === 'loading';
  const isSuccess = loginState === 'success';
  const isError = loginState === 'error';
  const isDisabled = isLoading || isSuccess;

  return (
    <div
      className="login-page-root"
      style={{
        minHeight: '100dvh',
        background: 'radial-gradient(ellipse at 15% 15%, rgba(106,123,217,0.18) 0, transparent 55%), radial-gradient(ellipse at 85% 85%, rgba(4,217,139,0.12) 0, transparent 55%), #0b0d2c',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Hanken Grotesk', 'Inter', sans-serif",
        color: '#e1e3e4',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── Blueprint Grid Overlay ───────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.3,
        }}
      />

      {/* ── Ambient light blobs ──────────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: '-10%',
          left: '-10%',
          width: 'clamp(280px, 45vw, 650px)',
          height: 'clamp(280px, 45vw, 650px)',
          borderRadius: '50%',
          background: 'rgba(106,123,217,0.10)',
          filter: 'blur(120px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          bottom: '-10%',
          right: '-10%',
          width: 'clamp(280px, 50vw, 700px)',
          height: 'clamp(280px, 50vw, 700px)',
          borderRadius: '50%',
          background: 'rgba(4,217,139,0.08)',
          filter: 'blur(140px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <header
        style={{
          width: '100%',
          background: 'rgba(14,17,54,0.82)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.10)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'rgba(186,195,255,0.10)',
                border: '1px solid rgba(186,195,255,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
              }}
            >
              🚀
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Manrope', sans-serif",
                  fontWeight: 800,
                  fontSize: 'clamp(15px, 2.5vw, 20px)',
                  color: '#fff',
                  letterSpacing: '-0.3px',
                  lineHeight: 1.1,
                }}
              >
                KSPG <span style={{ color: '#bac3ff' }}>Cockpit</span>
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  color: 'rgba(197,197,212,0.65)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                }}
              >
                Shop Floor Management
              </div>
            </div>
          </div>

          {/* Status badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              color: 'rgba(197,197,212,0.70)',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#04D98B',
                animation: 'kspg-pulse 2.4s ease-in-out infinite',
                display: 'inline-block',
              }}
            />
            SYSTEM ONLINE
          </div>
        </div>
      </header>

      {/* ── MAIN ────────────────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(16px, 4vw, 48px)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Login Card */}
        <div
          style={{
            width: '100%',
            maxWidth: 460,
            background: 'rgba(20,26,60,0.82)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 20,
            borderTop: '4px solid #6A7BD9',
            boxShadow: '0 24px 48px -12px rgba(0,0,0,0.65), 0 0 28px rgba(106,123,217,0.15)',
            padding: 'clamp(24px, 5vw, 44px)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Card ambient accent */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 140,
              height: 140,
              background: 'rgba(106,123,217,0.10)',
              borderRadius: '0 0 0 100%',
              filter: 'blur(24px)',
              pointerEvents: 'none',
            }}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute',
              bottom: -32,
              left: -32,
              width: 112,
              height: 112,
              background: 'rgba(4,217,139,0.08)',
              borderRadius: '0 100% 0 0',
              filter: 'blur(20px)',
              pointerEvents: 'none',
            }}
          />

          {/* ── Card Header ──────────────────────────────────────── */}
          <div style={{ textAlign: 'center', marginBottom: 32, position: 'relative', zIndex: 1 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 64,
                height: 64,
                borderRadius: 18,
                background: 'rgba(12,15,46,0.90)',
                border: '1px solid rgba(255,255,255,0.14)',
                marginBottom: 18,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            >
              <span
                style={{
                  fontSize: 30,
                  animation: 'kspg-pulse 2.4s ease-in-out infinite',
                  display: 'block',
                  lineHeight: 1,
                }}
              >
                🔐
              </span>
            </div>

            <h1
              style={{
                fontFamily: "'Manrope', sans-serif",
                fontWeight: 800,
                fontSize: 'clamp(20px, 4vw, 28px)',
                color: '#fff',
                letterSpacing: '-0.4px',
                margin: '0 0 6px',
              }}
            >
              SYSTEM LOGIN
            </h1>
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: 'rgba(197,197,212,0.75)',
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                margin: 0,
              }}
            >
              Mission Control Authentication
            </p>
          </div>

          {/* ── Error Banner ─────────────────────────────────────── */}
          {(isError || errorMessage) && (
            <div
              role="alert"
              style={{
                background: 'rgba(147,0,10,0.20)',
                border: '1px solid rgba(255,180,171,0.30)',
                borderRadius: 10,
                padding: '10px 14px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                fontSize: 13,
                color: '#ffdad6',
                lineHeight: 1.45,
                animation: 'kspg-slide-in 0.25s ease',
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ── Form ─────────────────────────────────────────────── */}
          <form
            id="loginForm"
            onSubmit={handleSubmit}
            noValidate
            style={{ position: 'relative', zIndex: 1 }}
          >
            {/* Username Field */}
            <div style={{ marginBottom: 18 }}>
              <label
                htmlFor="login-username"
                style={{
                  display: 'block',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'rgba(197,197,212,0.80)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.10em',
                  marginBottom: 8,
                }}
              >
                Username / Employee ID
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 18,
                    color: focusedField === 'username' ? '#bac3ff' : 'rgba(197,197,212,0.45)',
                    transition: 'color 0.2s',
                    pointerEvents: 'none',
                    lineHeight: 1,
                  }}
                >
                  👤
                </span>
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  disabled={isDisabled}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter operator ID or username"
                  aria-label="Username or Employee ID"
                  style={{
                    width: '100%',
                    background: 'rgba(12,15,42,0.85)',
                    border: `1px solid ${
                      focusedField === 'username'
                        ? '#6A7BD9'
                        : 'rgba(255,255,255,0.13)'
                    }`,
                    borderRadius: 12,
                    padding: '12px 14px 12px 42px',
                    color: '#f1f3f5',
                    fontSize: 14,
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    outline: 'none',
                    boxSizing: 'border-box',
                    boxShadow:
                      focusedField === 'username'
                        ? '0 0 0 3px rgba(106,123,217,0.22)'
                        : 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    opacity: isDisabled ? 0.6 : 1,
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: 28 }}>
              <label
                htmlFor="login-password"
                style={{
                  display: 'block',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'rgba(197,197,212,0.80)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.10em',
                  marginBottom: 8,
                }}
              >
                Passcode
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 17,
                    color: focusedField === 'password' ? '#bac3ff' : 'rgba(197,197,212,0.45)',
                    transition: 'color 0.2s',
                    pointerEvents: 'none',
                    lineHeight: 1,
                  }}
                >
                  🔑
                </span>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  disabled={isDisabled}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••••••"
                  aria-label="Password or Passcode"
                  style={{
                    width: '100%',
                    background: 'rgba(12,15,42,0.85)',
                    border: `1px solid ${
                      focusedField === 'password'
                        ? '#6A7BD9'
                        : 'rgba(255,255,255,0.13)'
                    }`,
                    borderRadius: 12,
                    padding: '12px 44px 12px 42px',
                    color: '#f1f3f5',
                    fontSize: 14,
                    fontFamily: "'Hanken Grotesk', sans-serif",
                    outline: 'none',
                    boxSizing: 'border-box',
                    boxShadow:
                      focusedField === 'password'
                        ? '0 0 0 3px rgba(106,123,217,0.22)'
                        : 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    opacity: isDisabled ? 0.6 : 1,
                    letterSpacing: showPassword ? 'normal' : '0.1em',
                  }}
                />
                {/* Toggle visibility button */}
                <button
                  type="button"
                  id="togglePasswordBtn"
                  onClick={() => setShowPassword(v => !v)}
                  disabled={isDisabled}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide passcode' : 'Show passcode'}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                    borderRadius: 6,
                    color: 'rgba(197,197,212,0.55)',
                    fontSize: 18,
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Forgot Passcode Link */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24,
                marginTop: -16,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: 'rgba(197,197,212,0.5)',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                SMS OTP Verified
              </span>
              <button
                type="button"
                id="forgotPasscodeBtn"
                onClick={() => setIsForgotModalOpen(true)}
                disabled={isDisabled}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8898ee',
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 600,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  padding: 0,
                  transition: 'color 0.2s',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                Forgot Passcode?
              </button>
            </div>

            {/* Submit Button */}
            <button
              id="submitBtn"
              type="submit"
              disabled={isDisabled}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: 12,
                border: 'none',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                fontFamily: "'Manrope', sans-serif",
                fontWeight: 700,
                fontSize: 13,
                textTransform: 'uppercase',
                letterSpacing: '0.10em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                background: isSuccess
                  ? 'linear-gradient(135deg, #04D98B 0%, #00995c 100%)'
                  : isError
                  ? 'linear-gradient(135deg, #93000a 0%, #6d0005 100%)'
                  : 'linear-gradient(135deg, #6A7BD9 0%, #5263c9 100%)',
                color: '#fff',
                boxShadow: isDisabled
                  ? 'none'
                  : '0 4px 20px rgba(106,123,217,0.35)',
                opacity: isDisabled && !isSuccess && !isError ? 0.75 : 1,
                transform: isLoading ? 'scale(0.99)' : 'scale(1)',
              }}
            >
              <span id="btnText">
                {isLoading
                  ? 'Authenticating...'
                  : isSuccess
                  ? 'Access Granted'
                  : isError
                  ? 'Authentication Failed'
                  : 'Initialize Sequence'}
              </span>
              <span
                id="btnIcon"
                style={{
                  fontSize: 18,
                  animation: isLoading ? 'kspg-spin 1s linear infinite' : 'none',
                }}
              >
                {isLoading ? '⚙' : isSuccess ? '✓' : isError ? '✕' : '→'}
              </span>
            </button>
          </form>
        </div>
      </main>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer
        style={{
          width: '100%',
          background: 'rgba(10,12,40,0.60)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(8px)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '20px 24px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: 'rgba(197,197,212,0.75)',
              letterSpacing: '0.08em',
            }}
          >
            © 2026 KSPG Cockpit · Mission Control Systems & Shopfloor Analytics
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              color: 'rgba(197,197,212,0.70)',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#04D98B',
                animation: 'kspg-pulse 2.4s ease-in-out infinite',
                display: 'inline-block',
              }}
            />
            System Status: Operational
          </div>
        </div>
      </footer>

      {/* ── Keyframe Animations ──────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap');

        @keyframes kspg-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.65; transform: scale(1.08); }
        }
        @keyframes kspg-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes kspg-slide-in {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        #login-username::placeholder,
        #login-password::placeholder {
          color: rgba(197,197,212,0.40);
        }
        #login-username:disabled,
        #login-password:disabled {
          cursor: not-allowed;
        }
      `}</style>

      {/* ── Forgot Passcode Modal ────────────────────────────────────────── */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        initialIdentifier={username}
        onSuccessReturn={recoveredUsername => {
          if (recoveredUsername) {
            setUsername(recoveredUsername);
          }
          setPassword('');
          setErrorMessage('');
        }}
      />
    </div>
  );
}
