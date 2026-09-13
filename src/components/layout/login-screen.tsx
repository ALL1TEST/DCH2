'use client';

import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useT } from '@/lib/i18n';

// Quick Sign-in demo accounts — each button performs a REAL one-click
// sign-in through the existing auth-store login() (POST /api/auth/login,
// session cookie, then the account's OWN dashboard). The credentials are
// the SAME seeded demo users the normal email/password form accepts
// (src/lib/platform/bootstrap.ts + src/lib/seed.ts) — three SEPARATE
// account types, each with its own identity, session, dashboard and
// profile:
//   • Admin                 → admin@example.com (ADMIN role → Admin
//                             User client CMS dashboard)
//   • Platform Admin (Staff)→ platform@example.com (OWNER role →
//                             Platform Admin dashboard)
//   • Internal Account      → internal@example.com — the DEDICATED
//                             INTERNAL-role account (internal SaaS
//                             account of the platform team) → its OWN
//                             Internal Account dashboard. NOT the same
//                             account as Platform Admin.
// No duplicate users or auth logic — all three authenticate through the
// single existing /api/auth/login flow.
// The Editor / Author demo users still exist and remain reachable via
// the normal email/password form — only their quick buttons are removed.
// i18n: each entry carries labelKey; the label resolves through t() so
// the quick buttons follow the selected language (English fallback for
// locales without auth.* translations).
const QUICK_ACCOUNTS = [
  { labelKey: 'auth.accountAdmin', email: 'admin@example.com', password: 'admin123', accent: false },
  { labelKey: 'auth.accountPlatformAdmin', email: 'platform@example.com', password: 'platform123', accent: true },
  { labelKey: 'auth.accountInternal', email: 'internal@example.com', password: 'internal123', accent: true },
] as const;

// Translated quick-account label (identity for the pending spinner).
const quickLabel = (a: (typeof QUICK_ACCOUNTS)[number], t: (k: string) => string) => t(a.labelKey);

export function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const { t } = useT();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Which quick sign-in button is currently authenticating (drives its
  // inline spinner); null while idle or when the normal form is used.
  const [pendingQuick, setPendingQuick] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
    } catch {
      // Error is already set in the store
    }
  };

  // One-click demo sign-in — reuses the SAME login() the form uses
  // (existing authentication + demo-account logic, no separate path).
  // The credentials are also mirrored into the form fields so a failed
  // sign-in visibly shows which account was used and can be retried or
  // corrected through the normal form.
  const handleQuickSignIn = async (account: {
    labelKey: string;
    email: string;
    password: string;
  }) => {
    clearError();
    setEmail(account.email);
    setPassword(account.password);
    setPendingQuick(account.labelKey);
    try {
      await login(account.email, account.password);
    } catch {
      // Error is already set in the store and shown in the form's Alert
    } finally {
      setPendingQuick(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="w-full max-w-sm">
        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center space-y-3 pb-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl">
              C
            </div>
            <div>
              <CardTitle className="text-xl">{t('auth.welcomeBack')}</CardTitle>
              <CardDescription className="mt-1.5">
                {t('auth.signInSubtitle')}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={isLoading}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="password">{t('auth.password')}</Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('auth.enterPassword')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={isLoading}
                    className="h-10 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    <span className="sr-only">
                      {showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    </span>
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-10"
                disabled={isLoading || !email || !password}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? t('auth.signingIn') : t('auth.signIn')}
              </Button>
            </form>

            {/* Quick Sign-in — three demo accounts, each performing a
                REAL authentication via the existing login flow. Editor
                and Author quick buttons are removed per spec (the demo
                users themselves are untouched and still sign in through
                the normal form). */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground font-medium mb-2 text-center">
                {t('auth.quickSignIn')}
              </p>
              <div className="space-y-1.5 text-xs">
                {QUICK_ACCOUNTS.map((account) => {
                  const label = quickLabel(account, t);
                  return (
                  <Button
                    key={account.labelKey}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={
                      'h-8 w-full text-[11px]' +
                      (account.accent
                        ? ' border-primary/40 text-primary hover:bg-primary/5'
                        : '')
                    }
                    disabled={isLoading}
                    onClick={() => void handleQuickSignIn(account)}
                  >
                    {pendingQuick === account.labelKey && (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    )}
                    {label}
                  </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>

          <CardFooter className="justify-center pb-6 pt-0">
            <p className="text-xs text-muted-foreground">
              Enterprise CMS &copy; {new Date().getFullYear()}
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
