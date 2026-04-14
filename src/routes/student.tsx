import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/student")({
  head: () => ({
    meta: [
      { title: "Student Dashboard — Student Activity Log" },
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
    if (user && role === "student") {
      supabase
        .from("activity_logs")
        .select("id, activity_name, date, points, proof_url")
        .eq("student_id", user.id)
        .order("date", { ascending: false })
        .then(({ data }) => {
          if (data) {
            setLogs(data);
            setTotalPoints(data.reduce((sum, l) => sum + l.points, 0));
          }
        });
    }
  }, [user, role]);

  if (isLoading) return <div className="flex min-h-screen items-center justify-center">Loading…</div>;
  if (!user || role !== "student") return null;

  return (
    <div className="min-h-screen bg-background p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Student Dashboard</h1>
          <p className="text-muted-foreground">{profile?.name} ({profile?.register_number})</p>
        </div>
        <Button variant="outline" onClick={signOut}>Sign Out</Button>
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
