import React, { useState } from 'react';
import { Layers, Lock, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password || isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      await signIn(password);
    } catch (err: any) {
      setError(err?.message || 'Incorrect password');
      setPassword('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100/70 dark:bg-slate-950 canvas-surface px-4">
      <div className="w-full max-w-sm">
        <div className="surface p-7 sm:p-8 shadow-raised">
          <div className="flex flex-col items-center mb-6">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-b from-clay-500 to-clay-700 text-white flex items-center justify-center shadow-[0_2px_6px_rgba(120,50,20,0.3),inset_0_1px_0_rgba(255,255,255,0.18)] mb-4">
              <Layers className="h-6 w-6" strokeWidth={2} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-display text-[28px] leading-none font-medium text-slate-900 dark:text-slate-50">
                TrackMe
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-2">
              Private workspace — enter your password
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  className="h-10 pl-9 pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 px-3 py-2.5">
                <AlertCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={!password || isSubmitting}
              className="w-full h-10 gap-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                'Checking…'
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-[11px] text-slate-400 dark:text-slate-600 font-medium mt-4">
          Authorized access only. All activity is private.
        </p>
      </div>
    </div>
  );
}