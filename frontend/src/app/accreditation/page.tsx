"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import {
  AccreditationCriteria,
  AccreditationStatus,
  DepartmentDocument,
  Project,
} from "@/types";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Skeleton,
} from "@/components/ui/CardsAndFeedback";
import { Dialog } from "@/components/ui/DialogAndTable";
import { useToast } from "@/components/ui/Toast";
import {
  ShieldCheck,
  FileCheck2,
  FileText,
  FolderGit2,
  ExternalLink,
  Plus,
  Edit2,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

export default function AccreditationPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const [selectedCriteria, setSelectedCriteria] = useState<AccreditationCriteria | null>(null);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [isEditCriteriaModalOpen, setIsEditCriteriaModalOpen] = useState(false);

  // Evidence Form
  const [evTitle, setEvTitle] = useState("");
  const [evDescription, setEvDescription] = useState("");
  const [evDocId, setEvDocId] = useState("");
  const [evProjId, setEvProjId] = useState("");
  const [evUrl, setEvUrl] = useState("");

  // Edit Criteria Form
  const [editStatus, setEditStatus] = useState<AccreditationStatus>("IN_PROGRESS");
  const [editObtainedMarks, setEditObtainedMarks] = useState("0");

  const isStaff = user?.role === "HOD" || user?.role === "COORDINATOR" || user?.role === "PRINCIPAL";

  // Fetch Criteria List
  const { data: criteriaData, isLoading } = useQuery<{ results?: AccreditationCriteria[] } | AccreditationCriteria[]>({
    queryKey: ["accreditation-criteria"],
    queryFn: () => api.get("/reports/criteria/"),
  });

  const criteriaList: AccreditationCriteria[] = Array.isArray(criteriaData)
    ? criteriaData
    : criteriaData?.results || [];

  // Fetch Documents & Projects for Link Dropdowns
  const { data: documentsData } = useQuery<{ results?: DepartmentDocument[] } | DepartmentDocument[]>({
    queryKey: ["documents-for-evidence"],
    queryFn: () => api.get("/documents/"),
    enabled: isEvidenceModalOpen,
  });
  const docList: DepartmentDocument[] = Array.isArray(documentsData)
    ? documentsData
    : documentsData?.results || [];

  const { data: projectsData } = useQuery<{ results?: Project[] } | Project[]>({
    queryKey: ["projects-for-evidence"],
    queryFn: () => api.get("/projects/"),
    enabled: isEvidenceModalOpen,
  });
  const projList: Project[] = Array.isArray(projectsData)
    ? projectsData
    : projectsData?.results || [];

  // Fetch selected criteria detail (with evidences)
  const { data: activeCriteriaDetail, refetch: refetchActiveDetail } = useQuery<AccreditationCriteria>({
    queryKey: ["accreditation-detail", selectedCriteria?.id],
    queryFn: () => api.get(`/reports/criteria/${selectedCriteria?.id}/`),
    enabled: !!selectedCriteria,
  });

  // Calculate Metrics
  const totalCriteria = criteriaList.length;
  const compliantCount = criteriaList.filter((c) => c.status === "COMPLIANT").length;
  const inProgressCount = criteriaList.filter((c) => c.status === "IN_PROGRESS").length;
  const needsAttentionCount = criteriaList.filter((c) => c.status === "NEEDS_ATTENTION").length;
  const complianceRate = totalCriteria > 0 ? Math.round((compliantCount / totalCriteria) * 100) : 0;

  // Add Evidence Mutation
  const addEvidenceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCriteria) return;
      return api.post("/reports/evidence/", {
        criteria: selectedCriteria.id,
        title: evTitle,
        description: evDescription,
        document: evDocId ? parseInt(evDocId, 10) : null,
        project: evProjId ? parseInt(evProjId, 10) : null,
        external_url: evUrl,
      });
    },
    onSuccess: () => {
      success("Evidence Attached", "Evidence link was added to this accreditation criterion.");
      setIsEvidenceModalOpen(false);
      setEvTitle("");
      setEvDescription("");
      setEvDocId("");
      setEvProjId("");
      setEvUrl("");
      refetchActiveDetail();
      queryClient.invalidateQueries({ queryKey: ["accreditation-criteria"] });
    },
    onError: (err: { detail?: string }) => {
      error("Failed to Attach Evidence", err.detail || "Please check inputs and retry.");
    },
  });

  // Edit Criteria Mutation
  const editCriteriaMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCriteria) return;
      return api.patch(`/reports/criteria/${selectedCriteria.id}/`, {
        status: editStatus,
        obtained_marks: parseFloat(editObtainedMarks) || 0,
      });
    },
    onSuccess: () => {
      success("Criterion Updated", "Accreditation status and marks were updated.");
      setIsEditCriteriaModalOpen(false);
      refetchActiveDetail();
      queryClient.invalidateQueries({ queryKey: ["accreditation-criteria"] });
    },
    onError: (err: { detail?: string }) => {
      error("Update Failed", err.detail || "Unable to save criterion changes.");
    },
  });

  const getStatusBadge = (status: AccreditationStatus) => {
    switch (status) {
      case "COMPLIANT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Compliant
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5" /> In Progress
          </span>
        );
      case "NEEDS_ATTENTION":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5" /> Needs Attention
          </span>
        );
      case "NOT_STARTED":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <HelpCircle className="w-3.5 h-3.5" /> Not Started
          </span>
        );
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                <ShieldCheck className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Accreditation & Quality Assurance
                </h1>
                <p className="text-sm text-slate-500">
                  NBA Tier-II & NAAC Criterion Verification and Evidence Repository
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Executive Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Readiness Rate
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{complianceRate}%</p>
                </div>
                <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">
                  NBA
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all"
                  style={{ width: `${complianceRate}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Compliant Criteria
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-bold text-emerald-600">{compliantCount}</p>
                <span className="text-sm text-slate-400">/ {totalCriteria} Total</span>
              </div>
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Fully documented
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                In Progress
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
                <span className="text-sm text-slate-400">criteria active</span>
              </div>
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-500" /> Evidence compilation ongoing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Needs Attention
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-bold text-amber-600">{needsAttentionCount}</p>
                <span className="text-sm text-slate-400">criteria</span>
              </div>
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Requires faculty documentation
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Criteria Checklist Grid & Evidence Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Criteria Cards List */}
          <div className="lg:col-span-7 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-indigo-600" />
              NBA Criteria Checklist (Computer Science & Engineering)
            </h2>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : criteriaList.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                <p className="text-slate-500 text-sm">No accreditation criteria loaded.</p>
              </div>
            ) : (
              criteriaList.map((crit) => {
                const isSelected = selectedCriteria?.id === crit.id;
                const scorePct =
                  crit.max_marks > 0
                    ? Math.round((Number(crit.obtained_marks) / crit.max_marks) * 100)
                    : 0;

                return (
                  <div
                    key={crit.id}
                    onClick={() => setSelectedCriteria(crit)}
                    className={`cursor-pointer transition-all p-5 rounded-xl border bg-white shadow-sm hover:border-indigo-300 ${
                      isSelected
                        ? "border-indigo-600 ring-2 ring-indigo-50 shadow-md"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="px-2.5 py-1 bg-slate-900 text-white font-mono text-xs font-bold rounded-lg mt-0.5">
                          {crit.code}
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">{crit.title}</h3>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {crit.description}
                          </p>
                        </div>
                      </div>
                      <div>{getStatusBadge(crit.status)}</div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <span>
                          Score:{" "}
                          <strong className="text-slate-900 font-semibold">
                            {crit.obtained_marks}
                          </strong>{" "}
                          / {crit.max_marks} marks
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>({scorePct}%)</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-medium text-indigo-600">
                        <span>{crit.evidences_count || 0} linked evidence</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Panel: Selected Criterion Evidence Inspector */}
          <div className="lg:col-span-5">
            {selectedCriteria ? (
              <Card className="sticky top-6">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold font-mono px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded">
                        {selectedCriteria.code}
                      </span>
                      <CardTitle className="text-base mt-1.5">
                        {selectedCriteria.title}
                      </CardTitle>
                    </div>
                    {isStaff && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditStatus(selectedCriteria.status);
                          setEditObtainedMarks(String(selectedCriteria.obtained_marks));
                          setIsEditCriteriaModalOpen(true);
                        }}
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-5">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Evaluation Rationale
                    </h4>
                    <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                      {selectedCriteria.description}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Self-Assessment Score</span>
                      <span className="font-semibold text-slate-900">
                        {selectedCriteria.obtained_marks} / {selectedCriteria.max_marks} marks
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              (Number(selectedCriteria.obtained_marks) /
                                selectedCriteria.max_marks) *
                                100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Evidences List */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                        Documented Evidence ({activeCriteriaDetail?.evidences?.length || 0})
                      </h4>
                      {isStaff && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setIsEvidenceModalOpen(true)}
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Add Evidence
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {activeCriteriaDetail?.evidences &&
                      activeCriteriaDetail.evidences.length > 0 ? (
                        activeCriteriaDetail.evidences.map((ev) => (
                          <div
                            key={ev.id}
                            className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-semibold text-slate-900 leading-snug">
                                {ev.title}
                              </p>
                              {ev.document_file_url && (
                                <a
                                  href={ev.document_file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {ev.external_url && (
                                <a
                                  href={ev.external_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>

                            {ev.description && (
                              <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                                {ev.description}
                              </p>
                            )}

                            <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
                              <span>
                                {ev.document_title ? (
                                  <span className="inline-flex items-center gap-1 text-slate-600">
                                    <FileText className="w-3 h-3 text-slate-400" />
                                    {ev.document_title}
                                  </span>
                                ) : ev.project_title ? (
                                  <span className="inline-flex items-center gap-1 text-slate-600">
                                    <FolderGit2 className="w-3 h-3 text-slate-400" />
                                    {ev.project_title}
                                  </span>
                                ) : (
                                  "External Reference"
                                )}
                              </span>
                              <span>Added by {ev.added_by_name || "Faculty"}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg">
                          <p className="text-xs text-slate-400">
                            No evidence linked to this criterion yet.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
                <FileCheck2 className="w-12 h-12 text-slate-300 mb-3" />
                <h3 className="text-sm font-semibold text-slate-700">Select a Criterion</h3>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  Click on any NBA criterion on the left to inspect linked documents, capstone
                  projects, and quality compliance metrics.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Add Evidence Modal */}
        <Dialog
          isOpen={isEvidenceModalOpen}
          onClose={() => setIsEvidenceModalOpen(false)}
          title={`Attach Evidence to ${selectedCriteria?.code}`}
        >
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Evidence Title *
              </label>
              <Input
                placeholder="e.g. DAB Meeting Minutes on PEO Approval"
                value={evTitle}
                onChange={(e) => setEvTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description & Remarks
              </label>
              <Textarea
                placeholder="Explain how this document satisfies the criterion requirement..."
                rows={3}
                value={evDescription}
                onChange={(e) => setEvDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Link Document Library Item
                </label>
                <Select value={evDocId} onChange={(e) => setEvDocId(e.target.value)}>
                  <option value="">None (Optional)</option>
                  {docList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Link Capstone Project
                </label>
                <Select value={evProjId} onChange={(e) => setEvProjId(e.target.value)}>
                  <option value="">None (Optional)</option>
                  {projList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Or External Reference URL
              </label>
              <Input
                placeholder="https://..."
                value={evUrl}
                onChange={(e) => setEvUrl(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="secondary"
                onClick={() => setIsEvidenceModalOpen(false)}
                disabled={addEvidenceMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => addEvidenceMutation.mutate()}
                isLoading={addEvidenceMutation.isPending}
                disabled={!evTitle.trim()}
              >
                Attach Evidence
              </Button>
            </div>
          </div>
        </Dialog>

        {/* Edit Criterion Status Modal */}
        <Dialog
          isOpen={isEditCriteriaModalOpen}
          onClose={() => setIsEditCriteriaModalOpen(false)}
          title={`Update ${selectedCriteria?.code} Compliance`}
        >
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Accreditation Status
              </label>
              <Select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as AccreditationStatus)}
              >
                <option value="COMPLIANT">Compliant</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="NEEDS_ATTENTION">Needs Attention</option>
                <option value="NOT_STARTED">Not Started</option>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Self-Evaluated Marks (Max: {selectedCriteria?.max_marks})
              </label>
              <Input
                type="number"
                step="0.5"
                min="0"
                max={selectedCriteria?.max_marks || 100}
                value={editObtainedMarks}
                onChange={(e) => setEditObtainedMarks(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="secondary"
                onClick={() => setIsEditCriteriaModalOpen(false)}
                disabled={editCriteriaMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => editCriteriaMutation.mutate()}
                isLoading={editCriteriaMutation.isPending}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </Dialog>
      </div>
    </AppLayout>
  );
}
