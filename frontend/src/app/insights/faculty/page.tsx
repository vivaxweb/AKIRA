"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent, Badge, Skeleton, EmptyState } from "@/components/ui/CardsAndFeedback";
import { api } from "@/lib/api";
import { FacultyWorkloadReport } from "@/types";
import {
  Users,
  Clock,
  BookOpen,
  ClipboardList,
  Search,
  AlertCircle,
} from "lucide-react";

export default function FacultyPerformancePage() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data: report, isLoading, refetch } = useQuery<FacultyWorkloadReport>({
    queryKey: ["faculty-workload"],
    queryFn: async () => {
      return api.get<FacultyWorkloadReport>("/insights/faculty-workload/");
    },
  });

  const facultyList = report?.faculty || [];

  const filteredFaculty = facultyList.filter((f) => {
    const matchesSearch =
      f.faculty_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.subjects.some((s) => s.code.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = !statusFilter || f.compliance_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalTeachingFaculty = report?.faculty_count || 0;
  const totalWeeklyHours = report?.total_teaching_hours || 0;
  const avgSyllabusCoverage =
    facultyList.length > 0
      ? Math.round(
          facultyList.reduce((acc, f) => acc + f.overall_coverage_pct, 0) / facultyList.length
        )
      : 0;
  const totalLogbooks = facultyList.reduce((acc, f) => acc + f.logbook_entries_count, 0);
  const totalPendingReviews = facultyList.reduce((acc, f) => acc + f.pending_logbook_reviews, 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Faculty Workload &amp; Compliance</h1>
            <p className="text-sm text-slate-500 mt-1">
              Supervisory intelligence: Weekly lecture allocations, syllabus coverage pace, and daily logbook monitoring.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Refresh Workload
            </Button>
            <Link href="/academics/logbook">
              <Button size="sm">
                <ClipboardList className="w-4 h-4 mr-1.5" />
                Review Logbooks
              </Button>
            </Link>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-slate-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Faculty Roster</p>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalTeachingFaculty}</p>
              <p className="text-xs text-slate-400 mt-1">Active teaching faculty</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Weekly Teaching Load</p>
                <Clock className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalWeeklyHours} hrs</p>
              <p className="text-xs text-slate-400 mt-1">Total department lecture hours</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Syllabus Pace</p>
                <BookOpen className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-1">{avgSyllabusCoverage}%</p>
              <p className="text-xs text-slate-400 mt-1">Units covered of planned topics</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Digital Logbooks</p>
                <ClipboardList className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalLogbooks}</p>
              <p className="text-xs text-slate-400 mt-1">
                {totalPendingReviews > 0 ? (
                  <span className="text-amber-600 font-semibold">{totalPendingReviews} pending HOD review</span>
                ) : (
                  "All entries reviewed"
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Controls */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex items-center rounded-lg border border-slate-200 p-1 bg-slate-50 text-xs">
                <button
                  onClick={() => setStatusFilter("")}
                  className={`px-3 py-1 rounded font-medium transition ${
                    statusFilter === "" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  All Faculty ({facultyList.length})
                </button>
                <button
                  onClick={() => setStatusFilter("EXCELLENT")}
                  className={`px-3 py-1 rounded font-medium transition ${
                    statusFilter === "EXCELLENT" ? "bg-emerald-600 text-white shadow-sm" : "text-emerald-700 hover:text-emerald-800"
                  }`}
                >
                  Excellent
                </button>
                <button
                  onClick={() => setStatusFilter("GOOD")}
                  className={`px-3 py-1 rounded font-medium transition ${
                    statusFilter === "GOOD" ? "bg-indigo-600 text-white shadow-sm" : "text-indigo-700 hover:text-indigo-800"
                  }`}
                >
                  Good
                </button>
                <button
                  onClick={() => setStatusFilter("NEEDS_ATTENTION")}
                  className={`px-3 py-1 rounded font-medium transition ${
                    statusFilter === "NEEDS_ATTENTION" ? "bg-amber-600 text-white shadow-sm" : "text-amber-700 hover:text-amber-800"
                  }`}
                >
                  Needs Attention
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Filter faculty or subject code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Faculty Workload Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : filteredFaculty.length === 0 ? (
          <EmptyState
            icon={<Users className="w-8 h-8" />}
            title="No faculty found"
            description="No faculty members match your filter criteria."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredFaculty.map((f) => (
              <Card key={f.faculty_id} className="border-slate-200 hover:border-slate-300 transition">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">{f.faculty_name}</CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {f.designation} &bull; {f.email}
                      </p>
                    </div>
                    <Badge
                      variant={
                        f.compliance_status === "EXCELLENT"
                          ? "success"
                          : f.compliance_status === "GOOD"
                          ? "info"
                          : "warning"
                      }
                    >
                      {f.compliance_status === "EXCELLENT"
                        ? "Compliant"
                        : f.compliance_status === "GOOD"
                        ? "Good Pace"
                        : "Behind Schedule"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {/* Load Metrics */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg text-xs">
                    <div>
                      <span className="text-slate-400 block">Weekly Load</span>
                      <span className="font-bold text-slate-800 text-sm">{f.weekly_teaching_hours} hrs/wk</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Syllabus Pace</span>
                      <span className="font-bold text-slate-800 text-sm">{f.overall_coverage_pct}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Logbooks</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {f.logbook_entries_count} logged
                      </span>
                    </div>
                  </div>

                  {/* Allocated Subjects */}
                  <div>
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">
                      Teaching Allocations ({f.subjects.length})
                    </span>
                    <div className="space-y-2">
                      {f.subjects.map((sub) => (
                        <div
                          key={sub.subject_id}
                          className="p-2.5 border border-slate-200 rounded-lg bg-white space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800">
                              {sub.code}: {sub.name}
                            </span>
                            <span className="text-slate-500 font-mono">{sub.class_group}</span>
                          </div>

                          {/* Progress bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-slate-500">
                              <span>Topics Covered: {sub.covered_topics}/{sub.total_topics}</span>
                              <span className="font-bold text-slate-700">{sub.coverage_pct}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${
                                  sub.coverage_pct >= 60
                                    ? "bg-emerald-500"
                                    : sub.coverage_pct >= 40
                                    ? "bg-indigo-500"
                                    : "bg-amber-500"
                                }`}
                                style={{ width: `${Math.min(sub.coverage_pct, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Logbook Status & Links */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Last logged:{" "}
                      <span className="font-medium text-slate-700">
                        {f.last_logbook_date ? f.last_logbook_date : "No entries yet"}
                      </span>
                    </span>

                    {f.pending_logbook_reviews > 0 && (
                      <span className="text-amber-600 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {f.pending_logbook_reviews} need review
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
