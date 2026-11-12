"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Card, CardHeader, CardTitle, Badge, Skeleton } from "@/components/ui/CardsAndFeedback";
import { formatRole } from "@/lib/utils";
import {
  Users,
  GraduationCap,
  CalendarCheck,
  FileSpreadsheet,
  FileCheck2,
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
} from "lucide-react";

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

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
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                Welcome back, {user.first_name}!
              </h2>
              <Badge variant="info">{formatRole(user.role)}</Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {user.department_name ? `${user.department_name} (${user.department_code})` : "Institution-wide scope"}
              {" · "}Academic Year 2026-27
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 self-start md:self-auto">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Role-Based Access Verified</span>
          </div>
        </div>
      </div>

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
                  <p className="text-xs font-medium text-slate-500">Academic Structure</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">Classes & Faculty</p>
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
                  <p className="text-xs font-medium text-slate-500">Accreditation</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">NBA & NAAC</p>
                </div>
                <div className="p-2.5 bg-amber-50 rounded-lg text-amber-600">
                  <FileCheck2 className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <Link href="/accreditation" className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-medium">
                  Evidence Index <ArrowRight className="h-3 w-3" />
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
              <Link href="/documents" className="p-3 border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors flex items-center justify-between">
                <span className="font-semibold text-slate-900">Document Approvals</span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link href="/reports" className="p-3 border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors flex items-center justify-between">
                <span className="font-semibold text-slate-900">Report Generator</span>
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
                  Generate Summary Reports <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>
          </div>
        </div>
      )}

      {(user.role === "FACULTY" || user.role === "COORDINATOR") && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
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
                  Open Attendance Register <ArrowRight className="h-3.5 w-3.5" />
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
                  Manage Assessments <ArrowRight className="h-3.5 w-3.5" />
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
                  Add Daily Log Entry <ArrowRight className="h-3.5 w-3.5" />
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
