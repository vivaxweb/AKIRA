"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import {
  Project,
  ProjectStatus,
  ProjectMilestone,
  SimilarityCheckResponse,
  User as UserType,
} from "@/types";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Skeleton,
  ProgressBar,
} from "@/components/ui/CardsAndFeedback";
import { Dialog } from "@/components/ui/DialogAndTable";
import { useToast } from "@/components/ui/Toast";
import {
  FolderGit2,
  Plus,
  Search,
  ExternalLink,
  GitBranch,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Sparkles,
  Users,
  Award,
  Layers,
} from "lucide-react";

const DOMAIN_OPTIONS = [
  "Machine Learning",
  "Web Development",
  "Cloud Computing",
  "Cybersecurity",
  "IoT & Embedded",
  "Blockchain",
  "Mobile Apps",
  "Data Science",
  "Computer Vision",
  "Natural Language Processing",
];

const BATCH_OPTIONS = [2025, 2026, 2027];

const STATUS_VARIANTS: Record<ProjectStatus, "success" | "warning" | "danger" | "default" | "info"> = {
  APPROVED: "success",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  UNDER_REVIEW: "warning",
  PROPOSED: "default",
  REJECTED: "danger",
};

export default function ProjectRepositoryPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  // Filters
  const [search, setSearch] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [myProjectsOnly, setMyProjectsOnly] = useState(false);

  // Modals
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);

  // Proposal Form State
  const [formTitle, setFormTitle] = useState("");
  const [formAbstract, setFormAbstract] = useState("");
  const [formDomain, setFormDomain] = useState("Machine Learning");
  const [formBatch, setFormBatch] = useState(2027);
  const [formGithub, setFormGithub] = useState("");
  const [formLive, setFormLive] = useState("");
  const [formMembers, setFormMembers] = useState<number[]>([]);

  // Real-time Similarity State
  const [similarityData, setSimilarityData] = useState<SimilarityCheckResponse | null>(null);
  const [isCheckingSimilarity, setIsCheckingSimilarity] = useState(false);

  // Milestone sign-off state
  const [signingMilestoneId, setSigningMilestoneId] = useState<number | null>(null);
  const [signOffRemarks, setSignOffRemarks] = useState("");

  // Status update state
  const [statusToUpdate, setStatusToUpdate] = useState<ProjectStatus>("APPROVED");
  const [rejectionReason, setRejectionReason] = useState("");

  // Debounced live similarity check
  useEffect(() => {
    if (!isSubmitModalOpen) return;
    if (formTitle.trim().length < 4 && formAbstract.trim().length < 15) {
      setSimilarityData(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsCheckingSimilarity(true);
        const res = await api.post<SimilarityCheckResponse>("/projects/similarity-check/", {
          title: formTitle,
          abstract: formAbstract,
        });
        setSimilarityData(res);
      } catch {
        // silent fail for real-time check
      } finally {
        setIsCheckingSimilarity(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [formTitle, formAbstract, isSubmitModalOpen]);

  // Fetch Projects List
  const { data: projectsData, isLoading: isLoadingProjects } = useQuery<{
    results?: Project[];
    count?: number;
  } | Project[]>({
    queryKey: [
      "projects",
      search,
      selectedDomain,
      selectedBatch,
      selectedStatus,
      myProjectsOnly,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (selectedDomain) params.append("domain", selectedDomain);
      if (selectedBatch) params.append("batch_year", selectedBatch);
      if (selectedStatus) params.append("status", selectedStatus);
      if (myProjectsOnly) params.append("my_projects", "true");
      return api.get(`/projects/?${params.toString()}`);
    },
  });

  const projects: Project[] = Array.isArray(projectsData)
    ? projectsData
    : projectsData?.results || [];

  // Fetch Active Project Detail
  const { data: activeProject, isLoading: isLoadingActiveProject } = useQuery<Project>({
    queryKey: ["project-detail", activeProjectId],
    queryFn: async () => {
      return api.get<Project>(`/projects/${activeProjectId}/`);
    },
    enabled: !!activeProjectId,
  });

  // Fetch Eligible Students for Team Members
  const { data: studentsList = [] } = useQuery<UserType[]>({
    queryKey: ["eligible-students"],
    queryFn: async () => {
      const res = await api.get<{ results: UserType[] } | UserType[]>("/users/?role=STUDENT&page_size=100");
      if (Array.isArray(res)) return res;
      if (res && "results" in res && Array.isArray(res.results)) return res.results;
      return [];
    },
    enabled: isSubmitModalOpen,
  });

  // Submit Proposal Mutation
  const createProjectMutation = useMutation({
    mutationFn: async (payload: {
      title: string;
      abstract: string;
      domain: string;
      batch_year: number;
      academic_year: string;
      member_ids: number[];
      github_url?: string;
      live_url?: string;
    }) => {
      return api.post("/projects/", payload);
    },
    onSuccess: () => {
      success(
        "Proposal Submitted",
        "Your project proposal has been created with standard milestone tracking."
      );
      setIsSubmitModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err: unknown) => {
      error(
        "Submission Failed",
        err instanceof Error ? err.message : "Failed to submit proposal"
      );
    },
  });

  // Toggle Milestone Completion Mutation
  const toggleMilestoneMutation = useMutation({
    mutationFn: async (milestoneId: number) => {
      return api.post(`/project-milestones/${milestoneId}/toggle-complete/`, {});
    },
    onSuccess: () => {
      success("Milestone Updated", "Milestone completion status has been updated.");
      queryClient.invalidateQueries({ queryKey: ["project-detail", activeProjectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err: unknown) => {
      error("Update Failed", err instanceof Error ? err.message : "Permission denied");
    },
  });

  // Sign Off Milestone Mutation
  const signOffMilestoneMutation = useMutation({
    mutationFn: async ({
      milestoneId,
      remarks,
    }: {
      milestoneId: number;
      remarks: string;
    }) => {
      return api.post(`/project-milestones/${milestoneId}/sign-off/`, {
        signed_off: true,
        remarks,
      });
    },
    onSuccess: () => {
      success(
        "Milestone Signed Off",
        "Faculty guide sign-off recorded successfully."
      );
      setSigningMilestoneId(null);
      setSignOffRemarks("");
      queryClient.invalidateQueries({ queryKey: ["project-detail", activeProjectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err: unknown) => {
      error(
        "Sign-Off Failed",
        err instanceof Error ? err.message : "Only assigned guide or HOD can sign off."
      );
    },
  });

  // Change Project Status Mutation
  const changeStatusMutation = useMutation({
    mutationFn: async ({
      projectId,
      status,
      rejection_reason,
    }: {
      projectId: number;
      status: ProjectStatus;
      rejection_reason?: string;
    }) => {
      return api.post(`/projects/${projectId}/change-status/`, {
        status,
        rejection_reason,
      });
    },
    onSuccess: () => {
      success(
        "Project Status Updated",
        `Project status set to ${statusToUpdate}.`
      );
      queryClient.invalidateQueries({ queryKey: ["project-detail", activeProjectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err: unknown) => {
      error(
        "Status Update Failed",
        err instanceof Error ? err.message : "Only guide or HOD can change status."
      );
    },
  });

  const resetForm = () => {
    setFormTitle("");
    setFormAbstract("");
    setFormDomain("Machine Learning");
    setFormBatch(2027);
    setFormGithub("");
    setFormLive("");
    setFormMembers([]);
    setSimilarityData(null);
  };

  const handleProposalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formAbstract.trim()) {
      error(
        "Validation Error",
        "Please enter both project title and abstract."
      );
      return;
    }

    createProjectMutation.mutate({
      title: formTitle.trim(),
      abstract: formAbstract.trim(),
      domain: formDomain,
      batch_year: Number(formBatch),
      academic_year: "2026-27",
      member_ids: formMembers,
      github_url: formGithub.trim(),
      live_url: formLive.trim(),
    });
  };

  const canReview =
    user?.role === "HOD" ||
    user?.role === "PRINCIPAL" ||
    (activeProject && activeProject.guide === user?.id);

  return (
    <div className="space-y-6">
      {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <FolderGit2 className="w-7 h-7 text-indigo-600" />
              Project Repository &amp; Duplicate Detection
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              B.Tech final-year capstone repository, milestone sign-offs, and instant TF-IDF similarity checking.
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsSubmitModalOpen(true);
            }}
            className="flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Submit New Project
          </Button>
        </div>

        {/* Filter Controls Bar */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {/* Search */}
              <div className="md:col-span-2 relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  placeholder="Search projects or team..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>

              {/* Domain */}
              <div>
                <Select
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                  className="text-sm"
                >
                  <option value="">All Domains</option>
                  {DOMAIN_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Batch Year */}
              <div>
                <Select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="text-sm"
                >
                  <option value="">All Batches</option>
                  {BATCH_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      Batch {b}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Status */}
              <div>
                <Select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="text-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="PROPOSED">Proposed</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="REJECTED">Rejected</option>
                </Select>
              </div>
            </div>

            {/* Sub-filter tabs */}
            <div className="flex items-center justify-between border-t border-slate-100 mt-3 pt-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMyProjectsOnly(false)}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition ${
                    !myProjectsOnly
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  All Projects ({projects.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMyProjectsOnly(true)}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition ${
                    myProjectsOnly
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  My Associated Projects
                </button>
              </div>
              <span className="text-xs text-slate-400">
                Department Repository: Computer Science &amp; Engineering
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Project Cards Grid */}
        {isLoadingProjects ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <Card key={n}>
                <CardContent className="pt-4 space-y-3">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">No Projects Found</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                No capstone projects match the current search or filter criteria.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((proj) => {
              const comp = proj.completed_milestones || 0;
              const total = proj.total_milestones || 5;
              const progressPct = Math.round((comp / total) * 100);

              return (
                <Card
                  key={proj.id}
                  className="flex flex-col justify-between hover:shadow-md transition-shadow border-slate-200"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {proj.domain}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono text-slate-500">
                          {proj.batch_year}
                        </span>
                        <Badge variant={STATUS_VARIANTS[proj.status] || "default"}>
                          {proj.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                    <CardTitle
                      onClick={() => setActiveProjectId(proj.id)}
                      className="text-base font-bold text-slate-900 cursor-pointer hover:text-indigo-600 transition-colors line-clamp-2"
                    >
                      {proj.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-4 flex-1 flex flex-col justify-between">
                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                      {proj.abstract}
                    </p>

                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      {/* Milestone Progress */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-500 font-medium">Milestone Progress</span>
                          <span className="font-semibold text-slate-700">
                            {comp}/{total} ({progressPct}%)
                          </span>
                        </div>
                        <ProgressBar value={progressPct} />
                      </div>

                      {/* People Details */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-50 p-2 rounded">
                          <span className="text-[10px] text-slate-400 block font-medium">Leader</span>
                          <span className="font-semibold text-slate-800 truncate block">
                            {proj.team_leader_name}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded">
                          <span className="text-[10px] text-slate-400 block font-medium">Faculty Guide</span>
                          <span className="font-semibold text-slate-800 truncate block">
                            {proj.guide_name || "Unassigned"}
                          </span>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                          {proj.github_url && (
                            <a
                              href={proj.github_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-slate-900 transition"
                              title="GitHub Repository"
                            >
                              <GitBranch className="w-4 h-4" />
                            </a>
                          )}
                          {proj.live_url && (
                            <a
                              href={proj.live_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-indigo-600 transition"
                              title="Live Demo"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveProjectId(proj.id)}
                          className="text-xs"
                        >
                          Milestones &amp; Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal 1: Submit Proposal with Real-Time Similarity Detector */}
        <Dialog
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          title="Submit Final-Year Project Proposal"
          description="Enter proposal details. The system runs real-time duplicate checking against existing departmental projects."
          maxWidth="xl"
        >
          <form onSubmit={handleProposalSubmit} className="space-y-4 text-sm">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project Title <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Automated Crop Disease Detection using Deep Convolutional Neural Networks"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
              />
            </div>

            {/* Domain & Batch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Technology Domain <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formDomain}
                  onChange={(e) => setFormDomain(e.target.value)}
                >
                  {DOMAIN_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Graduation Batch <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formBatch}
                  onChange={(e) => setFormBatch(Number(e.target.value))}
                >
                  <option value={2027}>Batch 2027 (Final Year 2026-27)</option>
                  <option value={2026}>Batch 2026</option>
                  <option value={2025}>Batch 2025</option>
                </Select>
              </div>
            </div>

            {/* Abstract */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project Abstract &amp; Problem Statement <span className="text-red-500">*</span>
              </label>
              <Textarea
                rows={4}
                placeholder="Describe the problem, proposed methodology, technical stack, expected deliverables..."
                value={formAbstract}
                onChange={(e) => setFormAbstract(e.target.value)}
                required
              />
            </div>

            {/* Live Instant Similarity Meter */}
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Instant Duplicate Detection (TF-IDF &amp; Cosine Engine)
                </span>
                {isCheckingSimilarity ? (
                  <span className="text-[11px] text-indigo-600 animate-pulse font-medium">
                    Analyzing repository...
                  </span>
                ) : similarityData ? (
                  <Badge
                    variant={
                      similarityData.max_score >= 60
                        ? "danger"
                        : similarityData.max_score >= 40
                        ? "warning"
                        : "success"
                    }
                  >
                    {similarityData.max_score >= 60
                      ? "High Similarity Risk"
                      : similarityData.max_score >= 40
                      ? "Moderate Overlap"
                      : "Unique Idea"}
                    : {similarityData.max_score}%
                  </Badge>
                ) : (
                  <span className="text-[11px] text-slate-400">Type title &amp; abstract to check</span>
                )}
              </div>

              {similarityData && (
                <div className="space-y-2 pt-1">
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        similarityData.max_score >= 60
                          ? "bg-red-500"
                          : similarityData.max_score >= 40
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(similarityData.max_score, 100)}%` }}
                    />
                  </div>

                  {similarityData.is_flagged && (
                    <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-red-800 text-xs">
                      <ShieldAlert className="w-4 h-4 flex-shrink-0 text-red-600 mt-0.5" />
                      <div>
                        <p className="font-bold">Duplicate Idea Warning ({similarityData.max_score}%)</p>
                        <p className="text-[11px] text-red-700 mt-0.5">
                          This proposal closely resembles an existing project in the departmental repository. You may still submit, but the academic coordinator and committee may request topic differentiation.
                        </p>
                      </div>
                    </div>
                  )}

                  {similarityData.top_matches.length > 0 && (
                    <div className="text-xs space-y-1">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Top Similar Matches:
                      </p>
                      {similarityData.top_matches.slice(0, 3).map((match) => (
                        <div
                          key={match.id}
                          className="flex items-center justify-between p-1.5 bg-white rounded border border-slate-200 text-[11px]"
                        >
                          <span className="truncate max-w-[260px] font-medium text-slate-800">
                            {match.title}
                          </span>
                          <span
                            className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                              match.similarity_pct >= 60
                                ? "bg-red-100 text-red-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {match.similarity_pct}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Teammates selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Team Members (Students)
              </label>
              <div className="max-h-28 overflow-y-auto border border-slate-200 rounded p-2 bg-white space-y-1">
                {studentsList.map((st) => (
                  <label key={st.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formMembers.includes(st.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormMembers([...formMembers, st.id]);
                        } else {
                          setFormMembers(formMembers.filter((id) => id !== st.id));
                        }
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>
                      {st.full_name} ({st.email})
                    </span>
                  </label>
                ))}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                As the submitting student, you will automatically be assigned as Team Leader.
              </span>
            </div>

            {/* Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  GitHub Repository (Optional)
                </label>
                <Input
                  placeholder="https://github.com/..."
                  value={formGithub}
                  onChange={(e) => setFormGithub(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Live Demo URL (Optional)
                </label>
                <Input
                  placeholder="https://..."
                  value={formLive}
                  onChange={(e) => setFormLive(e.target.value)}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSubmitModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={createProjectMutation.isPending}
                disabled={createProjectMutation.isPending}
              >
                Submit Project Proposal
              </Button>
            </div>
          </form>
        </Dialog>

        {/* Modal 2: Project Detail & Milestone Sign-Off Modal */}
        <Dialog
          isOpen={!!activeProjectId}
          onClose={() => {
            setActiveProjectId(null);
            setSigningMilestoneId(null);
            setSignOffRemarks("");
          }}
          title={activeProject?.title || "Project Details & Milestones"}
          description={
            activeProject
              ? `${activeProject.domain} • Batch ${activeProject.batch_year} • Status: ${activeProject.status}`
              : "Loading..."
          }
          maxWidth="xl"
        >
          {isLoadingActiveProject || !activeProject ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <div className="space-y-6 text-sm">
              {/* Header Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANTS[activeProject.status] || "default"}>
                    {activeProject.status.replace("_", " ")}
                  </Badge>
                  <span className="text-xs text-slate-600 font-medium">
                    Domain: <span className="text-slate-900 font-semibold">{activeProject.domain}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {activeProject.github_url && (
                    <a
                      href={activeProject.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs flex items-center gap-1 text-indigo-600 hover:underline"
                    >
                      <GitBranch className="w-3.5 h-3.5" /> Repository
                    </a>
                  )}
                  {activeProject.live_url && (
                    <a
                      href={activeProject.live_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs flex items-center gap-1 text-indigo-600 hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Live Demo
                    </a>
                  )}
                </div>
              </div>

              {/* Abstract */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Problem Statement &amp; Abstract
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 border border-slate-200 rounded-lg">
                  {activeProject.abstract}
                </p>
              </div>

              {/* Team & Guide Roster */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600" /> Team Members
                  </h4>
                  <div className="border border-slate-200 rounded-lg p-2.5 bg-white space-y-1.5 text-xs">
                    <div className="font-semibold text-slate-900 flex justify-between">
                      <span>{activeProject.team_leader_name}</span>
                      <span className="text-indigo-600 font-normal">Team Leader</span>
                    </div>
                    {activeProject.members?.filter((m) => m.student !== activeProject.team_leader).map((m) => (
                      <div key={m.id} className="text-slate-600 flex justify-between">
                        <span>{m.student_name}</span>
                        <span className="text-slate-400 font-mono">{m.student_roll || "Member"}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-indigo-600" /> Faculty Guide
                  </h4>
                  <div className="border border-slate-200 rounded-lg p-2.5 bg-white text-xs space-y-1">
                    <p className="font-semibold text-slate-900">
                      {activeProject.guide_name || "No Guide Assigned"}
                    </p>
                    <p className="text-slate-500">
                      Department of Computer Science &amp; Engineering
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Update (Only Guide / HOD / Principal) */}
              {canReview && (
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg space-y-2">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Administrative Review &amp; Status Change
                  </h4>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <Select
                      value={statusToUpdate}
                      onChange={(e) => setStatusToUpdate(e.target.value as ProjectStatus)}
                      className="text-xs bg-white"
                    >
                      <option value="APPROVED">Approved</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="UNDER_REVIEW">Under Review</option>
                      <option value="REJECTED">Rejected</option>
                    </Select>

                    {statusToUpdate === "REJECTED" && (
                      <Input
                        placeholder="Rejection reason..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="text-xs bg-white"
                      />
                    )}

                    <Button
                      size="sm"
                      onClick={() =>
                        changeStatusMutation.mutate({
                          projectId: activeProject.id,
                          status: statusToUpdate,
                          rejection_reason: rejectionReason,
                        })
                      }
                      isLoading={changeStatusMutation.isPending}
                    >
                      Update Status
                    </Button>
                  </div>
                </div>
              )}

              {/* Milestone Timeline */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" /> Milestone Tracking &amp; Sign-Offs
                </h4>

                <div className="space-y-3">
                  {(activeProject.milestones || []).map((m: ProjectMilestone) => {
                    const isSigningThis = signingMilestoneId === m.id;

                    return (
                      <div
                        key={m.id}
                        className={`p-3.5 rounded-lg border transition ${
                          m.guide_signed_off
                            ? "bg-emerald-50/40 border-emerald-200"
                            : m.is_completed
                            ? "bg-blue-50/30 border-blue-200"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <button
                              type="button"
                              onClick={() => toggleMilestoneMutation.mutate(m.id)}
                              className="mt-0.5 text-slate-400 hover:text-indigo-600 transition"
                              title="Toggle completion"
                            >
                              <CheckCircle2
                                className={`w-5 h-5 ${
                                  m.is_completed ? "text-emerald-600 fill-emerald-100" : "text-slate-300"
                                }`}
                              />
                            </button>
                            <div>
                              <p className="font-semibold text-slate-900 text-xs">
                                M{m.order}: {m.title}
                              </p>
                              {m.description && (
                                <p className="text-[11px] text-slate-500 mt-0.5">{m.description}</p>
                              )}
                            </div>
                          </div>

                          {/* Sign-off badge / action */}
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            {m.guide_signed_off ? (
                              <Badge variant="success" className="text-[10px]">
                                Guide Signed Off
                              </Badge>
                            ) : canReview ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSigningMilestoneId(m.id);
                                  setSignOffRemarks(m.guide_remarks || "");
                                }}
                                className="text-xs h-7"
                              >
                                Sign Off
                              </Button>
                            ) : (
                              <Badge variant="default" className="text-[10px]">
                                Awaiting Sign-Off
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Sign-off remarks */}
                        {m.guide_remarks && (
                          <div className="mt-2 text-[11px] text-slate-600 bg-white/80 p-2 rounded border border-slate-100">
                            <span className="font-semibold text-slate-700">Guide Feedback: </span>
                            {m.guide_remarks}
                          </div>
                        )}

                        {/* Sign-off form if clicked */}
                        {isSigningThis && (
                          <div className="mt-3 p-3 bg-white rounded border border-indigo-200 space-y-2">
                            <label className="block text-xs font-semibold text-indigo-900">
                              Guide Sign-Off Remarks for M{m.order}
                            </label>
                            <Input
                              placeholder="e.g. Approved. Thorough literature survey and feasible architecture."
                              value={signOffRemarks}
                              onChange={(e) => setSignOffRemarks(e.target.value)}
                              className="text-xs"
                            />
                            <div className="flex justify-end gap-2 pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSigningMilestoneId(null)}
                                className="text-xs h-7"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() =>
                                  signOffMilestoneMutation.mutate({
                                    milestoneId: m.id,
                                    remarks: signOffRemarks,
                                  })
                                }
                                isLoading={signOffMilestoneMutation.isPending}
                                className="text-xs h-7"
                              >
                                Confirm Sign-Off
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </Dialog>
      </div>
  );
}
