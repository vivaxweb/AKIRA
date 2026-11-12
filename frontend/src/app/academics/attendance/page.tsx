"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { Subject, AttendanceSession, PaginatedResponse, User } from "@/types";
import { Card, CardHeader, CardTitle, Badge, Skeleton, EmptyState, ProgressBar } from "@/components/ui/CardsAndFeedback";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Dialog } from "@/components/ui/DialogAndTable";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  Plus,
  Check,
  X,
  AlertTriangle,
  History,
  Save,
} from "lucide-react";

export default function AttendancePage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<number | null>(null);
  const [sessions, setSessions] = React.useState<AttendanceSession[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Student specific data
  const [studentSummary, setStudentSummary] = React.useState<{
    total_sessions: number;
    present_sessions: number;
    percentage: number;
    min_required_pct: number;
    is_low_attendance: boolean;
  } | null>(null);

  // Taking Attendance State
  const [isNewSessionOpen, setIsNewSessionOpen] = React.useState(false);
  const [sessionDate, setSessionDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [sessionKind, setSessionKind] = React.useState<"LECTURE" | "PRACTICAL" | "TUTORIAL">("LECTURE");
  const [sessionSlot, setSessionSlot] = React.useState(1);
  const [activeSession, setActiveSession] = React.useState<AttendanceSession | null>(null);

  // Roster Marking
  const [roster, setRoster] = React.useState<Array<{ studentId: number; rollNo: string; name: string; status: "PRESENT" | "ABSENT" | "LEAVE" }>>([]);
  const [isSavingAttendance, setIsSavingAttendance] = React.useState(false);

  // Load subjects
  React.useEffect(() => {
    async function loadSubjects() {
      try {
        setIsLoading(true);
        const res = await apiClient<PaginatedResponse<Subject>>("/subjects/");
        setSubjects(res.results);
        if (res.results.length > 0) {
          setSelectedSubjectId(res.results[0].id);
        }
      } catch {
        toastError("Error", "Could not load academic subjects.");
      } finally {
        setIsLoading(false);
      }
    }
    loadSubjects();
  }, [toastError]);

  // Load sessions or student summary when subject changes
  const loadSessionsForSubject = React.useCallback(async (subId: number) => {
    try {
      if (user?.role === "STUDENT") {
        const summary = await apiClient<{
          total_sessions: number;
          present_sessions: number;
          percentage: number;
          min_required_pct: number;
          is_low_attendance: boolean;
        }>("/attendance-sessions/student-summary/", {
          params: { subject_id: subId },
        });
        setStudentSummary(summary);
      } else {
        const res = await apiClient<PaginatedResponse<AttendanceSession>>("/attendance-sessions/", {
          params: { subject: subId },
        });
        setSessions(res.results);
      }
    } catch {
      // quiet catch
    }
  }, [user?.role]);

  React.useEffect(() => {
    if (selectedSubjectId) {
      loadSessionsForSubject(selectedSubjectId);
    }
  }, [selectedSubjectId, loadSessionsForSubject]);

  // Open modal and load class roster
  const handleOpenTakeAttendance = async () => {
    if (!selectedSubjectId) return;
    const sub = subjects.find((s) => s.id === selectedSubjectId);
    if (!sub) return;

    try {
      // Fetch class group students
      const usersRes = await apiClient<PaginatedResponse<User>>("/users/", {
        params: { role: "STUDENT", page_size: 100 },
      });
      // All present by default per spec
      const initialRoster = usersRes.results.map((u) => ({
        studentId: u.student_profile?.id || u.id,
        rollNo: u.student_profile?.roll_no || "23CSE000",
        name: u.full_name,
        status: "PRESENT" as const,
      }));
      setRoster(initialRoster);
      setIsNewSessionOpen(true);
    } catch {
      toastError("Error", "Could not load student roster.");
    }
  };

  const toggleStudentStatus = (studentId: number) => {
    setRoster((prev) =>
      prev.map((item) => {
        if (item.studentId === studentId) {
          const nextStatus = item.status === "PRESENT" ? "ABSENT" : item.status === "ABSENT" ? "LEAVE" : "PRESENT";
          return { ...item, status: nextStatus };
        }
        return item;
      })
    );
  };

  const handleMarkAll = (statusVal: "PRESENT" | "ABSENT") => {
    setRoster((prev) => prev.map((item) => ({ ...item, status: statusVal })));
  };

  const handleSaveAttendance = async () => {
    if (!selectedSubjectId) return;

    try {
      setIsSavingAttendance(true);

      // 1. Create or get session
      const sessRes = await apiClient<AttendanceSession>("/attendance-sessions/", {
        method: "POST",
        body: JSON.stringify({
          subject: selectedSubjectId,
          date: sessionDate,
          kind: sessionKind,
          slot: sessionSlot,
        }),
      });

      // 2. Bulk save records in one request
      await apiClient<{ detail: string }>("/attendance-sessions/bulk-save/", {
        method: "POST",
        body: JSON.stringify({
          session_id: sessRes.id,
          records: roster.map((r) => ({
            student_id: r.studentId,
            status: r.status,
          })),
        }),
      });

      success("Attendance recorded", `Marked ${roster.length} students for ${sessRes.date}.`);
      setIsNewSessionOpen(false);
      loadSessionsForSubject(selectedSubjectId);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError("Failed to save", apiErr?.detail || "Could not save attendance.");
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const handleViewSession = async (session: AttendanceSession) => {
    try {
      const full = await apiClient<AttendanceSession>(`/attendance-sessions/${session.id}/`);
      setActiveSession(full);
    } catch {
      toastError("Error", "Could not load session records.");
    }
  };

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Attendance Register</h2>
          <p className="text-xs text-slate-500">
            {user?.role === "STUDENT"
              ? "View your personal attendance history and cutoff status."
              : "Mark classroom attendance, edit past registers, and monitor student percentages."}
          </p>
        </div>

        {/* Subject Selector & Action */}
        <div className="flex items-center gap-3">
          <select
            value={selectedSubjectId || ""}
            onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>

          {user?.role !== "STUDENT" && (
            <Button size="sm" onClick={handleOpenTakeAttendance}>
              <Plus className="h-4 w-4 mr-1.5" /> Mark Session
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : user?.role === "STUDENT" ? (
        <div className="space-y-6 max-w-xl">
          <Card className="p-6">
            <CardHeader>
              <div>
                <CardTitle>{currentSubject?.name || "Subject"}</CardTitle>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{currentSubject?.code}</p>
              </div>
              {studentSummary && (
                <Badge variant={studentSummary.is_low_attendance ? "danger" : "success"}>
                  {studentSummary.is_low_attendance ? "Below Cutoff (Risk)" : "Good Standing"}
                </Badge>
              )}
            </CardHeader>

            {studentSummary ? (
              <div className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-slate-900">{studentSummary.percentage}%</span>
                  <span className="text-xs text-slate-500">
                    {studentSummary.present_sessions} attended of {studentSummary.total_sessions} sessions
                  </span>
                </div>

                <ProgressBar
                  value={studentSummary.percentage}
                  variant={studentSummary.percentage < 75 ? "danger" : "success"}
                />

                {studentSummary.is_low_attendance && (
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Attendance Warning</p>
                      <p className="mt-0.5">
                        Your attendance is below the minimum required {studentSummary.min_required_pct}%. Please attend upcoming classes to clear academic risk.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Skeleton className="h-24 w-full" />
            )}
          </Card>
        </div>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-600" />
              Recorded Attendance Sessions for {currentSubject?.code}
            </h3>
            <span className="text-xs text-slate-500">{sessions.length} sessions logged</span>
          </div>

          {sessions.length === 0 ? (
            <EmptyState
              title="No attendance sessions recorded yet"
              description="Click 'Mark Session' above to take attendance for today."
              action={
                <Button size="sm" onClick={handleOpenTakeAttendance}>
                  <Plus className="h-4 w-4 mr-1.5" /> Take Attendance
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Slot</TableHead>
                  <TableHead>Present / Total</TableHead>
                  <TableHead>Attendance %</TableHead>
                  <TableHead>Marked By</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => {
                  const pct = s.total_marked > 0 ? Math.round((s.present_count / s.total_marked) * 100) : 0;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-semibold text-slate-900">{s.date}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{s.kind}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">Slot {s.slot}</TableCell>
                      <TableCell className="text-xs font-medium text-slate-700">
                        {s.present_count} / {s.total_marked}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${pct < 75 ? "text-red-600" : "text-emerald-600"}`}>
                            {pct}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{s.marked_by_name || "Faculty"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleViewSession(s)}>
                          View Records
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* Take Attendance Modal */}
      <Dialog
        isOpen={isNewSessionOpen}
        onClose={() => setIsNewSessionOpen(false)}
        title={`Mark Attendance: ${currentSubject?.code || ""}`}
        description="Toggle status for individual students (Present / Absent / Leave). All present by default."
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <Input
              label="Session Date"
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              required
            />
            <Select
              label="Kind"
              value={sessionKind}
              onChange={(e) => setSessionKind(e.target.value as "LECTURE" | "PRACTICAL" | "TUTORIAL")}
            >
              <option value="LECTURE">Lecture</option>
              <option value="PRACTICAL">Practical</option>
              <option value="TUTORIAL">Tutorial</option>
            </Select>
            <Select
              label="Slot"
              value={sessionSlot}
              onChange={(e) => setSessionSlot(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <option key={num} value={num}>Slot {num}</option>
              ))}
            </Select>
          </div>

          {/* Quick Roster Actions */}
          <div className="flex items-center justify-between py-1">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleMarkAll("PRESENT")}
                className="text-emerald-700 hover:underline font-semibold flex items-center gap-1"
              >
                <Check className="h-3 w-3" /> Mark All Present
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => handleMarkAll("ABSENT")}
                className="text-red-700 hover:underline font-semibold flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Mark All Absent
              </button>
            </div>
            <span className="text-slate-500 font-medium">
              {roster.filter((r) => r.status === "PRESENT").length} / {roster.length} Present
            </span>
          </div>

          {/* Roster List */}
          <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
            {roster.map((st) => (
              <div
                key={st.studentId}
                onClick={() => toggleStudentStatus(st.studentId)}
                className="flex items-center justify-between p-2.5 hover:bg-slate-50 cursor-pointer select-none transition-colors"
              >
                <div>
                  <span className="font-mono font-semibold text-slate-800">{st.rollNo}</span>
                  <span className="ml-3 text-slate-700">{st.name}</span>
                </div>
                <div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                      st.status === "PRESENT"
                        ? "bg-emerald-100 text-emerald-800"
                        : st.status === "ABSENT"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {st.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsNewSessionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAttendance} isLoading={isSavingAttendance}>
              <Save className="h-4 w-4 mr-1.5" /> Save Attendance
            </Button>
          </div>
        </div>
      </Dialog>

      {/* View Session Records Modal */}
      <Dialog
        isOpen={!!activeSession}
        onClose={() => setActiveSession(null)}
        title={`Session Records: ${activeSession?.date || ""}`}
        description={`Slot ${activeSession?.slot || 1} (${activeSession?.kind || "Lecture"})`}
      >
        <div className="space-y-3 text-xs">
          <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
            {activeSession?.records?.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-2.5">
                <div>
                  <span className="font-mono font-semibold text-slate-800">{r.student_roll}</span>
                  <span className="ml-3 text-slate-700">{r.student_name}</span>
                </div>
                <Badge variant={r.status === "PRESENT" ? "success" : "danger"}>
                  {r.status}
                </Badge>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={() => setActiveSession(null)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
