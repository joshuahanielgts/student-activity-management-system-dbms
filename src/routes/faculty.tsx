import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { resolveProofUrl } from "@/lib/proof-storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/faculty")({
  head: () => ({
    meta: [
      { title: "Faculty Dashboard — SAMS" },
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
  student_name: string;
  student_register_number: string;
  student: { name: string; register_number: string } | null;
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

function FacultyDashboard() {
  const { user, role, isLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [studentName, setStudentName] = useState("");
  const [studentRegisterNumber, setStudentRegisterNumber] = useState("");
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

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase
      .from("activity_logs")
      .select("id, activity_name, date, points, proof_url, created_at, student_name, student_register_number, student:profiles!activity_logs_student_id_fkey(name, register_number)")
      .order("created_at", { ascending: false });

    if (!data) {
      return;
    }

    const resolvedLogs = await Promise.all(
      (data as unknown as LogEntry[]).map(async (entry) => ({
        ...entry,
        proof_url: await resolveProofUrl(entry.proof_url),
      })),
    );

    setLogs(resolvedLogs);
  }, []);

  useEffect(() => {
    if (user && role === "faculty") {
      void fetchLogs();
    }
  }, [user, role, fetchLogs]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const normalizedStudentName = studentName.trim();
      const normalizedRegisterNumber = studentRegisterNumber.trim();

      if (!normalizedStudentName || !normalizedRegisterNumber) {
        setError("Student name and register number are required");
        setSubmitting(false);
        return;
      }

      const { data: matchedStudent, error: lookupError } = await withTimeout(
        supabase
          .from("profiles")
          .select("id")
          .eq("register_number", normalizedRegisterNumber)
          .maybeSingle(),
        10000,
        "Student lookup timed out. Please try again.",
      );

      if (lookupError) {
        setError("Unable to verify student details right now. Please try again.");
        setSubmitting(false);
        return;
      }

      const matchedStudentId = matchedStudent?.id ?? null;

      let proofUrl: string | null = null;

      // Upload PDF if provided
      if (proofFile) {
        if (proofFile.type !== "application/pdf") {
          setError("Only PDF files are allowed for proof uploads");
          setSubmitting(false);
          return;
        }

        const sanitizedFileName = proofFile.name.replace(/\s+/g, "_");
        const storageOwnerSegment = matchedStudentId ?? normalizedRegisterNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
        const filePath = `${storageOwnerSegment}/${Date.now()}_${sanitizedFileName}`;
        const { error: uploadErr } = await withTimeout(
          supabase.storage
            .from("proofs")
            .upload(filePath, proofFile, { contentType: "application/pdf" }),
          30000,
          "Proof upload timed out. Please try again.",
        );
        if (uploadErr) {
          setError("Failed to upload proof: " + uploadErr.message);
          setSubmitting(false);
          return;
        }

        proofUrl = filePath;
      }

      const { error: insertErr } = await withTimeout(
        supabase.from("activity_logs").insert({
          student_id: matchedStudentId,
          student_name: normalizedStudentName,
          student_register_number: normalizedRegisterNumber,
          faculty_id: user!.id,
          activity_name: activityName.trim(),
          date,
          points: parseInt(points, 10),
          proof_url: proofUrl,
        }),
        20000,
        "Saving activity timed out. Please try again.",
      );

      if (insertErr) {
        setError(insertErr.message);
      } else {
        setSuccess("Activity logged successfully!");
        setStudentName("");
        setStudentRegisterNumber("");
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
        <div className="flex items-center gap-2">
          <Link to="/leaderboard">
            <Button variant="outline">Leaderboard</Button>
          </Link>
          <Button variant="outline" onClick={signOut}>Sign Out</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log Student Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="studentName">Student Name</Label>
                <Input
                  id="studentName"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Nithila K"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentRegisterNumber">Register Number</Label>
                <Input
                  id="studentRegisterNumber"
                  value={studentRegisterNumber}
                  onChange={(e) => setStudentRegisterNumber(e.target.value)}
                  placeholder="e.g. RA2411003040029"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter details exactly as provided by the student. Account signup is not required to log activity.
                </p>
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
                      <TableCell>{log.student?.name ?? log.student_name}</TableCell>
                      <TableCell>{log.student?.register_number ?? log.student_register_number}</TableCell>
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
