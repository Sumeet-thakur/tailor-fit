import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, User, Scissors, Mail, Key, Eye, EyeOff, UserPlus, LogIn, ArrowLeft } from 'lucide-react';
import { showSuccess, showError, showInfo } from '@/lib/toastHelpers';
import { useNavigate } from 'react-router-dom';
import { SiteLayout } from '@/components/layout/SiteLayout';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

export function AdminLogin() {
  const { login, register, forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [resetToken, setResetToken] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      showSuccess('Welcome to Admin Dashboard!');
      navigate('/admin/dashboard');
    } else {
        showError(result.message);
    }
    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      showError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    const result = await register(name, email, password, inviteCode);
    
    if (result.success) {
      showSuccess('Registration successful! Welcome to Admin Dashboard!');
      navigate('/admin/dashboard');
    } else {
        showError(result.message);
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await forgotPassword(email);
    
    if (result.success) {
      showSuccess(result.message);
      // In development, show the reset token
      if (result.resetToken) {
        setResetToken(result.resetToken);
        setMode('reset');
        showInfo(`Reset token (dev only): ${result.resetToken}`);
      }
    } else {
        showError(result.message);
    }
    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    const result = await resetPassword(email, resetToken, password);
    
    if (result.success) {
      showSuccess('Password reset successful! Please login.');
      setMode('login');
      setPassword('');
      setConfirmPassword('');
      setResetToken('');
    } else {
        showError(result.message);
    }
    setIsLoading(false);
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setInviteCode('');
    setResetToken('');
  };

  return (
    <SiteLayout>
      <div className="flex items-center justify-center py-12">
        <Card className="w-full max-w-md shadow-elevated animate-scale-in">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center">
              <Scissors className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="font-display text-2xl">
                {mode === 'login' && 'Admin Login'}
                {mode === 'register' && 'Admin Registration'}
                {mode === 'forgot' && 'Forgot Password'}
                {mode === 'reset' && 'Reset Password'}
              </CardTitle>
              <CardDescription className="mt-2">
                {mode === 'login' && 'Enter your credentials to access the dashboard'}
                {mode === 'register' && 'Create a new admin account with invite code'}
                {mode === 'forgot' && 'Enter your email to receive a reset token'}
                {mode === 'reset' && 'Enter the reset token and new password'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {/* Login Form */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email or Username</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="text"
                      placeholder="admin@example.com or admin"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground"
                  disabled={isLoading}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
                <div className="flex items-center justify-between text-sm">
                  <button 
                    type="button"
                    onClick={() => { resetForm(); setMode('forgot'); }}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Forgot password?
                  </button>
                  <button 
                    type="button"
                    onClick={() => { resetForm(); setMode('register'); }}
                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Register with invite code
                  </button>
                </div>
              </form>
            )}

            {/* Register Form */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Invite Code</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="inviteCode"
                      type="text"
                      placeholder="XXXXX-XXXXX-XXXX"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Get this code from your super admin</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground"
                  disabled={isLoading}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {isLoading ? 'Creating account...' : 'Create Admin Account'}
                </Button>
                <button 
                  type="button"
                  onClick={() => { resetForm(); setMode('login'); }}
                  className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to login
                </button>
              </form>
            )}

            {/* Forgot Password Form */}
            {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Get Reset Token'}
                </Button>
                <button 
                  type="button"
                  onClick={() => { resetForm(); setMode('login'); }}
                  className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to login
                </button>
              </form>
            )}

            {/* Reset Password Form */}
            {mode === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resetToken">Reset Token</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="resetToken"
                      type="text"
                      placeholder="Enter reset token"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirm-new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground"
                  disabled={isLoading}
                >
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </Button>
                <button 
                  type="button"
                  onClick={() => { resetForm(); setMode('login'); }}
                  className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to login
                </button>
              </form>
            )}

            {/* Info Box */}
            <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border/50 space-y-2">
              <p className="text-xs text-muted-foreground text-center">
                {mode === 'login' && (
                  <>
                    <strong>Legacy Admin:</strong> Username: <code className="px-1 py-0.5 rounded bg-muted text-primary font-mono">admin</code> / Password: <code className="px-1 py-0.5 rounded bg-muted text-primary font-mono">#MiAdmin$</code>
                    <br />
                    <span className="mt-1 block">Or register with invite code</span>
                  </>
                )}
                {mode === 'register' && (
                  <>
                    Invite code: <code className="px-1.5 py-0.5 rounded bg-muted text-primary font-mono">TAILORFIT-ADMIN-2026</code>
                    <br />
                    <span className="mt-1 block">The first admin registered becomes <strong>Super Admin</strong>.</span>
                  </>
                )}
                {(mode === 'forgot' || mode === 'reset') && (
                  <>
                    In production, reset tokens should be sent via email for security.
                  </>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </SiteLayout>
  );
}
