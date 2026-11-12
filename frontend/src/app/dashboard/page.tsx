"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { ExecutiveDashboardKPIs } from "@/types";
import { Card, CardHeader, CardTitle, Badge, Skeleton } from "@/components/ui/CardsAndFeedback";
import { formatRole } from "@/lib/utils";
import {
  Users,
  GraduationCap,
  CalendarCheck,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
  AlertTriangle,
  FolderGit2,
  Download,
  BookOpen,
} from "lucide-react";

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  const isExecutive = user?.role === "HOD" || user?.role === "PRINCIPAL" || user?.role === "COORDINATOR";

  // Fetch live executive KPIs
  const { data: kpis } = useQuery<ExecutiveDashboardKPIs>({
    queryKey: ["executive-dashboard-kpis"],
    queryFn: () => api.get("/reports/executive-dashboard/"),
    enabled: isExecutive,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-r from-white via-indigo-50/30 to-white p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black tracking-widest text-indigo-700 bg-indigo-100/70 border border-indigo-200 px-2 py-0.5 rounded-full uppercase">
                AKIRA PLATFORM
              </span>
              <span className="text-xs text-slate-400 font-medium">AY 2026-27</span>
            </div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Welcome back, {user.first_name}!
              </h2>
              <Badge variant="info" className="font-bold">{formatRole(user.role)}</Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              {user.department_name ? `${user.department_name} (${user.department_code})` : "Computer Science & Engineering"}
              {" · "}TKIET Warananagar
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-700 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs self-start md:self-auto">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-semibold text-slate-800">Department Hub Verified</span>
          </div>
        </div>
      </div>

      {/* Live Executive Institutional KPIs for Principal, HOD, and Coordinators */}
      {isExecutive && kpis && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Real-Time Department Performance Indicators
            </h3>
            <span className="text-xs font-medium text-slate-400">
              {kpis.total_students} Students · {kpis.total_faculty} Faculty
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Avg Attendance */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Avg Attendance</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <p className="text-xl font-bold text-slate-900">{kpis.avg_attendance}%</p>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    kpis.avg_attendance >= 75
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {kpis.avg_attendance >= 75 ? "Target Met" : "Low"}
                </span>
              </div>
            </div>

            {/* High Risk Students */}
            <Link
              href="/insights/risk"
              className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-rose-300 transition-colors block"
            >
              <p className="text-[11px] font-semibold text-slate-500 uppercase flex items-center justify-between">
                <span>High Risk</span>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              </p>
              <div className="flex items-baseline gap-1 mt-1">
                <p className="text-xl font-bold text-rose-600">{kpis.high_risk_students_count}</p>
                <span className="text-[11px] text-slate-400">students</span>
              </div>
            </Link>

            {/* Capstones In Progress */}
            <Link
              href="/projects"
              className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors block"
            >
              <p className="text-[11px] font-semibold text-slate-500 uppercase flex items-center justify-between">
                <span>Capstones</span>
                <FolderGit2 className="w-3.5 h-3.5 text-indigo-500" />
              </p>
              <div className="flex items-baseline gap-1 mt-1">
                <p className="text-xl font-bold text-slate-900">{kpis.active_projects}</p>
                <span className="text-[11px] text-slate-400">active</span>
              </div>
            </Link>

            {/* Syllabus Coverage */}
            <Link
              href="/academics/syllabus"
              className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors block"
            >
              <p className="text-[11px] font-semibold text-slate-500 uppercase flex items-center justify-between">
                <span>Syllabus</span>
                <BookOpen className="w-3.5 h-3.5 text-blue-500" />
              </p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {kpis.syllabus_completion_rate}%
              </p>
            </Link>

            {/* NBA Compliance */}
            <Link
              href="/accreditation"
              className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-emerald-300 transition-colors block"
            >
              <p className="text-[11px] font-semibold text-slate-500 uppercase flex items-center justify-between">
                <span>NBA Readiness</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              </p>
              <p className="text-xl font-bold text-emerald-600 mt-1">
                {kpis.nba_compliance_rate}%
              </p>
            </Link>

            {/* Logbook Reviews */}
            <Link
              href="/academics/logbook"
              className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-amber-300 transition-colors block"
            >
              <p className="text-[11px] font-semibold text-slate-500 uppercase flex items-center justify-between">
                <span>Pending Log</span>
                <Clock className="w-3.5 h-3.5 text-amber-500" />
              </p>
              <div className="flex items-baseline gap-1 mt-1">
                <p className="text-xl font-bold text-amber-600">{kpis.pending_logbook_reviews}</p>
                <span className="text-[11px] text-slate-400">to verify</span>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Role-Specific Overview Shells */}
      {user.role === "HOD" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">Department</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">{user.department_code || "CSE"}</p>
                </div>
                <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600">
                  <GraduationCap className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-500 flex items-center gap-1">
                <span>Computer Science & Engineering</span>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">User Management</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">HOD Admin</p>
                </div>
                <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <Link href="/admin/users" className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-medium">
                  Manage Department Users <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">Academic Operations</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">Structure & Logs</p>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <Link href="/academics/structure" className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-medium">
                  View Class Groups <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">Reports & Export</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">XLSX & PDF</p>
                </div>
                <div className="p-2.5 bg-rose-50 rounded-lg text-rose-600">
                  <Download className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <Link href="/reports" className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-medium">
                  Export Center <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Department Operations Modules</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <Link href="/academics/attendance" className="p-3 border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors flex items-center justify-between">
                <span className="font-semibold text-slate-900">Attendance Monitoring</span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link href="/insights/risk" className="p-3 border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors flex items-center justify-between">
                <span className="font-semibold text-slate-900">Academic Risk List</span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link href="/projects" className="p-3 border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors flex items-center justify-between">
                <span className="font-semibold text-slate-900">Project Approval Queue</span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link href="/academics/logbook" className="p-3 border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors flex items-center justify-between">
                <span className="font-semibold text-slate-900">Digital Logbook Reviews</span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link href="/accreditation" className="p-3 border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors flex items-center justify-between">
                <span className="font-semibold text-slate-900">NBA Criteria & Evidence</span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link href="/reports" className="p-3 border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors flex items-center justify-between">
                <span className="font-semibold text-slate-900">Export Center (XLSX/PDF)</span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
            </div>
          </Card>
        </div>
      )}

      {user.role === "PRINCIPAL" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Card>
              <CardTitle>Institution Overview</CardTitle>
              <p className="mt-1 text-xs text-slate-500">TKIET Warananagar</p>
              <div className="mt-4 text-xs space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Academic Scope:</span>
                  <span className="font-semibold text-slate-800">All Departments (Read-Only)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Academic Year:</span>
                  <span className="font-semibold text-slate-800">2026-27</span>
                </div>
              </div>
            </Card>

            <Card>
              <CardTitle>Accreditation Overview</CardTitle>
              <p className="mt-1 text-xs text-slate-500">NBA Criteria & Progress</p>
              <div className="mt-4">
                <Link href="/accreditation" className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-semibold hover:underline">
                  Browse Criteria & Evidences <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>

            <Card>
              <CardTitle>Institution Reports</CardTitle>
              <p className="mt-1 text-xs text-slate-500">Audits, Summary & Outcomes</p>
              <div className="mt-4">
                <Link href="/reports" className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-semibold hover:underline">
                  Open Export Center <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>
          </div>
        </div>
      )}

      {(user.role === "FACULTY" || user.role === "COORDINATOR") && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Attendance Entry</h4>
                  <p className="text-xs text-slate-500">Mark session attendance</p>
                </div>
              </div>
              <div className="mt-4">
                <Link href="/academics/attendance" className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1">
                  Open Register <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Internal Marks</h4>
                  <p className="text-xs text-slate-500">Assessment marks grid</p>
                </div>
              </div>
              <div className="mt-4">
                <Link href="/academics/marks" className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1">
                  Manage CIE <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Digital Logbook</h4>
                  <p className="text-xs text-slate-500">Log teaching hours & topics</p>
                </div>
              </div>
              <div className="mt-4">
                <Link href="/academics/logbook" className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1">
                  Daily Log <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 rounded-lg text-rose-600">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Reports Center</h4>
                  <p className="text-xs text-slate-500">Download XLSX & PDF</p>
                </div>
              </div>
              <div className="mt-4">
                <Link href="/reports" className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1">
                  Export Center <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>
          </div>
        </div>
      )}

      {user.role === "STUDENT" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Card>
              <CardTitle>My Academic Profile</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">Roll No: {user.student_profile?.roll_no || "23CSE001"}</p>
              <div className="mt-3 text-xs space-y-1.5">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Class:</span>
                  <span className="font-semibold text-slate-800">{user.student_profile?.class_group_name || "TE-CSE A"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Academic Year:</span>
                  <span className="font-semibold text-slate-800">2026-27</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100">
                <Link
                  href="/reports"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Progress Report Card (PDF)</span>
                </Link>
              </div>
            </Card>

            <Card>
              <CardTitle>Quick Access</CardTitle>
              <div className="mt-3 space-y-2 text-xs">
                <Link href="/academics/attendance" className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-indigo-50/50 text-slate-800">
                  <span>My Attendance Status</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </Link>
                <Link href="/academics/marks" className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-indigo-50/50 text-slate-800">
                  <span>Internal Assessment Marks</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </Link>
                <Link href="/projects" className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-indigo-50/50 text-slate-800">
                  <span>Project Repository & Submission</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </Link>
              </div>
            </Card>

            <Card>
              <CardTitle>Knowledge Assistant</CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                Ask questions from approved syllabus notes and lecture materials.
              </p>
              <div className="mt-4">
                <Link
                  href="/assistant"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Open AI Assistant</span>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
