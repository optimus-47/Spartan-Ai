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
  status: AuthStatus;
  error: string | null;
  login: (email: string, password: string) => Promise<{
    profile: UserProfile | null;
  }>;
  logout: () => void;
  refresh: () => Promise<void>;
}

export type AuthStatus =
  | "restoring"
  | "restore-error"
  | "signed-out"
  | "signed-in-profile-loading"
  | "signed-in-with-profile"
  | "signed-in-without-profile";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<AuthStatus>("restoring");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setReady(false);
    setStatus("restoring");
    try {
      if (!api.hasToken()) {
        setUser(null);
        setProfile(null);
        setError(null);
        setStatus("signed-out");
      } else {
        const currentUser = await api.getCurrentUser();
        setUser(currentUser.user);
        setProfile(currentUser.profile);
        setError(null);
        setStatus(
          currentUser.profile
            ? "signed-in-with-profile"
            : "signed-in-without-profile",
        );
      }
    } catch (requestError) {
      if (isApiError(requestError) && requestError.status === 401) {
        api.clearToken();
        setUser(null);
        setProfile(null);
        setError(null);
        setStatus("signed-out");
      } else {
        setError(
          isApiError(requestError)
            ? requestError.message
            : "Unable to restore your session.",
        );
        setStatus("restore-error");
      }
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    setReady(false);
    setStatus("signed-in-profile-loading");
    setError(null);
    try {
      const signedIn = await api.login(email, password);
      setUser(signedIn.user);
      const currentUser = await api.getCurrentUser();
      setUser(currentUser.user);
      setProfile(currentUser.profile);
      setError(null);
      setStatus(
        currentUser.profile
          ? "signed-in-with-profile"
          : "signed-in-without-profile",
      );
      return currentUser;
    } catch (requestError) {
      if (isApiError(requestError) && requestError.status === 401) {
        api.clearToken();
        setUser(null);
        setProfile(null);
        setError(null);
        setStatus("signed-out");
      } else if (api.hasToken()) {
        setError(
          isApiError(requestError)
            ? requestError.message
            : "Unable to restore your session.",
        );
        setStatus("restore-error");
      } else {
        setStatus("signed-out");
      }
      throw requestError;
    } finally {
      setReady(true);
    }
  }, []);

  const logout = useCallback(() => {
    api.clearToken();
    setUser(null);
    setProfile(null);
    setError(null);
    setStatus("signed-out");
    setReady(true);
  }, []);

  const value = useMemo(
    () => ({ user, profile, ready, status, error, login, logout, refresh }),
    [user, profile, ready, status, error, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
