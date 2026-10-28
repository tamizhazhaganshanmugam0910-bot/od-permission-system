import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Profile, Role, StaffRequest } from "./types";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  staffRequest: StaffRequest | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signUp: (params: {
    email: string;
    password: string;
    fullName: string;
    role: Role;
    department: string;
  }) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [staffRequest, setStaffRequest] = useState<StaffRequest | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(authUser: User) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    if (!data) return null;

    const metadataDepartment =
      typeof authUser.user_metadata?.department === "string"
        ? authUser.user_metadata.department.trim()
        : "";
    if (metadataDepartment && !data.department?.trim()) {
      const { data: updatedProfile, error: updateError } = await supabase
        .from("profiles")
        .update({ department: metadataDepartment })
        .eq("id", authUser.id)
        .select("*")
        .maybeSingle();

      if (updateError) {
        console.error("Error restoring profile department:", updateError);
      } else if (updatedProfile) {
        return updatedProfile as Profile;
      }

      return { ...data, department: metadataDepartment } as Profile;
    }

    return data as Profile;
  }

  async function fetchStaffRequest(userId: string) {
    const { data, error } = await supabase
      .from("staff_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("Could not fetch staff request:", error.message);
      return null;
    }
    return (data as StaffRequest) || null;
  }

  const loadUserData = async (authUser: User) => {
    const [p, sr] = await Promise.all([
      fetchProfile(authUser),
      fetchStaffRequest(authUser.id),
    ]);
    setProfile(p);
    setStaffRequest(sr);
    setLoading(false);
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserData(user);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadUserData(data.session.user);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        loadUserData(newSession.user);
      } else {
        setProfile(null);
        setStaffRequest(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp: AuthContextValue["signUp"] = async ({
    email,
    password,
    fullName,
    role,
    department,
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          department,
        },
      },
    });

    if (error) return { error: error.message };

    // If signUp returns a session immediately, fetch the profile
    if (data.user) {
      // The trigger creates the profile, but there may be a slight delay.
      // Try a few times.
      for (let i = 0; i < 5; i++) {
        const p = await fetchProfile(data.user);
        if (p) {
          setProfile(p);
          break;
        }
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    return { error: null };
  };

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signInWithGoogle: AuthContextValue["signInWithGoogle"] = async () => {
    const redirectTo = `${window.location.origin}/dashboard`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) return { error: error.message };

    if (data?.url) {
      window.location.href = data.url;
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setStaffRequest(null);
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        staffRequest,
        loading,
        refreshProfile,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
