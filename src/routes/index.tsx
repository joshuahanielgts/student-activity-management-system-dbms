import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SAMS (Student Activity Management System)" },
      { name: "description", content: "Track and manage student extracurricular activities in SAMS." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">SAMS</p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Student Activity Management System
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/leaderboard">
              <Button variant="outline">Leaderboard</Button>
            </Link>
            <Link to="/login">
              <Button variant="outline">Open Portal</Button>
            </Link>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-3xl border bg-card px-6 py-14 shadow-sm sm:px-10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">Campus Activity Tracking</Badge>
            <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              One place for student achievements, points, and proof.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Faculty can log verified activities quickly, and students can track their own progress transparently.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/leaderboard">
                <Button size="lg" variant="secondary" className="w-48">View Leaderboard</Button>
              </Link>
              <Link to="/login">
                <Button size="lg" className="w-48">Sign In</Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="w-48">Create Account</Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Role-Aware Access</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Separate experiences for Student and Faculty users with role-based dashboard access.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Verified Activity Logs</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Faculty log activities with dates, points, and optional PDF proof uploads.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Student Progress View</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Students can monitor their own records and total points in real time.
            </CardContent>
          </Card>
        </section>

        <footer className="mt-10 rounded-2xl border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Ready to get started with SAMS?
          </p>
          <div className="mt-3">
            <Link to="/login">
              <Button>Go To Login</Button>
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
