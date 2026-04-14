import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/faculty")({
  head: () => ({
    meta: [
      { title: "Faculty Dashboard — Student Activity Log" },
    ],
  }),
  component: FacultyDashboard,
});

interface LogEntry {
  id: string;
  activity_name: string;
  date: string;
  points: number;
  proof_url: string | null;
  created_at: string | null;
  student: { name: string; register_number: string } | null;
}

function FacultyDashboard() {
  const { user, role, isLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [studentRegNo, setStudentRegNo] = useState("");
  const [activityName, setActivityName] = useState("");
  const [date, setDate] = useState("");
  const [points, setPoints] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!isLoading && (!user || role !== "faculty")) {
      navigate({ to: "/login" });
    }
  }, [user, role, isLoading, navigate]);

  const fetchLogs = async () => {
    const { data } = await supabase
      .from("activity_logs")
      .select("id, activity_name, date, points, proof_url, created_at, student:profiles!activity_logs_student_id_fkey(name, register_number)")
      .order("created_at", { ascending: false });
    if (data) setLogs(data as unknown as LogEntry[]);
  };

  useEffect(() => {
    if (user && role === "faculty") fetchLogs();
  }, [user, role]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      // Find student by register number
      const { data: student, error: studentErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("register_number", studentRegNo.trim())
        .single();

      if (studentErr || !student) {
        setError("Student not found with that register number");
        setSubmitting(false);
        return;
      }

      let proofUrl: string | null = null;

      // Upload PDF if provided
      if (proofFile) {
        const filePath = `${student.id}/${Date.now()}_${proofFile.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("proofs")
          .upload(filePath, proofFile, { contentType: "application/pdf" });
        if (uploadErr) {
          setError("Failed to upload proof: " + uploadErr.message);
          setSubmitting(false);
          return;
        }
        const { data: urlData } = supabase.storage.from("proofs").getPublicUrl(filePath);
        proofUrl = urlData.publicUrl;
      }

      const { error: insertErr } = await supabase.from("activity_logs").insert({
        student_id: student.id,
        faculty_id: user!.id,
        activity_name: activityName.trim(),
        date,
        points: parseInt(points, 10),
        proof_url: proofUrl,
      });

      if (insertErr) {
        setError(insertErr.message);
      } else {
        setSuccess("Activity logged successfully!");
        setStudentRegNo("");
        setActivityName("");
        setDate("");
        setPoints("");
        setProofFile(null);
        fetchLogs();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <div className="flex min-h-screen items-center justify-center">Loading…</div>;
  if (!user || role !== "faculty") return null;

  return (
    <div className="min-h-screen bg-background p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Faculty Dashboard</h1>
        <Button variant="outline" onClick={signOut}>Sign Out</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log Student Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="studentReg">Student Register No.</Label>
                <Input id="studentReg" value={studentRegNo} onChange={(e) => setStudentRegNo(e.target.value)} placeholder="e.g. STU001" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="actName">Activity Name</Label>
                <Input id="actName" value={activityName} onChange={(e) => setActivityName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="actDate">Date</Label>
                <Input id="actDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="actPoints">Points</Label>
                <Input id="actPoints" type="number" min="0" value={points} onChange={(e) => setPoints(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="proof">Proof (PDF)</Label>
              <Input
                id="proof"
                type="file"
                accept="application/pdf"
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-primary">{success}</p>}
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Log Activity"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Activity Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-muted-foreground">No logs yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Reg No.</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Proof</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{log.student?.name ?? "—"}</TableCell>
                      <TableCell>{log.student?.register_number ?? "—"}</TableCell>
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
