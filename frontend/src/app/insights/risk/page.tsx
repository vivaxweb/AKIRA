"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent, Badge, Skeleton, EmptyState } from "@/components/ui/CardsAndFeedback";
import { Dialog } from "@/components/ui/DialogAndTable";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { ClassGroup, StudentRiskProfile, Intervention } from "@/types";
import {
  AlertTriangle,
  ShieldAlert,
  TrendingDown,
  UserCheck,
  Search,
  CheckCircle2,
  PlusCircle,
  History,
} from "lucide-react";

export default function AcademicRiskPage() {
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  // Filters
  const [selectedClassGroup, setSelectedClassGroup] = useState<string>("");
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [interveneStudent, setInterveneStudent] = useState<StudentRiskProfile | null>(null);
  const [historyStudent, setHistoryStudent] = useState<StudentRiskProfile | null>(null);

  // Intervention Form State
  const [intType, setIntType] = useState<string>("COUNSELING");
  const [intReason, setIntReason] = useState<string>("");
  const [intRemarks, setIntRemarks] = useState<string>("");

  // Resolve Form State
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [actionTaken, setActionTaken] = useState<string>("");

  // Fetch Class Groups
  const { data: classGroups = [] } = useQuery<ClassGroup[]>({
    queryKey: ["class-groups"],
    queryFn: async () => {
      const res = await api.get<ClassGroup[] | { results: ClassGroup[] }>("/academics/class-groups/");
      return Array.isArray(res) ? res : res.results;
    },
  });

  // Fetch Risk Profiles
  const {
    data: riskProfiles = [],
    isLoading,
    refetch,
  } = useQuery<StudentRiskProfile[]>({
    queryKey: ["student-risk", selectedClassGroup, selectedRiskLevel, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedClassGroup) params.append("class_group_id", selectedClassGroup);
      if (selectedRiskLevel) params.append("risk_level", selectedRiskLevel);
      if (searchQuery) params.append("search", searchQuery);
      return api.get<StudentRiskProfile[]>(`/insights/student-risk/?${params.toString()}`);
    },
  });

  // Fetch Interventions for History Modal
  const { data: studentInterventions = [], refetch: refetchInterventions } = useQuery<Intervention[]>({
    queryKey: ["student-interventions", historyStudent?.student_id],
    queryFn: async () => {
      if (!historyStudent) return [];
      const res = await api.get<Intervention[] | { results: Intervention[] }>(
        `/insights/interventions/?student=${historyStudent.student_id}`
      );
      return Array.isArray(res) ? res : res.results;
    },
    enabled: !!historyStudent,
  });

  // Create Intervention Mutation
  const createInterventionMutation = useMutation({
    mutationFn: async (payload: {
      student: number;
      intervention_type: string;
      reason: string;
      remarks: string;
    }) => {
      return api.post("/insights/interventions/", payload);
    },
    onSuccess: () => {
      success("Intervention logged successfully");
      setInterveneStudent(null);
      setIntReason("");
      setIntRemarks("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["student-risk"] });
    },
    onError: (err: unknown) => {
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "Failed to log intervention";
      toastError(msg);
    },
  });

  // Resolve Intervention Mutation
  const resolveInterventionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: string }) => {
      return api.post(`/insights/interventions/${id}/resolve/`, {
        action_taken: action,
        status: "RESOLVED",
      });
    },
    onSuccess: () => {
      success("Intervention marked as resolved");
      setResolvingId(null);
      setActionTaken("");
      refetchInterventions();
      refetch();
      queryClient.invalidateQueries({ queryKey: ["student-risk"] });
    },
    onError: (err: unknown) => {
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "Failed to resolve intervention";
      toastError(msg);
    },
  });

  const handleOpenIntervene = (student: StudentRiskProfile) => {
    setInterveneStudent(student);
    setIntReason(student.risk_reasons[0] || "Academic Performance Support");
    setIntRemarks("");
  };

  const handleSaveIntervention = (e: React.FormEvent) => {
    e.preventDefault();
    if (!interveneStudent) return;
    createInterventionMutation.mutate({
      student: interveneStudent.student_id,
      intervention_type: intType,
      reason: intReason,
      remarks: intRemarks,
    });
  };

  // KPI Calculations
  const totalCount = riskProfiles.length;
  const highRiskCount = riskProfiles.filter((s) => s.risk_level === "HIGH").length;
  const mediumRiskCount = riskProfiles.filter((s) => s.risk_level === "MEDIUM").length;
  const lowAttendanceCount = riskProfiles.filter((s) => s.risk_flags.attendance).length;
  const gradeDropCount = riskProfiles.filter((s) => s.risk_flags.grade_drop).length;

  return (
    <div className="space-y-6">
      {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Risk Engine</h1>
            <p className="text-sm text-slate-500 mt-1">
              Early warning intelligence: Automated detection for low attendance (&lt;75%), score drops (&ge;15%), and assessment failures.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Refresh Risk Data
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-slate-200">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Students Monitored</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
              <p className="text-xs text-slate-400 mt-1">Active CSE enrollment</p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wider">High Risk</p>
                <ShieldAlert className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-600 mt-1">{highRiskCount}</p>
              <p className="text-xs text-red-500 mt-1">Requires immediate intervention</p>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Medium Risk</p>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-amber-600 mt-1">{mediumRiskCount}</p>
              <p className="text-xs text-amber-500 mt-1">Single risk trigger</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attendance Alerts</p>
                <UserCheck className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-1">{lowAttendanceCount}</p>
              <p className="text-xs text-slate-400 mt-1">&lt;75% mandatory threshold</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Grade Drops</p>
                <TrendingDown className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-1">{gradeDropCount}</p>
              <p className="text-xs text-slate-400 mt-1">&ge;15% drop CIE 1 &rarr; CIE 2</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Controls */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <Select
                  value={selectedClassGroup}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedClassGroup(e.target.value)}
                  className="w-full sm:w-48 text-sm"
                >
                  <option value="">All Class Groups</option>
                  {classGroups.map((cg) => (
                    <option key={cg.id} value={cg.id}>
                      {cg.name}
                    </option>
                  ))}
                </Select>

                <div className="flex items-center rounded-lg border border-slate-200 p-1 bg-slate-50 text-xs">
                  <button
                    onClick={() => setSelectedRiskLevel("")}
                    className={`px-3 py-1 rounded font-medium transition ${
                      selectedRiskLevel === "" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setSelectedRiskLevel("HIGH")}
                    className={`px-3 py-1 rounded font-medium transition ${
                      selectedRiskLevel === "HIGH" ? "bg-red-600 text-white shadow-sm" : "text-red-600 hover:text-red-700"
                    }`}
                  >
                    High Risk
                  </button>
                  <button
                    onClick={() => setSelectedRiskLevel("MEDIUM")}
                    className={`px-3 py-1 rounded font-medium transition ${
                      selectedRiskLevel === "MEDIUM" ? "bg-amber-500 text-white shadow-sm" : "text-amber-600 hover:text-amber-700"
                    }`}
                  >
                    Medium
                  </button>
                  <button
                    onClick={() => setSelectedRiskLevel("LOW")}
                    className={`px-3 py-1 rounded font-medium transition ${
                      selectedRiskLevel === "LOW" ? "bg-emerald-600 text-white shadow-sm" : "text-emerald-600 hover:text-emerald-700"
                    }`}
                  >
                    On Track
                  </button>
                </div>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search student or roll no..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Table */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center justify-between">
              <span>Risk Roster ({riskProfiles.length})</span>
              <span className="text-xs font-normal text-slate-500">Sorted by risk severity &amp; lowest attendance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : riskProfiles.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="w-8 h-8 text-emerald-500" />}
                title="No students match the criteria"
                description="All evaluated students are within safe attendance and grade thresholds."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Class</th>
                      <th className="py-3 px-4">Attendance</th>
                      <th className="py-3 px-4">CIE Average</th>
                      <th className="py-3 px-4">Risk Triggers</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Intervention</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {riskProfiles.map((student) => {
                      const isHigh = student.risk_level === "HIGH";
                      const isMedium = student.risk_level === "MEDIUM";

                      return (
                        <tr
                          key={student.student_id}
                          className={`hover:bg-slate-50/80 transition ${
                            isHigh ? "bg-red-50/20" : isMedium ? "bg-amber-50/15" : ""
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div>
                              <span className="font-semibold text-slate-900 block">{student.full_name}</span>
                              <span className="text-xs font-mono text-slate-500">
                                {student.roll_number || "No Roll"} &bull; {student.email}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs font-medium text-slate-600">
                            {student.class_group_name}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                                student.overall_attendance_pct < 65
                                  ? "bg-red-100 text-red-800"
                                  : student.overall_attendance_pct < 75
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {student.overall_attendance_pct}%
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-0.5">
                              {student.attended_sessions}/{student.total_sessions} sessions
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800">{student.marks_avg_pct}%</span>
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {student.risk_flags.attendance && (
                                <Badge variant="danger" className="text-[11px] py-0">
                                  Low Attendance
                                </Badge>
                              )}
                              {student.risk_flags.grade_drop && (
                                <Badge variant="warning" className="text-[11px] py-0">
                                  Grade Drop &ge;15%
                                </Badge>
                              )}
                              {student.risk_flags.failing && (
                                <Badge variant="danger" className="text-[11px] py-0">
                                  Failed {student.failed_assessments_count} Exams
                                </Badge>
                              )}
                              {!student.risk_flags.attendance &&
                                !student.risk_flags.grade_drop &&
                                !student.risk_flags.failing && (
                                  <span className="text-xs text-emerald-600 font-medium">On Track</span>
                                )}
                            </div>
                            {student.risk_reasons.length > 0 && (
                              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1" title={student.risk_reasons.join(" | ")}>
                                {student.risk_reasons[0]}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {isHigh ? (
                              <Badge variant="danger">HIGH RISK</Badge>
                            ) : isMedium ? (
                              <Badge variant="warning">MEDIUM</Badge>
                            ) : (
                              <Badge variant="success">ON TRACK</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {student.latest_intervention ? (
                              <div className="text-xs">
                                <span className="font-medium text-slate-700 block">
                                  {student.latest_intervention.type}
                                </span>
                                <span
                                  className={`inline-block text-[10px] font-semibold uppercase ${
                                    student.latest_intervention.status === "RESOLVED"
                                      ? "text-emerald-600"
                                      : "text-amber-600"
                                  }`}
                                >
                                  {student.latest_intervention.status}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">None logged</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-xs"
                                onClick={() => handleOpenIntervene(student)}
                              >
                                <PlusCircle className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                                Intervene
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-xs text-slate-600"
                                onClick={() => setHistoryStudent(student)}
                                title="View History"
                              >
                                <History className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal: Log Academic Intervention */}
        <Dialog
          isOpen={!!interveneStudent}
          onClose={() => setInterveneStudent(null)}
          title={`Log Intervention — ${interveneStudent?.full_name}`}
        >
          {interveneStudent && (
            <form onSubmit={handleSaveIntervention} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                <p>
                  <span className="font-semibold text-slate-700">Roll No:</span> {interveneStudent.roll_number} &bull;{" "}
                  <span className="font-semibold text-slate-700">Class:</span> {interveneStudent.class_group_name}
                </p>
                <p>
                  <span className="font-semibold text-slate-700">Attendance:</span> {interveneStudent.overall_attendance_pct}% &bull;{" "}
                  <span className="font-semibold text-slate-700">CIE Average:</span> {interveneStudent.marks_avg_pct}%
                </p>
                {interveneStudent.risk_reasons.length > 0 && (
                  <p className="text-red-700 font-medium">
                    Flags: {interveneStudent.risk_reasons.join(", ")}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Intervention Strategy
                </label>
                <Select value={intType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setIntType(e.target.value)} className="w-full text-sm">
                  <option value="COUNSELING">Academic Counseling (1-on-1)</option>
                  <option value="REMEDIAL">Remedial Classes / Practical Makeup</option>
                  <option value="PARENT_MEETING">Parent-Teacher Conference</option>
                  <option value="ATTENDANCE_WARNING">Formal Attendance Notice / Warning</option>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Trigger Reason
                </label>
                <Input
                  type="text"
                  value={intReason}
                  onChange={(e) => setIntReason(e.target.value)}
                  placeholder="e.g. Attendance below 75% cutoff or Grade dropped in CIE-2"
                  className="w-full text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Action Plan &amp; Remarks
                </label>
                <textarea
                  value={intRemarks}
                  onChange={(e) => setIntRemarks(e.target.value)}
                  rows={4}
                  placeholder="Describe guidance discussed, study plan recommended, or parent communication details..."
                  className="w-full rounded-md border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setInterveneStudent(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createInterventionMutation.isPending}>
                  {createInterventionMutation.isPending ? "Logging..." : "Save Intervention"}
                </Button>
              </div>
            </form>
          )}
        </Dialog>

        {/* Modal: History & Resolution */}
        <Dialog
          isOpen={!!historyStudent}
          onClose={() => {
            setHistoryStudent(null);
            setResolvingId(null);
            setActionTaken("");
          }}
          title={`Intervention History — ${historyStudent?.full_name}`}
        >
          <div className="space-y-4">
            {studentInterventions.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">
                No prior interventions logged for this student.
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {studentInterventions.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 border border-slate-200 rounded-lg text-sm space-y-2 bg-white"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{item.intervention_type_display}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-semibold ${
                          item.status === "RESOLVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.status === "IN_PROGRESS"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {item.status_display}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 font-medium">{item.reason}</p>
                    <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded">{item.remarks}</p>

                    {item.action_taken && (
                      <div className="text-xs text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-100">
                        <span className="font-semibold">Resolution Action:</span> {item.action_taken}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Logged by {item.created_by_name}</span>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>

                    {/* Resolution button / form if not yet resolved */}
                    {item.status !== "RESOLVED" && (
                      <div className="pt-2 border-t border-slate-100">
                        {resolvingId === item.id ? (
                          <div className="space-y-2 mt-2">
                            <textarea
                              value={actionTaken}
                              onChange={(e) => setActionTaken(e.target.value)}
                              placeholder="Document the resolution outcome (e.g. Student attended makeup sessions, parent agreed to remedial plan)..."
                              rows={2}
                              className="w-full text-xs p-2 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500"
                              required
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => setResolvingId(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                                disabled={!actionTaken.trim() || resolveInterventionMutation.isPending}
                                onClick={() =>
                                  resolveInterventionMutation.mutate({
                                    id: item.id,
                                    action: actionTaken,
                                  })
                                }
                              >
                                Mark Resolved
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                            onClick={() => {
                              setResolvingId(item.id);
                              setActionTaken("");
                            }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Resolve Intervention
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Dialog>
      </div>
  );
}
