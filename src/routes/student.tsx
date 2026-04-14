import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { resolveProofUrl } from "@/lib/proof-storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/student")({
  head: () => ({
    meta: [
      { title: "Student Dashboard — SAMS" },
    ],
  }),
  component: StudentDashboard,
});

interface LogEntry {
  id: string;
  activity_name: string;
  date: string;
  points: number;
  proof_url: string | null;
}

function StudentDashboard() {
  const { user, role, profile, isLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    if (!isLoading && (!user || role !== "student")) {
      navigate({ to: "/login" });
    }
  }, [user, role, isLoading, navigate]);

  useEffect(() => {
    let isCancelled = false;

    const loadLogs = async () => {
      if (!user || role !== "student") {
        return;
      }

      const profileRegisterNumber = profile?.register_number?.trim() ?? "";
      const profileName = profile?.name?.trim() ?? "";

      const metadataRegisterNumber =
        typeof user.user_metadata?.register_number === "string"
          ? user.user_metadata.register_number.trim()
          : "";

      const metadataName =
        typeof user.user_metadata?.name === "string"
          ? user.user_metadata.name.trim()
          : "";

      const resolvedName = profileName || metadataName;

      const registerFilters = Array.from(
        new Set([
          profileRegisterNumber,
          metadataRegisterNumber,
        ].filter((value): value is string => value.length > 0)),
      );

      const filterParts = [
        `student_id.eq.${user.id}`,
        ...registerFilters.map((registerNumber) => `student_register_number.ilike.${registerNumber}`),
        resolvedName ? `student_name.ilike.${resolvedName}%` : "",
      ].filter((value) => value.length > 0);

      const { data } = await supabase
        .from("activity_logs")
        .select("id, activity_name, date, points, proof_url")
        .or(filterParts.join(","))
        .order("date", { ascending: false });

      if (!data || isCancelled) {
        return;
      }

      const resolvedLogs = await Promise.all(
        data.map(async (entry) => ({
          ...entry,
          proof_url: await resolveProofUrl(entry.proof_url),
        })),
      );

      if (isCancelled) {
        return;
      }

      setLogs(resolvedLogs);
      setTotalPoints(resolvedLogs.reduce((sum, entry) => sum + entry.points, 0));
    };

    void loadLogs();

    return () => {
      isCancelled = true;
    };
  }, [user, role, profile?.register_number, profile?.name]);

  if (isLoading) return <div className="flex min-h-screen items-center justify-center">Loading…</div>;
  if (!user || role !== "student") return null;

  return (
    <div className="min-h-screen bg-background p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Student Dashboard</h1>
          <p className="text-muted-foreground">{profile?.name} ({profile?.register_number})</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/leaderboard">
            <Button variant="outline">Leaderboard</Button>
          </Link>
          <Button variant="outline" onClick={signOut}>Sign Out</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Total Points</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold text-primary">{totalPoints}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Activity Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-muted-foreground">No activities logged yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Proof</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.activity_name}</TableCell>
                    <TableCell>{log.date}</TableCell>
                    <TableCell>{log.points}</TableCell>
                    <TableCell>
                      {log.proof_url ? (
                        <a href={log.proof_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                          View
                        </a>
                      ) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
