import { createContext, useContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export interface AuthState {
  user: User | null;
  session: Session | null;
  role: string | null;
  profile: { register_number: string; name: string } | null;
  isLoading: boolean;
  signIn: (identifier: string, password: string, expectedRole?: "student" | "faculty") => Promise<void>;
  signUp: (
    name: string,
    registerNumber: string,
    email: string,
    password: string,
    signupRole: "student" | "faculty",
  ) => Promise<{ requiresEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}