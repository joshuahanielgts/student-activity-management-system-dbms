import { useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthContext, type AuthState } from "@/lib/auth-context";
import type { User, Session } from "@supabase/supabase-js";

const ROLE_SYNC_TIMEOUT_MS = 12000;
const USERNAME_LOOKUP_TIMEOUT_MS = 15000;
const PASSWORD_SIGNIN_TIMEOUT_MS = 15000;

function parseRole(rawRole: unknown): "student" | "faculty" | null {
  if (typeof rawRole !== "string") {
    return null;
  }

  const normalizedRole = rawRole.toLowerCase();
  if (normalizedRole === "student" || normalizedRole === "faculty") {
    return normalizedRole;
  }

  return null;
}

async function withTimeout<T>(operation: PromiseLike<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race<T>([
      Promise.resolve(operation),
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(timeoutMessage));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ register_number: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasAttemptedRoleSyncRef = useRef(false);
  const activeUserIdRef = useRef<string | null>(null);

  const resolveEffectiveRole = useCallback(async (userId: string): Promise<"student" | "faculty" | null> => {
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);

    if (error || !data) {
      return null;
    }

    if (data.some((entry) => entry.role === "faculty")) {
      return "faculty";
    }

    if (data.some((entry) => entry.role === "student")) {
      return "student";
    }

    return null;
  }, []);

  const fetchUserData = useCallback(async (userId: string) => {
    // Keep user_roles aligned with signup role metadata for accounts created before role trigger updates.
    if (!hasAttemptedRoleSyncRef.current) {
      hasAttemptedRoleSyncRef.current = true;

      void (async () => {
        try {
          const { error: syncRoleError } = await withTimeout(
            supabase.rpc("sync_current_user_role"),
            ROLE_SYNC_TIMEOUT_MS,
            "Role sync timed out",
          );

          if (syncRoleError) {
            // Migration may not be applied yet; continue with existing role data.
          }
        } catch {
          // Role sync is best-effort and should never block or crash auth flows.
        }
      })();
    }

    const [roleRes, profileRes] = await Promise.all([
      resolveEffectiveRole(userId),
      supabase.from("profiles").select("register_number, name").eq("id", userId).single(),
    ]);

    if (activeUserIdRef.current !== userId) {
      return;
    }

    setRole(roleRes);
    setProfile(profileRes.data ?? null);
  }, [resolveEffectiveRole]);

  useEffect(() => {
    const applySession = (currentSession: Session | null) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (!currentSession?.user) {
        activeUserIdRef.current = null;
        hasAttemptedRoleSyncRef.current = false;
        setRole(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      activeUserIdRef.current = currentSession.user.id;
      const metadataRole = parseRole(currentSession.user.user_metadata?.role);
      setRole(metadataRole);
      setIsLoading(true);

      void fetchUserData(currentSession.user.id)
        .catch(() => {
          if (activeUserIdRef.current === currentSession.user.id) {
            setRole(null);
            setProfile(null);
          }
        })
        .finally(() => {
          if (activeUserIdRef.current === currentSession.user.id) {
            setIsLoading(false);
          }
        });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      applySession(currentSession);
    });

    void (async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        applySession(currentSession);
      } catch {
        setIsLoading(false);
      }
    })();

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signIn = async (identifier: string, password: string, expectedRole?: "student" | "faculty") => {
    const normalizedIdentifier = identifier.trim();
    let email = normalizedIdentifier;

    if (!normalizedIdentifier.includes("@")) {
      const { data, error: resolveError } = await withTimeout(
        supabase.rpc("resolve_login_email", {
          _identifier: normalizedIdentifier,
        }),
        USERNAME_LOOKUP_TIMEOUT_MS,
        "Username lookup timed out. Please try again.",
      );

      if (resolveError || !data) {
        throw new Error("Invalid login credentials");
      }

      email = data;
    } else {
      email = normalizedIdentifier.toLowerCase();
    }

    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      PASSWORD_SIGNIN_TIMEOUT_MS,
      "Sign in timed out. Please check your connection and try again.",
    );
    if (error) throw error;

    if (!expectedRole) {
      return;
    }

    const signedInUserId = data.user?.id;
    if (!signedInUserId) {
      await supabase.auth.signOut();
      throw new Error("Unable to verify account role. Please try again.");
    }

    const effectiveRole = await resolveEffectiveRole(signedInUserId);
    if (!effectiveRole) {
      await supabase.auth.signOut();
      throw new Error("No role assigned to this account. Contact an administrator.");
    }

    if (effectiveRole !== expectedRole) {
      await supabase.auth.signOut();
      throw new Error(`This account is not registered as ${expectedRole}.`);
    }
  };

  const signUp = async (
    name: string,
    registerNumber: string,
    email: string,
    password: string,
    signupRole: "student" | "faculty",
  ) => {
    const normalizedName = name.trim();
    const normalizedRegisterNumber = registerNumber.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName || !normalizedRegisterNumber) {
      throw new Error("Name and register number are required");
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          register_number: normalizedRegisterNumber,
          name: normalizedName,
          role: signupRole,
        },
      },
    });

    if (error) throw error;

    return {
      requiresEmailConfirmation: !data.session,
    };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    hasAttemptedRoleSyncRef.current = false;
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, profile, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
