import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — SAMS" },
      { name: "description", content: "Login to SAMS (Student Activity Management System)." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, signUp, role, user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signUpRole, setSignUpRole] = useState<"student" | "faculty">("student");
  const [identifier, setIdentifier] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupRegisterNumber, setSignupRegisterNumber] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    const metadataRole =
      typeof user.user_metadata?.role === "string"
        ? user.user_metadata.role.toLowerCase()
        : null;

    const effectiveRole =
      role ?? (metadataRole === "student" || metadataRole === "faculty" ? metadataRole : null);

    if (!effectiveRole) {
      return;
    }

    navigate({
      to: effectiveRole === "faculty" ? "/faculty" : "/student",
      replace: true,
    });
  }, [user, role, navigate]);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await signIn(identifier.trim(), signinPassword);
      // Auth state change will trigger redirect
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const { requiresEmailConfirmation } = await signUp(
        signupName,
        signupRegisterNumber,
        signupEmail,
        signupPassword,
        signUpRole,
      );

      setSuccess(
        requiresEmailConfirmation
          ? "Account created. Please verify your email, then sign in."
          : "Account created successfully. You can now sign in.",
      );

      setMode("signin");
      setIdentifier(signupRegisterNumber.trim());
      setSigninPassword("");
      setSignupName("");
      setSignupRegisterNumber("");
      setSignupEmail("");
      setSignupPassword("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{mode === "signin" ? "Sign In" : "Sign Up"}</CardTitle>
          <CardDescription>
            {mode === "signin"
              ? "Use your register number or email with password"
              : "Create an account with your role, name, register number, email, and password"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={mode === "signin" ? "default" : "outline"}
              onClick={() => {
                setMode("signin");
                setError("");
                setSuccess("");
              }}
            >
              Sign In
            </Button>
            <Button
              type="button"
              variant={mode === "signup" ? "default" : "outline"}
              onClick={() => {
                setMode("signup");
                setError("");
                setSuccess("");
              }}
            >
              Sign Up
            </Button>
          </div>

          {mode === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">Register Number or Email</Label>
                <Input
                  id="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. RA2411003040029 or you@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  value={signinPassword}
                  onChange={(e) => setSigninPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-primary">{success}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Full Name</Label>
                <Input
                  id="signup-name"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="e.g. Nithila K"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-register">
                  {signUpRole === "faculty" ? "Faculty ID" : "Register Number"}
                </Label>
                <Input
                  id="signup-register"
                  value={signupRegisterNumber}
                  onChange={(e) => setSignupRegisterNumber(e.target.value)}
                  placeholder={signUpRole === "faculty" ? "e.g. FAC001" : "e.g. RA2411003040029"}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Register As</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={signUpRole === "student" ? "default" : "outline"}
                    onClick={() => setSignUpRole("student")}
                  >
                    Student
                  </Button>
                  <Button
                    type="button"
                    variant={signUpRole === "faculty" ? "default" : "outline"}
                    onClick={() => setSignUpRole("faculty")}
                  >
                    Faculty
                  </Button>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-primary">{success}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
