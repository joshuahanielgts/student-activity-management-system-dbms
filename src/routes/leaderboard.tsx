import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Global Leaderboard — SAMS" },
      { name: "description", content: "Public leaderboard of student achievements in SAMS." },
    ],
  }),
  component: LeaderboardPage,
});

interface LeaderboardEntry {
  student_name: string;
  student_register_number: string;
  total_points: number;
  activity_count: number;
  last_activity_date: string | null;
}

function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCancelled = false;

    const loadLeaderboard = async () => {
      setIsLoading(true);
      setError("");

      const { data, error: leaderboardError } = await supabase.rpc("get_public_leaderboard");

      if (isCancelled) {
        return;
      }

      if (leaderboardError) {
        setError("Unable to load leaderboard right now. Please try again.");
        setEntries([]);
        setIsLoading(false);
        return;
      }

      setEntries(data ?? []);
      setIsLoading(false);
    };

    void loadLeaderboard();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Global Leaderboard</h1>
            <p className="text-sm text-muted-foreground">
              Public ranking of student achievements and total points.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="outline">Home</Button>
            </Link>
            <Link to="/login">
              <Button>Portal</Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Top Students</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading leaderboard...</p>
            ) : error ? (
              <p className="text-destructive">{error}</p>
            ) : entries.length === 0 ? (
              <p className="text-muted-foreground">No achievements logged yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Reg No.</TableHead>
                      <TableHead>Total Points</TableHead>
                      <TableHead>Activities</TableHead>
                      <TableHead>Last Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry, index) => (
                      <TableRow key={`${entry.student_register_number}-${index}`}>
                        <TableCell className="font-semibold">#{index + 1}</TableCell>
                        <TableCell>{entry.student_name}</TableCell>
                        <TableCell>{entry.student_register_number}</TableCell>
                        <TableCell>{entry.total_points}</TableCell>
                        <TableCell>{entry.activity_count}</TableCell>
                        <TableCell>{entry.last_activity_date ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}