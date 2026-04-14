import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Student Activity Log System" },
      { name: "description", content: "Track and manage student extracurricular activities" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="max-w-lg text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Student Activity Log System
        </h1>
        <p className="text-muted-foreground text-lg">
          Track extracurricular activities, earn points, and build your student portfolio.
        </p>
        <Link to="/login">
          <Button size="lg" className="mt-4">
            Login
          </Button>
        </Link>
      </div>
    </div>
  );
}
