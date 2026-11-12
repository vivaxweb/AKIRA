"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { Subject, SyllabusTopic, PaginatedResponse } from "@/types";
import { Card, Badge, EmptyState, ProgressBar } from "@/components/ui/CardsAndFeedback";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Dialog } from "@/components/ui/DialogAndTable";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { Clock } from "lucide-react";

export default function SyllabusCoveragePage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<number | null>(null);
  const [topics, setTopics] = React.useState<SyllabusTopic[]>([]);

  // Coverage Modal
  const [activeTopic, setActiveTopic] = React.useState<SyllabusTopic | null>(null);
  const [coveredDate, setCoveredDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [coveredRemarks, setCoveredRemarks] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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

  const loadTopics = React.useCallback(async (subId: number) => {
    try {
      const res = await apiClient<PaginatedResponse<SyllabusTopic>>("/syllabus-topics/", {
        params: { subject: subId },
      });
      setTopics(res.results);
    } catch {
      // quiet catch
    }
  }, []);

  React.useEffect(() => {
    if (selectedSubjectId) {
      loadTopics(selectedSubjectId);
    }
  }, [selectedSubjectId, loadTopics]);

  const handleMarkCovered = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTopic) return;

    try {
      setIsSubmitting(true);
      await apiClient<{ id: number }>(`/syllabus-topics/${activeTopic.id}/mark-covered/`, {
        method: "POST",
        body: JSON.stringify({
          covered_on: coveredDate,
          remarks: coveredRemarks,
        }),
      });
      success("Coverage logged", `Topic marked as covered on ${coveredDate}.`);
      setActiveTopic(null);
      if (selectedSubjectId) loadTopics(selectedSubjectId);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError("Failed", apiErr?.detail || "Could not mark topic coverage.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPlannedHours = topics.reduce((sum, t) => sum + t.planned_hours, 0);
  const coveredHours = topics.filter((t) => t.is_covered).reduce((sum, t) => sum + t.planned_hours, 0);
  const coveragePct = totalPlannedHours > 0 ? Math.round((coveredHours / totalPlannedHours) * 100) : 0;

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Syllabus Coverage & Unit Tracking</h2>
          <p className="text-xs text-slate-500">
            Track completion of syllabus units, planned teaching hours, and coverage logs.
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
        </div>
      </div>

      {/* Progress Metric Card */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {currentSubject?.name} ({currentSubject?.code})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Faculty Instructor: {currentSubject?.faculty_name || "Unassigned"}
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-2xl font-black text-slate-900">{coveragePct}%</span>
              <p className="text-[11px] text-slate-500">Hours Completed</p>
            </div>
            <div className="text-right border-l border-slate-200 pl-6">
              <span className="text-lg font-bold text-indigo-700">{coveredHours} / {totalPlannedHours}</span>
              <p className="text-[11px] text-slate-500">Teaching Hours</p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <ProgressBar value={coveragePct} variant={coveragePct >= 75 ? "success" : "primary"} />
        </div>
      </Card>

      {/* Topics Table */}
      <Card className="p-0 overflow-hidden">
        {topics.length === 0 ? (
          <EmptyState
            title="No syllabus topics configured"
            description="No lecture units or planned topics are loaded for this subject."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Unit</TableHead>
                <TableHead className="w-16">Order</TableHead>
                <TableHead>Topic Title</TableHead>
                <TableHead className="w-32">Planned Hours</TableHead>
                <TableHead className="w-36">Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topics.map((top) => (
                <TableRow key={top.id}>
                  <TableCell className="font-semibold text-slate-900">Unit {top.unit_no}</TableCell>
                  <TableCell className="text-xs text-slate-500">#{top.order}</TableCell>
                  <TableCell className="font-medium text-slate-800">{top.title}</TableCell>
                  <TableCell className="text-xs text-slate-600 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" /> {top.planned_hours} Hours
                  </TableCell>
                  <TableCell>
                    {top.is_covered ? (
                      <Badge variant="success">Covered ({top.covered_on || "Logged"})</Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {user?.role !== "STUDENT" && (
                      <Button
                        size="sm"
                        variant={top.is_covered ? "outline" : "secondary"}
                        onClick={() => {
                          setActiveTopic(top);
                          setCoveredRemarks("");
                        }}
                      >
                        {top.is_covered ? "Update Log" : "Mark Covered"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Coverage Log Modal */}
      <Dialog
        isOpen={!!activeTopic}
        onClose={() => setActiveTopic(null)}
        title="Log Syllabus Topic Coverage"
        description={`Record completion of: ${activeTopic?.title || ""}`}
      >
        <form onSubmit={handleMarkCovered} className="space-y-4 text-xs">
          <Input
            label="Date Covered"
            type="date"
            value={coveredDate}
            onChange={(e) => setCoveredDate(e.target.value)}
            required
          />

          <Textarea
            label="Teaching Remarks / Notes"
            placeholder="e.g. Conducted lecture with slide deck and coding demo; student Q&A."
            value={coveredRemarks}
            onChange={(e) => setCoveredRemarks(e.target.value)}
            rows={3}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setActiveTopic(null)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Coverage
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
