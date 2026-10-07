import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext'; // Admin Auth
import { useCustomerAuth } from '@/context/CustomerAuthContext'; // Customer Auth
import { Scissors, Mail, Lock, User, Phone, Loader2, ArrowRight, Eye, EyeOff, UserCircle, Shield } from 'lucide-react';
import { showSuccess, showError } from '@/lib/toastHelpers';

type AuthMode = 'login' | 'register';
type LoginRole = 'customer' | 'admin';

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: adminLogin } = useAuth();
  const { login: customerLogin, register, isAuthenticated } = useCustomerAuth();

  const [mode, setMode] = useState<AuthMode>(
    location.state?.mode === 'register' ? 'register' : 'login'
  );
  const [loginRole, setLoginRole] = useState<LoginRole>('customer');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Redirect if already authenticated (must be in useEffect, not during render)
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/account';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  // Show nothing while redirecting
  if (isAuthenticated) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'register') {
      if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        showError('Password must be at least 6 characters');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        if (loginRole === 'admin') {
          const adminResult = await adminLogin(email, password);
          if (adminResult.success) {
            setEmail('');
            setPassword('');
            // showSuccess(adminResult.name ? `Welcome back ${adminResult.name}` : 'Welcome back');
            // Navigate in same tab to avoid Safari popup blocker
            // AdminDashboard checks specifically for 'welcome' in logic if needed, but standard auth state handles access
            // Open admin dashboard in new tab and redirect login page to homepage
            window.open('/admin/dashboard?welcome=true', '_blank');
            navigate('/', { replace: true });
          } else {
            showError(adminResult.message || 'Invalid credentials');
          }
        } else {
          const customerResult = await customerLogin(email, password);
          if (customerResult.success) {
            showSuccess(customerResult.name ? `Welcome back ${customerResult.name}` : 'Welcome back');
            const from = (location.state as any)?.from?.pathname || '/account';
            navigate(from, { replace: true });
          } else {
            showError(customerResult.message || 'Invalid credentials');
          }
        }
      } else {
        // Register (Customer Only)
        const result = await register(name, email, password, phone || undefined);
        if (result.success) {
          showSuccess(result.message);
          navigate('/account', { replace: true });
        } else {
          showError(result.message);
        }
      }
    } catch (error) {
      showError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 lg:px-8 py-12 animate-fade-up">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Scissors className="w-8 h-8 text-white" />
            </div>
            <h1 className="font-display text-3xl font-semibold text-foreground mb-2">
              {mode === 'login' ? `Welcome Back ${name}` : 'Create Account'}
            </h1>
            <p className="text-muted-foreground">
              {mode === 'login'
                ? 'Sign in to access your orders and saved designs'
                : 'Join Tailor Fit for a personalized tailoring experience'}
            </p>
          </div>

          {/* Auth Form */}
          <div className="bg-white rounded-2xl border border-border/50 shadow-soft p-8">
            {/* Role selector (login) or register form title */}
            {mode === 'login' ? (
              <div className="flex gap-2 mb-6 p-1 bg-muted/30 rounded-xl">
                <button
                  type="button"
                  onClick={() => setLoginRole('customer')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${loginRole === 'customer'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <UserCircle className="w-5 h-5" />
                  Customer
                </button>
                <button
                  type="button"
                  onClick={() => setLoginRole('admin')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${loginRole === 'admin'
                    ? 'bg-accent text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <Shield className="w-5 h-5" />
                  Admin
                </button>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name - Register only */}
              {mode === 'register' && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-12 pl-12 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 pl-12 rounded-xl"
                  />
                </div>
              </div>

              {/* Phone - Register only */}
              {mode === 'register' && (
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (optional)</Label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+92 300 1234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-12 pl-12 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={mode === 'register' ? 'At least 6 characters' : 'Enter your password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-12 pl-12 pr-12 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password - Register only */}
              {mode === 'register' && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-12 pl-12 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl text-base font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : (
                  <>
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Switch mode: Sign up (customer only) / Sign in */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              {mode === 'login' ? (
                loginRole === 'customer' ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <button type="button" onClick={switchMode} className="text-primary font-medium hover:underline cursor-pointer">
                      Sign up
                    </button>
                  </>
                ) : null
              ) : (
                <>
                  Already have an account?{' '}
                  <button type="button" onClick={switchMode} className="text-primary font-medium hover:underline cursor-pointer">
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Benefits */}
          {mode === 'register' && (
            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground mb-4">Create an account to:</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  'Track your orders',
                  'Save your designs',
                  'Store measurements',
                  'Faster checkout',
                ].map((benefit) => (
                  <div key={benefit} className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {benefit}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
