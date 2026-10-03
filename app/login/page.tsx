'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TrendingUp, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, isDemo, signIn, demoLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter your email and password');
      return;
    }
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Welcome back!');
      router.push('/dashboard');
    }
  };

  const handleDemoLogin = () => {
    demoLogin();
    toast.success('Logged in as demo agency owner');
    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-muted/50 to-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <TrendingUp className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">
              AgencyGrowth<span className="text-primary">AI</span>
            </span>
          </Link>
        </div>

        <Card className="border-border/60">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Sign In</CardTitle>
            <CardDescription>Access your agency dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            {isDemo && (
              <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-400">DEMO MODE</Badge>
                </div>
                <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
                  Production authentication is not enabled in demo mode. Use the demo login below to explore the full dashboard
                  with seeded data from Horizon Financial Group.
                </p>
                <Button onClick={handleDemoLogin} className="mt-3 w-full" variant="default" disabled={!hydrated || loading}>
                  Enter Demo Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            <div className={isDemo ? 'opacity-50' : ''}>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@agency.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!hydrated || loading || submitting || isDemo}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={!hydrated || loading || submitting || isDemo}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={!hydrated || loading || submitting || isDemo}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
                </Button>
              </form>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3 w-3" />
              <span>Protected by agency-level authentication</span>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Request access
          </Link>
        </p>
      </div>
    </div>
  );
}
