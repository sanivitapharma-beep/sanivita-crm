import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Ref to track initialization status to prevent double-execution in React Strict Mode
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    let mounted = true;
    setLoading(true);

    const initAuth = async () => {
      if (!isSupabaseConfigured) {
          if (mounted) setLoading(false);
          return;
      }

      // Added retry logic for session retrieval with limited attempts
      const maxRetries = 3;
      let attempt = 0;
      let sessionResult: { data: { session: any }, error: any } | null = null;

      while (attempt < maxRetries) {
        try {
          sessionResult = await supabase.auth.getSession();
          if (!sessionResult.error) break; // Exit loop if call was successful
        } catch (e) {
          console.warn(`Session retrieval attempt ${attempt + 1} failed`, e);
        }
        attempt++;
        // Wait delay before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      if (!sessionResult) {
        // Could not retrieve session after retries
        if (mounted) {
          setAuthError('auth_timeout_error');
          setUser(null);
          setLoading(false);
        }
        return;
      }

      if (sessionResult.error) {
        if (mounted) {
             // Remove aggressive sign out on auth_timeout to prevent clearing session unnecessarily
             if (sessionResult.error.message === 'auth_timeout' || sessionResult.error === 'auth_timeout') {
                 console.warn("Auth timeout detected. Not clearing session automatically.");
                 setAuthError('auth_timeout_error');
                 // Do not call supabase.auth.signOut() here to avoid session clearing
                 // User can retry manually or on next page load
             } else if (sessionResult.error.message === 'rls_error') {
                 setAuthError('rls_error');
                 setUser(null);
             } else {
                 // Generic error, assume logged out
                 setUser(null);
             }
             setLoading(false);
        }
        return;
      }

      const session = sessionResult.data.session;

      if (session?.user) {
        try {
          const profile = await api.getUserProfile(session.user.id);
          if (mounted) setUser(profile);
        } catch (profileError) {
          console.error("Error fetching user profile:", profileError);
          // Don't sign out user just because profile fetch failed
          // This could be a temporary network issue
          if (mounted) {
            setAuthError('profile_fetch_error');
            // Keep user logged in but show error
            setUser({ 
              id: session.user.id, 
              name: session.user.user_metadata?.name || 'User',
              username: session.user.email || '',
              role: 'REP' as any // Default role
            });
          }
        }
      }
      if(mounted) setLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      // Only react to explicit sign-in/sign-out events to avoid conflict with initAuth
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          try {
            // Ensure we have the latest profile data
            const profile = await api.getUserProfile(session.user.id);
            if (mounted) {
                setUser(profile);
                setAuthError(null);
            }
          } catch (e) {
            console.error("Error fetching profile on auth change:", e);
            // Don't sign out user just because profile fetch failed
            if (mounted) {
              setAuthError('profile_fetch_error');
              // Keep user logged in but show error
              setUser({ 
                id: session.user.id, 
                name: session.user.user_metadata?.name || 'User',
                username: session.user.email || '',
                role: 'REP' as any // Default role
              });
            }
          }
        }
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
            setUser(null);
            setAuthError(null);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (username: string, password: string) => {
    setAuthError(null);
    return await api.login(username, password);
  };

  const logout = async () => {
    setUser(null);
    setAuthError(null);
    try {
      await api.logout();
    } catch (error) {
      console.error("Error signing out from server:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, authError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
