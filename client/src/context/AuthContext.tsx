import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { api, isApiError, type AppUser, type UserProfile } from "../lib/api";

interface AuthContextValue {
  user: AppUser | null;
  profile: UserProfile | null;
  ready: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{
    profile: UserProfile | null;
  }>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!api.hasToken()) {
      setUser(null);
      setProfile(null);
      return;
    }

    try {
      const currentUser = await api.getCurrentUser();
      setUser(currentUser.user);
      setProfile(currentUser.profile);
      setError(null);
    } catch (requestError) {
      if (isApiError(requestError) && requestError.status === 401) {
        api.clearToken();
        setUser(null);
        setProfile(null);
      } else {
        setError(
          isApiError(requestError)
            ? requestError.message
            : "Unable to restore your session.",
        );
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    void refresh().finally(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    await api.login(email, password);
    try {
      const currentUser = await api.getCurrentUser();
      setUser(currentUser.user);
      setProfile(currentUser.profile);
      setError(null);
      return currentUser;
    } catch (requestError) {
      if (isApiError(requestError) && requestError.status === 401) {
        api.clearToken();
      }
      throw requestError;
    }
  }, []);

  const logout = useCallback(() => {
    api.clearToken();
    setUser(null);
    setProfile(null);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({ user, profile, ready, error, login, logout, refresh }),
    [user, profile, ready, error, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
