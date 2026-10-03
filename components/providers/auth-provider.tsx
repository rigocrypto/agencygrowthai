'use client';

import { createContext, Fragment, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { StoredSession } from '@nhost/nhost-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { getNhostBrowserClient } from '@/lib/nhost/client';
import { dataMode, isDemoMode, isNhostMode } from '@/lib/repo';
import type { AgencyRole } from '@/lib/types';

interface AppUser {
  id: string;
  email: string;
  agency_id: string;
  role: AgencyRole;
  first_name: string;
  last_name: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, metadata?: Record<string, string>) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  demoLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER: AppUser = {
  id: 'demo-user-001',
  email: 'admin@horizonfinancial.example',
  agency_id: 'a0000000-0000-0000-0000-000000000001',
  role: 'agency_owner',
  first_name: 'Sarah',
  last_name: 'Mitchell',
};

const DEMO_SESSION_KEY = 'agag-demo-session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for demo session first
    if (isDemoMode) {
      const stored = typeof window !== 'undefined' ? sessionStorage.getItem(DEMO_SESSION_KEY) : null;
      if (stored === 'true') {
        setUser(DEMO_USER);
      }
      setLoading(false);
      return;
    }

    if (isNhostMode) {
      const client = getNhostBrowserClient();
      let active = true;

      const restoreSession = async () => {
        try {
          const session = await client.refreshSession(60);
          if (active) setUser(session ? mapNhostUser(session) : null);
        } catch {
          client.clearSession();
          if (active) setUser(null);
        } finally {
          if (active) setLoading(false);
        }
      };

      void restoreSession();
      const unsubscribe = client.sessionStorage.onChange((session) => {
        if (!active) return;
        try {
          setUser(session ? mapNhostUser(session) : null);
        } catch {
          client.clearSession();
          setUser(null);
        }
        setLoading(false);
      });

      return () => {
        active = false;
        unsubscribe();
      };
    }

    // Supabase auth path
    if (!supabase || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        mapUser(session.user);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        mapUser(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const mapUser = (sbUser: SupabaseUser) => {
    const metaData = sbUser.user_metadata || {};
    const appData = (sbUser.app_metadata || {}) as Record<string, string>;
    setUser({
      id: sbUser.id,
      email: sbUser.email || '',
      agency_id: appData.agency_id || metaData.agency_id || '',
      role: (appData.role || metaData.role || 'agent') as AgencyRole,
      first_name: metaData.first_name || '',
      last_name: metaData.last_name || '',
    });
  };

  const signIn = async (email: string, password: string) => {
    if (isDemoMode) {
      // Demo mode: accept any credentials and log in as demo user
      setUser(DEMO_USER);
      sessionStorage.setItem(DEMO_SESSION_KEY, 'true');
      return { error: null };
    }

    if (isNhostMode) {
      try {
        const client = getNhostBrowserClient();
        const response = await client.auth.signInEmailPassword({ email, password });
        const session = client.getUserSession();
        if (!response.body.session || !session) {
          client.clearSession();
          return { error: response.body.mfa ? 'Multi-factor authentication is not supported in this pilot gate.' : 'Nhost did not return an authenticated session.' };
        }
        setUser(mapNhostUser(session));
        return { error: null };
      } catch (error) {
        getNhostBrowserClient().clearSession();
        return { error: error instanceof Error ? error.message : 'Nhost authentication failed.' };
      }
    }

    if (!supabase) return { error: 'Authentication not configured' };

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, string>) => {
    if (isDemoMode) {
      setUser(DEMO_USER);
      sessionStorage.setItem(DEMO_SESSION_KEY, 'true');
      return { error: null };
    }


    if (isNhostMode) {
      return { error: 'Nhost signup is not enabled in Phase 3A.' };
    }

    if (!supabase) return { error: 'Authentication not configured' };

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    if (isDemoMode) {
      sessionStorage.removeItem(DEMO_SESSION_KEY);
      setUser(null);
      router.push('/login');
      return;
    }

    if (isNhostMode) {
      const client = getNhostBrowserClient();
      const session = client.getUserSession();
      try {
        if (session?.refreshToken) {
          await client.auth.signOut({ refreshToken: session.refreshToken });
        }
      } finally {
        client.clearSession();
        setUser(null);
        router.push('/login');
      }
      return;
    }

    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    router.push('/login');
  };

  const demoLogin = () => {
    setUser(DEMO_USER);
    sessionStorage.setItem(DEMO_SESSION_KEY, 'true');
  };

  return (
    <AuthContext.Provider value={{ user, loading, isDemo: isDemoMode, signIn, signUp, signOut, demoLogin }}>
      <Fragment key={user?.id ?? `${dataMode}-anonymous`}>{children}</Fragment>
    </AuthContext.Provider>
  );
}

function mapNhostUser(session: StoredSession): AppUser {
  const nhostUser = session.user;
  if (!nhostUser) throw new Error('NHOST_SESSION_INVALID: session user is absent.');

  const claims = session.decodedToken['https://hasura.io/jwt/claims'] ?? {};
  const boundUserId = claims['x-hasura-user-id'];
  const effectiveRole = claims['x-hasura-default-role'];
  if (boundUserId !== nhostUser.id) {
    throw new Error('NHOST_IDENTITY_BINDING_FAILED: JWT identity does not match the session user.');
  }
  if (effectiveRole !== 'user' || nhostUser.defaultRole !== 'user') {
    throw new Error('NHOST_ROLE_INVALID: the pilot requires the normal user role.');
  }

  const metadata = nhostUser.metadata ?? {};
  const displayName = nhostUser.displayName?.trim() ?? '';
  const displayParts = displayName.split(/\s+/).filter(Boolean);
  const firstName = typeof metadata.first_name === 'string'
    ? metadata.first_name
    : displayParts[0] ?? 'Nhost';
  const lastName = typeof metadata.last_name === 'string'
    ? metadata.last_name
    : displayParts.slice(1).join(' ');

  return {
    id: nhostUser.id,
    email: nhostUser.email ?? '',
    agency_id: '',
    role: 'agent',
    first_name: firstName,
    last_name: lastName,
  };
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
