"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { Subject, Assessment, Mark, PaginatedResponse, User } from "@/types";
import { Card, CardHeader, CardTitle, Badge, EmptyState } from "@/components/ui/CardsAndFeedback";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Dialog } from "@/components/ui/DialogAndTable";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  Plus,
  Save,
  Globe,
} from "lucide-react";

export default function MarksPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<number | null>(null);
  const [assessments, setAssessments] = React.useState<Assessment[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = React.useState<number | null>(null);

  // Student Marks View
  const [studentMarks, setStudentMarks] = React.useState<Mark[]>([]);

  // Assessment Creation Modal
  const [isNewAssmOpen, setIsNewAssmOpen] = React.useState(false);
  const [assmName, setAssmName] = React.useState("");
  const [assmKind, setAssmKind] = React.useState<"CIE" | "ASSIGNMENT" | "PRACTICAL" | "OTHER">("CIE");
  const [assmMaxMarks, setAssmMaxMarks] = React.useState("20.00");
  const [assmDate, setAssmDate] = React.useState(new Date().toISOString().split("T")[0]);

  // Marks Grid Data (Keyboard-friendly)
  const [gridData, setGridData] = React.useState<
    Array<{ studentId: number; rollNo: string; name: string; marks: string; isAbsent: boolean }>
  >([]);
  const [isSavingMarks, setIsSavingMarks] = React.useState(false);
  const [gridError, setGridError] = React.useState<string | null>(null);

  // Load subjects
  React.useEffect(() => {
    async function loadSubjects() {
      try {
        const res = await apiClient<PaginatedResponse<Subject>>("/subjects/");
        setSubjects(res.results);
        if (res.results.length > 0) {
          setSelectedSubjectId(res.results[0].id);
        }
      } catch {
        toastError("Error", "Could not load subjects.");
      }
    }
    loadSubjects();
  }, [toastError]);

  // Load assessments when subject changes
  const loadAssessments = React.useCallback(async (subId: number) => {
    try {
      const res = await apiClient<PaginatedResponse<Assessment>>("/assessments/", {
        params: { subject: subId },
      });
      setAssessments(res.results);
      if (res.results.length > 0) {
        setSelectedAssessmentId(res.results[0].id);
      } else {
        setSelectedAssessmentId(null);
        setGridData([]);
      }
    } catch {
      // quiet catch
    }
  }, []);

  React.useEffect(() => {
    if (selectedSubjectId) {
      loadAssessments(selectedSubjectId);
    }
  }, [selectedSubjectId, loadAssessments]);

  // Load marks grid for active assessment (or student marks)
  React.useEffect(() => {
    async function loadMarks() {
      if (!selectedAssessmentId) return;

      if (user?.role === "STUDENT") {
        try {
          const res = await apiClient<PaginatedResponse<Mark>>("/marks/", {
            params: { assessment: selectedAssessmentId },
          });
          setStudentMarks(res.results);
        } catch {
          // quiet catch
        }
      } else {
        try {
          const [usersRes, marksRes] = await Promise.all([
            apiClient<PaginatedResponse<User>>("/users/", { params: { role: "STUDENT", page_size: 100 } }),
            apiClient<PaginatedResponse<Mark>>("/marks/", { params: { assessment: selectedAssessmentId } }),
          ]);

          const marksMap = new Map(marksRes.results.map((m) => [m.student, m]));

          const grid = usersRes.results.map((u) => {
            const sid = u.student_profile?.id || u.id;
            const existing = marksMap.get(sid);
            return {
              studentId: sid,
              rollNo: u.student_profile?.roll_no || "23CSE000",
              name: u.full_name,
              marks: existing?.marks_obtained !== null && existing?.marks_obtained !== undefined ? String(existing.marks_obtained) : "",
              isAbsent: existing?.is_absent || false,
            };
          });

          setGridData(grid);
        } catch {
          // quiet catch
        }
      }
    }
    loadMarks();
  }, [selectedAssessmentId, user?.role]);

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) return;

    try {
      const res = await apiClient<Assessment>("/assessments/", {
        method: "POST",
        body: JSON.stringify({
          subject: selectedSubjectId,
          name: assmName,
          kind: assmKind,
          max_marks: assmMaxMarks,
          date: assmDate,
          is_published: false,
        }),
      });
      success("Assessment created", `${res.name} created. You can now enter student marks.`);
      setIsNewAssmOpen(false);
      setAssmName("");
      loadAssessments(selectedSubjectId);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError("Creation failed", apiErr?.detail || "Could not create assessment.");
    }
  };

  const handlePublishAssessment = async () => {
    if (!selectedAssessmentId) return;

    try {
      await apiClient<{ detail: string }>(`/assessments/${selectedAssessmentId}/publish/`, {
        method: "POST",
      });
      success("Assessment published", "Marks are now visible on student portals.");
      if (selectedSubjectId) loadAssessments(selectedSubjectId);
    } catch {
      toastError("Error", "Could not publish assessment.");
    }
  };

  const updateStudentMark = (index: number, val: string) => {
    setGridData((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], marks: val, isAbsent: false };
      return next;
    });
  };

  const toggleStudentAbsent = (index: number) => {
    setGridData((prev) => {
      const next = [...prev];
      const newAbsent = !next[index].isAbsent;
      next[index] = {
        ...next[index],
        isAbsent: newAbsent,
        marks: newAbsent ? "0.00" : next[index].marks,
      };
      return next;
    });
  };

  const handleSaveMarks = async () => {
    if (!selectedAssessmentId) return;
    const activeAssm = assessments.find((a) => a.id === selectedAssessmentId);
    const maxM = activeAssm ? parseFloat(activeAssm.max_marks) : 100;

    // Validate client side before dispatch
    setGridError(null);
    for (const row of gridData) {
      if (!row.isAbsent && row.marks) {
        const val = parseFloat(row.marks);
        if (isNaN(val) || val < 0) {
          setGridError(`${row.rollNo}: Marks cannot be negative or invalid.`);
          return;
        }
        if (val > maxM) {
          setGridError(`${row.rollNo}: Score ${val} exceeds max marks (${maxM}).`);
          return;
        }
      }
    }

    try {
      setIsSavingMarks(true);
      await apiClient<{ detail: string }>("/assessments/bulk-save-marks/", {
        method: "POST",
        body: JSON.stringify({
          assessment_id: selectedAssessmentId,
          marks: gridData.map((row) => ({
            student_id: row.studentId,
            marks_obtained: row.isAbsent ? "0.00" : row.marks ? row.marks : null,
            is_absent: row.isAbsent,
          })),
        }),
      });
      success("Marks saved", "All student scores updated successfully.");
    } catch (err: unknown) {
      const apiErr = err as { detail?: string; errors?: string[] };
      const msg = apiErr?.errors ? apiErr.errors.join("; ") : apiErr?.detail || "Could not save marks.";
      setGridError(msg);
      toastError("Validation error", msg);
    } finally {
      setIsSavingMarks(false);
    }
  };

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);
  const activeAssessment = assessments.find((a) => a.id === selectedAssessmentId);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Internal Marks & Assessments</h2>
          <p className="text-xs text-slate-500">
            {user?.role === "STUDENT"
              ? "View your scores on published internal examinations and assignments."
              : "Keyboard-friendly marks grid, validation rules, and publication controls."}
          </p>
        </div>

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
            <Button size="sm" onClick={() => setIsNewAssmOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> New Assessment
            </Button>
          )}
        </div>
      </div>

      {/* STUDENT VIEW */}
      {user?.role === "STUDENT" && (
        <Card className="p-6 max-w-xl">
          <CardHeader>
            <CardTitle>{currentSubject?.name || "Subject Marks"}</CardTitle>
            <span className="text-xs font-mono text-slate-500">{currentSubject?.code}</span>
          </CardHeader>

          {studentMarks.length === 0 ? (
            <EmptyState
              title="No published marks yet"
              description="Marks for this subject have not yet been published by the course instructor."
            />
          ) : (
            <div className="space-y-3">
              {studentMarks.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">Internal Assessment</p>
                    <p className="text-[11px] text-slate-500">{m.is_absent ? "Marked Absent" : "Graded"}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-slate-900">
                      {m.is_absent ? "0" : m.marks_obtained}
                    </span>
                    <span className="text-xs text-slate-500"> / {activeAssessment?.max_marks || 20}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* FACULTY / HOD MARKS GRID */}
      {user?.role !== "STUDENT" && (
        <div className="space-y-4">
          {/* Assessment Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2 overflow-x-auto">
              {assessments.map((assm) => (
                <button
                  key={assm.id}
                  onClick={() => setSelectedAssessmentId(assm.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    selectedAssessmentId === assm.id
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span>{assm.name}</span>
                  <Badge
                    variant={assm.is_published ? "success" : "outline"}
                    className={selectedAssessmentId === assm.id ? "bg-indigo-700 text-white border-transparent text-[10px]" : "text-[10px]"}
                  >
                    Max {assm.max_marks}
                  </Badge>
                </button>
              ))}
            </div>

            {activeAssessment && (
              <div className="flex items-center gap-2">
                {!activeAssessment.is_published ? (
                  <Button size="sm" variant="outline" onClick={handlePublishAssessment}>
                    <Globe className="h-3.5 w-3.5 mr-1 text-slate-500" /> Publish Marks
                  </Button>
                ) : (
                  <Badge variant="success">Published to Students</Badge>
                )}
                <Button size="sm" onClick={handleSaveMarks} isLoading={isSavingMarks}>
                  <Save className="h-4 w-4 mr-1.5" /> Save Grid
                </Button>
              </div>
            )}
          </div>

          {gridError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {gridError}
            </div>
          )}

          {assessments.length === 0 ? (
            <EmptyState
              title="No assessments created for this course"
              description="Click 'New Assessment' to add CIE-1, Assignments, or Practical exams."
              action={
                <Button size="sm" onClick={() => setIsNewAssmOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" /> Create Assessment
                </Button>
              }
            />
          ) : (
            <Card className="p-0 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>Use <strong>Tab</strong> or <strong>Enter</strong> to quickly move between students.</span>
                <span>Max Marks: <strong>{activeAssessment?.max_marks}</strong></span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="w-36">Score</TableHead>
                    <TableHead className="w-28 text-center">Absent?</TableHead>
                    <TableHead className="w-32">Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gridData.map((row, idx) => {
                    const maxM = activeAssessment ? parseFloat(activeAssessment.max_marks) : 100;
                    const numVal = parseFloat(row.marks);
                    const pct = !isNaN(numVal) && maxM > 0 ? Math.round((numVal / maxM) * 100) : null;

                    return (
                      <TableRow key={row.studentId}>
                        <TableCell className="font-mono font-semibold text-slate-900">{row.rollNo}</TableCell>
                        <TableCell className="text-slate-800 font-medium">{row.name}</TableCell>
                        <TableCell>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max={activeAssessment?.max_marks}
                            disabled={row.isAbsent}
                            value={row.marks}
                            onChange={(e) => updateStudentMark(idx, e.target.value)}
                            placeholder="0.00"
                            className="w-24 rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={row.isAbsent}
                            onChange={() => toggleStudentAbsent(idx)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          {row.isAbsent ? (
                            <span className="text-red-500">ABSENT</span>
                          ) : pct !== null ? (
                            <span className={pct < 40 ? "text-red-600" : "text-emerald-700"}>
                              {pct}%
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      )}

      {/* Create Assessment Modal */}
      <Dialog
        isOpen={isNewAssmOpen}
        onClose={() => setIsNewAssmOpen(false)}
        title="Create New Assessment"
        description={`Add an evaluation component for ${currentSubject?.code || "the subject"}.`}
      >
        <form onSubmit={handleCreateAssessment} className="space-y-4 text-xs">
          <Input
            label="Assessment Name"
            placeholder="e.g. CIE-1, CIE-2, or Assignment-1"
            value={assmName}
            onChange={(e) => setAssmName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Assessment Type"
              value={assmKind}
              onChange={(e) => setAssmKind(e.target.value as "CIE" | "ASSIGNMENT" | "PRACTICAL" | "OTHER")}
            >
              <option value="CIE">CIE (Internal Exam)</option>
              <option value="ASSIGNMENT">Assignment</option>
              <option value="PRACTICAL">Practical Examination</option>
              <option value="OTHER">Other Assessment</option>
            </Select>

            <Input
              label="Maximum Marks"
              type="number"
              step="1"
              value={assmMaxMarks}
              onChange={(e) => setAssmMaxMarks(e.target.value)}
              required
            />
          </div>

          <Input
            label="Examination Date"
            type="date"
            value={assmDate}
            onChange={(e) => setAssmDate(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsNewAssmOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Assessment</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
