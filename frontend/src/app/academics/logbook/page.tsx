"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { Subject, LogbookEntry, PaginatedResponse } from "@/types";
import { Card, Badge, Skeleton, EmptyState } from "@/components/ui/CardsAndFeedback";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Dialog } from "@/components/ui/DialogAndTable";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { Plus, MessageSquare } from "lucide-react";

export default function LogbookPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [entries, setEntries] = React.useState<LogbookEntry[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // New Entry Modal
  const [isNewEntryOpen, setIsNewEntryOpen] = React.useState(false);
  const [selectedSubId, setSelectedSubId] = React.useState<number | null>(null);
  const [entryDate, setEntryDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [entryHours, setEntryHours] = React.useState(1);
  const [entryTopics, setEntryTopics] = React.useState("");
  const [entryRemarks, setEntryRemarks] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // HOD Review Modal
  const [activeEntry, setActiveEntry] = React.useState<LogbookEntry | null>(null);
  const [hodRemark, setHodRemark] = React.useState("");
  const [isReviewing, setIsReviewing] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const [entriesRes, subRes] = await Promise.all([
        apiClient<PaginatedResponse<LogbookEntry>>("/logbook-entries/"),
        apiClient<PaginatedResponse<Subject>>("/subjects/"),
      ]);
      setEntries(entriesRes.results);
      setSubjects(subRes.results);
      if (subRes.results.length > 0 && selectedSubId === null) {
        setSelectedSubId(subRes.results[0].id);
      }
    } catch {
      toastError("Error", "Could not load logbook entries.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedSubId, toastError]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubId) return;

    try {
      setIsSubmitting(true);
      await apiClient<LogbookEntry>("/logbook-entries/", {
        method: "POST",
        body: JSON.stringify({
          subject: selectedSubId,
          date: entryDate,
          hours: entryHours,
          topics_taught: entryTopics,
          remarks: entryRemarks,
        }),
      });
      success("Log entry saved", "Teaching session recorded in digital logbook.");
      setIsNewEntryOpen(false);
      setEntryTopics("");
      setEntryRemarks("");
      fetchData();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError("Failed", apiErr?.detail || "Could not save logbook entry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntry) return;

    try {
      setIsReviewing(true);
      await apiClient<LogbookEntry>(`/logbook-entries/${activeEntry.id}/review/`, {
        method: "POST",
        body: JSON.stringify({ hod_remark: hodRemark }),
      });
      success("Review saved", "HOD remarks recorded on logbook entry.");
      setActiveEntry(null);
      setHodRemark("");
      fetchData();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError("Review failed", apiErr?.detail || "Could not save review.");
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Digital Teaching Logbook</h2>
          <p className="text-xs text-slate-500">
            Daily lecture session logs, hours taken, topics covered, and HOD supervisory reviews.
          </p>
        </div>

        {user?.role !== "STUDENT" && (
          <Button size="sm" onClick={() => setIsNewEntryOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> New Log Entry
          </Button>
        )}
      </div>

      {/* Logbook Table */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            title="No logbook entries"
            description="Record your daily classroom sessions to maintain the department teaching register."
            action={
              user?.role !== "STUDENT" ? (
                <Button size="sm" onClick={() => setIsNewEntryOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" /> Record Today&apos;s Class
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Faculty</TableHead>
                <TableHead className="w-16">Hours</TableHead>
                <TableHead>Topics Taught</TableHead>
                <TableHead>HOD Review</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-semibold text-slate-900 text-xs whitespace-nowrap">
                    {entry.date}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-700 whitespace-nowrap">
                    {entry.subject_code}
                  </TableCell>
                  <TableCell className="text-xs text-slate-800 font-medium">
                    {entry.faculty_name}
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-slate-700">
                    {entry.hours}h
                  </TableCell>
                  <TableCell className="text-xs text-slate-700 max-w-xs">
                    <p className="font-medium text-slate-900">{entry.topics_taught}</p>
                    {entry.remarks && (
                      <p className="text-[11px] text-slate-500 italic mt-0.5">Remarks: {entry.remarks}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {entry.hod_reviewed_at ? (
                      <div className="text-xs">
                        <Badge variant="success">Reviewed</Badge>
                        {entry.hod_remark && (
                          <p className="text-[11px] text-slate-600 mt-1">&ldquo;{entry.hod_remark}&rdquo;</p>
                        )}
                      </div>
                    ) : (
                      <Badge variant="warning">Pending Review</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {user?.role === "HOD" && (
                      <Button
                        size="sm"
                        variant={entry.hod_reviewed_at ? "ghost" : "secondary"}
                        onClick={() => {
                          setActiveEntry(entry);
                          setHodRemark(entry.hod_remark || "");
                        }}
                      >
                        <MessageSquare className="h-3.5 w-3.5 mr-1" />
                        {entry.hod_reviewed_at ? "Edit Remark" : "Review"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* New Logbook Entry Modal */}
      <Dialog
        isOpen={isNewEntryOpen}
        onClose={() => setIsNewEntryOpen(false)}
        title="Add Logbook Entry"
        description="Record a classroom or laboratory session in the department logbook."
      >
        <form onSubmit={handleCreateEntry} className="space-y-4 text-xs">
          <Select
            label="Subject"
            value={selectedSubId || ""}
            onChange={(e) => setSelectedSubId(Number(e.target.value))}
            required
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              required
            />
            <Input
              label="Hours Taken"
              type="number"
              min={1}
              max={6}
              value={entryHours}
              onChange={(e) => setEntryHours(Number(e.target.value))}
              required
            />
          </div>

          <Textarea
            label="Topics Taught & Exercises Conducted"
            placeholder="e.g. Unit 2: Relational schema design, foreign keys, and student lab queries."
            value={entryTopics}
            onChange={(e) => setEntryTopics(e.target.value)}
            rows={3}
            required
          />

          <Input
            label="Additional Remarks (Optional)"
            placeholder="e.g. Lab exercise 3 completed by all batches."
            value={entryRemarks}
            onChange={(e) => setEntryRemarks(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsNewEntryOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Entry
            </Button>
          </div>
        </form>
      </Dialog>

      {/* HOD Review Modal */}
      <Dialog
        isOpen={!!activeEntry}
        onClose={() => setActiveEntry(null)}
        title="HOD Logbook Review"
        description={`Review entry by ${activeEntry?.faculty_name || "Faculty"} on ${activeEntry?.date || ""}.`}
      >
        <form onSubmit={handleReviewEntry} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="font-semibold text-slate-800">{activeEntry?.topics_taught}</p>
            {activeEntry?.remarks && (
              <p className="text-slate-500 mt-1 italic">Remarks: {activeEntry.remarks}</p>
            )}
          </div>

          <Textarea
            label="HOD Supervisory Remark"
            placeholder="e.g. Verified syllabus coverage on track. Good practical emphasis."
            value={hodRemark}
            onChange={(e) => setHodRemark(e.target.value)}
            rows={3}
            required
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setActiveEntry(null)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isReviewing}>
              Submit Review
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
