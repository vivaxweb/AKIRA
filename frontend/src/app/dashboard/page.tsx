"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { ExecutiveDashboardKPIs, Notice as NoticeType } from "@/types";
import { Skeleton } from "@/components/ui/CardsAndFeedback";
import {
  CalendarCheck,
  ArrowRight,
  Clock,
  Sparkles,
  FolderGit2,
  Download,
  Bell,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

type CohortYear = "SY" | "TY" | "FY";

interface CohortDetail {
  code: string;
  name: string;
  semester: string;
  studentsCount: number;
  coordinator: string;
  avgAttendance: number;
  activeSubjects: string[];
}

const COHORT_DATA: Record<CohortYear, CohortDetail> = {
  SY: {
    code: "SE-CSE",
    name: "Second Year (SE)",
    semester: "Semester IV",
    studentsCount: 54,
    coordinator: "Prof. S. V. Mane",
    avgAttendance: 82.5,
    activeSubjects: [
      "Data Structures & Algorithms",
      "Microprocessors",
      "Discrete Mathematics",
      "Software Engineering",
    ],
  },
  TY: {
    code: "TE-CSE",
    name: "Third Year (TE)",
    semester: "Semester VI",
    studentsCount: 51,
    coordinator: "Prof. Anil S. Phalle",
    avgAttendance: 78.4,
    activeSubjects: [
      "Database Engineering",
      "Computer Networks",
      "Web Technologies",
      "Operating Systems",
    ],
  },
  FY: {
    code: "BE-CSE",
    name: "Final Year (BE)",
    semester: "Semester VIII",
    studentsCount: 62,
    coordinator: "Prof. P. R. Patil",
    avgAttendance: 85.1,
    activeSubjects: [
      "Machine Learning",
      "Cloud Computing",
      "Capstone Project - II",
      "Information Security",
    ],
  },
};

// Frosted Live Time & Date Display
function LiveDateTime() {
  const [timeStr, setTimeStr] = React.useState<string>("");
  const [dateStr, setDateStr] = React.useState<string>("");

  React.useEffect(() => {
    function update() {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setDateStr(
        now.toLocaleDateString([], {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      );
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold px-3 py-1.5 rounded-xl bg-white/60 border border-white/80 backdrop-blur-md shadow-2xs">
      <Clock className="h-3.5 w-3.5 text-cyan-600" />
      <span className="font-mono text-slate-900">{timeStr || "12:00:00 PM"}</span>
      <span className="text-slate-300">•</span>
      <span>{dateStr || "Today"}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const [activeCohort, setActiveCohort] = React.useState<CohortYear>("TY");

  const isExecutive =
    user?.role === "HOD" ||
    user?.role === "PRINCIPAL" ||
    user?.role === "COORDINATOR";

  // Fetch live executive KPIs
  const { data: kpis } = useQuery<ExecutiveDashboardKPIs>({
    queryKey: ["executive-dashboard-kpis"],
    queryFn: () => api.get("/reports/executive-dashboard/"),
    enabled: isExecutive,
  });

  // Fetch recent notices
  const { data: noticesData } = useQuery<{ results: NoticeType[] } | NoticeType[]>({
    queryKey: ["department-notices"],
    queryFn: () => api.get("/communication/notices/?page_size=5"),
  });

  const notices: NoticeType[] = Array.isArray(noticesData)
    ? noticesData
    : noticesData?.results || [];

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto py-4">
        <Skeleton className="h-14 w-1/3 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="lg:col-span-6 h-72 rounded-2xl" />
          <Skeleton className="lg:col-span-6 h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const currentCohort = COHORT_DATA[activeCohort];

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2 font-sans text-slate-800 antialiased">
      {/* ========================================================================= */}
      {/* 1. HOD / PRINCIPAL DASHBOARD (Frosted Glassmorphism Matching Mockup)       */}
      {/* ========================================================================= */}
      {(user.role === "HOD" || user.role === "PRINCIPAL") && (
        <div className="space-y-6">
          {/* Frosted Header Bar with Segmented Pill Switcher */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/60 border border-white/80 backdrop-blur-xl shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  EduSync
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-50/90 text-cyan-800 border border-cyan-200/80">
                  Head of Department
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Academic Hub · Computer Science & Engineering · AY 2026-27
              </p>
            </div>

            <div className="flex items-center gap-3">
              <LiveDateTime />

              {/* Segmented Cohort Switcher Capsule (Exact Mockup Match: SY, TY, FY) */}
              <div className="inline-flex p-1 bg-white/70 border border-white/90 rounded-2xl shadow-2xs backdrop-blur-md">
                {(["SY", "TY", "FY"] as CohortYear[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveCohort(tab)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      activeCohort === tab
                        ? "bg-white text-slate-900 shadow-xs border border-white/90"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4 Frosted Executive KPI Cards (Exact Mockup Match: Total Students, Total Faculty, Active Courses, Avg Attendance) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* 1. Total Students */}
            <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/85 p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:bg-white/80 transition-all flex flex-col justify-between">
              <span className="text-xs sm:text-sm font-semibold text-slate-600">
                Total Students
              </span>
              <div className="mt-3">
                <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight block">
                  {kpis?.total_students ? kpis.total_students.toLocaleString() : "2,480"}
                </span>
                <span className="text-[11px] text-slate-500 font-medium block mt-1">
                  SE, TE & BE enrolled
                </span>
              </div>
            </div>

            {/* 2. Total Faculty */}
            <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/85 p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:bg-white/80 transition-all flex flex-col justify-between">
              <span className="text-xs sm:text-sm font-semibold text-slate-600">
                Total Faculty
              </span>
              <div className="mt-3">
                <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight block">
                  {kpis?.total_faculty ? kpis.total_faculty.toLocaleString() : "142"}
                </span>
                <span className="text-[11px] text-slate-500 font-medium block mt-1">
                  Teaching professors
                </span>
              </div>
            </div>

            {/* 3. Active Courses */}
            <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/85 p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:bg-white/80 transition-all flex flex-col justify-between">
              <span className="text-xs sm:text-sm font-semibold text-slate-600">
                Active Courses
              </span>
              <div className="mt-3">
                <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight block">
                  68
                </span>
                <span className="text-[11px] text-slate-500 font-medium block mt-1">
                  Across 6 academic divisions
                </span>
              </div>
            </div>

            {/* 4. Avg Attendance */}
            <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/85 p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:bg-white/80 transition-all flex flex-col justify-between">
              <span className="text-xs sm:text-sm font-semibold text-slate-600">
                Avg Attendance
              </span>
              <div className="mt-3">
                <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight block">
                  {kpis?.avg_attendance ? `${kpis.avg_attendance}%` : "91.4%"}
                </span>
                <span className="text-[11px] text-emerald-700 font-medium block mt-1">
                  Department presence rate
                </span>
              </div>
            </div>
          </div>

          {/* Two-Column Main Content (Exact Mockup Match: Quick Actions on Left, Recent Activity on Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
            {/* Left 6 Columns: Quick Actions & Cohort Info */}
            <div className="lg:col-span-6 space-y-5">
              {/* Quick Actions Panel */}
              <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/85 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Quick Actions
                </h2>

                <div className="space-y-2.5">
                  <Link
                    href="/admin/users"
                    className="w-full py-3 px-4 bg-white/80 hover:bg-white text-slate-800 font-bold text-xs rounded-xl border border-white/90 shadow-2xs hover:shadow-xs transition-all text-center block"
                  >
                    Add Student
                  </Link>

                  <Link
                    href="/academics/structure"
                    className="w-full py-3 px-4 bg-white/80 hover:bg-white text-slate-800 font-bold text-xs rounded-xl border border-white/90 shadow-2xs hover:shadow-xs transition-all text-center block"
                  >
                    Create Course
                  </Link>

                  <Link
                    href="/academics/attendance"
                    className="w-full py-3 px-4 bg-white/80 hover:bg-white text-slate-800 font-bold text-xs rounded-xl border border-white/90 shadow-2xs hover:shadow-xs transition-all text-center block"
                  >
                    Mark Attendance
                  </Link>

                  <Link
                    href="/reports"
                    className="w-full py-3 px-4 bg-white/80 hover:bg-white text-slate-800 font-bold text-xs rounded-xl border border-white/90 shadow-2xs hover:shadow-xs transition-all text-center block"
                  >
                    Export Report
                  </Link>
                </div>
              </div>

              {/* Class Cohort Details Card */}
              <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/85 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-white/60">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {currentCohort.name} · {currentCohort.code}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Coordinator: <span className="font-semibold text-slate-700">{currentCohort.coordinator}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Attendance</span>
                    <span className="text-sm font-bold text-emerald-600">{currentCohort.avgAttendance}%</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">
                    Current Subjects for {activeCohort}:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentCohort.activeSubjects.map((sub, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 text-xs bg-white/80 border border-white/90 rounded-xl text-slate-700 font-medium shadow-2xs"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right 6 Columns: Recent Activity (Exact Mockup Match) */}
            <div className="lg:col-span-6 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/85 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/60">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Recent Activity
                </h2>
                <Link
                  href="/academics/logbook"
                  className="text-xs text-cyan-600 hover:text-cyan-700 font-bold"
                >
                  View logbook →
                </Link>
              </div>

              {/* Activity entries matching the mockup layout */}
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-white/60 border border-white/80 shadow-2xs">
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold text-slate-900">
                      Emily Chen <span className="font-normal text-slate-600">enrolled in CS101</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">2m ago</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/60 border border-white/80 shadow-2xs">
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold text-slate-900">
                      Prof. Miller <span className="font-normal text-slate-600">updated grades</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">15m ago</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/60 border border-white/80 shadow-2xs">
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold text-slate-900">
                      New course Physics 201 <span className="font-normal text-slate-600">added</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">1h ago</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/60 border border-white/80 shadow-2xs">
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold text-slate-900">
                      Vivek Desai (TE-CSE) <span className="font-normal text-slate-600">submitted Capstone proposal</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">3h ago</span>
                  </div>
                </div>

                {notices.length > 0 && (
                  <div className="pt-2">
                    <div className="p-3.5 rounded-xl bg-cyan-50/70 border border-cyan-100 flex items-start gap-2.5">
                      <Bell className="h-4 w-4 text-cyan-600 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 block truncate">
                          {notices[0].title}
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                          {notices[0].content}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. FACULTY GUIDE DASHBOARD (Frosted Glassmorphism)                         */}
      {/* ========================================================================= */}
      {(user.role === "FACULTY" || user.role === "COORDINATOR") && (
        <div className="space-y-6">
          {/* Header */}
          <div className="p-5 rounded-2xl bg-white/60 border border-white/80 backdrop-blur-xl shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-cyan-500/20">
                {user.first_name?.[0]}
                {user.last_name?.[0]}
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {user.full_name || "Prof. Amol G. Patil"}
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  {user.faculty_profile?.designation || "Assistant Professor"} · Computer Science & Engineering
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <LiveDateTime />
              <div className="inline-flex p-1 bg-white/70 border border-white/90 rounded-2xl shadow-2xs backdrop-blur-md">
                {(["SY", "TY", "FY"] as CohortYear[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveCohort(tab)}
                    className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                      activeCohort === tab
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Schedule & Syllabus Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
            <div className="lg:col-span-7 space-y-5">
              <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/85 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-white/60">
                  <h2 className="text-sm font-bold text-slate-900">
                    Today&apos;s Teaching Schedule
                  </h2>
                  <Link
                    href="/academics/attendance"
                    className="text-xs text-cyan-600 hover:text-cyan-700 font-bold"
                  >
                    Mark attendance →
                  </Link>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3.5 rounded-xl bg-white/60 border border-white/80 shadow-2xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">Database Engineering (CS301)</span>
                      <span className="text-[11px] text-slate-500">{currentCohort.code} · Hall 204</span>
                    </div>
                    <span className="font-mono text-slate-700 bg-white/90 px-3 py-1 rounded-lg border border-white/90 text-[11px] font-semibold">
                      09:30 AM – 10:30 AM
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/60 border border-white/80 shadow-2xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">Machine Learning Laboratory</span>
                      <span className="text-[11px] text-slate-500">Batch B1 · CSE Lab 3</span>
                    </div>
                    <span className="font-mono text-slate-700 bg-white/90 px-3 py-1 rounded-lg border border-white/90 text-[11px] font-semibold">
                      11:00 AM – 01:00 PM
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/60 border border-white/80 shadow-2xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 block">Capstone Project Mentorship</span>
                      <span className="text-[11px] text-slate-500">Team Akira · Seminar Room</span>
                    </div>
                    <span className="font-mono text-slate-700 bg-white/90 px-3 py-1 rounded-lg border border-white/90 text-[11px] font-semibold">
                      02:00 PM – 03:00 PM
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  href="/academics/logbook"
                  className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/85 p-5 shadow-xs hover:bg-white/85 transition-all block group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-cyan-700 transition-colors">
                      Digital Logbook & Syllabus
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-cyan-600 transition-colors" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Log today&apos;s topic coverage and verify pacing.
                  </p>
                  <div className="mt-3 w-full bg-white/60 rounded-full h-2 overflow-hidden border border-white/80">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-indigo-600 h-2 rounded-full"
                      style={{ width: `${kpis?.syllabus_completion_rate || 68}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1.5 font-bold">
                    {kpis?.syllabus_completion_rate || 68}% covered
                  </span>
                </Link>

                <Link
                  href="/reports"
                  className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/85 p-5 shadow-xs hover:bg-white/85 transition-all block group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-cyan-700 transition-colors">
                      Academic Reports
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-cyan-600 transition-colors" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Download university attendance and CIE assessment marksheets.
                  </p>
                  <span className="text-xs text-cyan-600 font-bold block mt-3">
                    Open Export Center →
                  </span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/85 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/60">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Bell className="h-4 w-4 text-cyan-600" />
                  <span>Department Circulars</span>
                </h3>
                <Link
                  href="/communication/notices"
                  className="text-xs text-cyan-600 hover:text-cyan-700 font-bold"
                >
                  All notices →
                </Link>
              </div>

              <div className="space-y-2.5 text-xs">
                {notices.length > 0 ? (
                  notices.slice(0, 3).map((n) => (
                    <div key={n.id} className="p-3 rounded-xl bg-white/60 border border-white/80 shadow-2xs">
                      <span className="font-bold text-slate-900 block truncate">
                        {n.title}
                      </span>
                      <p className="text-slate-500 text-[11px] line-clamp-1 mt-0.5">
                        {n.content}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-xs text-slate-400">
                    No notices currently posted.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. STUDENT DASHBOARD (Frosted Glassmorphism)                               */}
      {/* ========================================================================= */}
      {user.role === "STUDENT" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="p-5 rounded-2xl bg-white/60 border border-white/80 backdrop-blur-xl shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-cyan-500/20">
                {user.first_name?.[0]}
                {user.last_name?.[0]}
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {user.full_name || "Vivek Vijaykumar Desai"}
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Roll: <strong className="text-slate-800">{user.student_profile?.roll_no || "26MCA121"}</strong> • {user.student_profile?.class_group_name || "TE-CSE (Div A)"}
                </p>
              </div>
            </div>

            <LiveDateTime />
          </div>

          {/* 4 Frosted Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Card 1: Academic Standing */}
            <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/85 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Attendance
                  </span>
                  <div className="h-7 w-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-extrabold text-emerald-600 tracking-tight">
                    84.2%
                  </span>
                  <span className="text-xs text-slate-500 font-medium block mt-0.5">
                    Eligible for Exams
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-white/60 text-xs text-slate-600 space-y-1">
                  <p>Semester: <strong className="text-slate-800">Sem VI</strong></p>
                  <p>Status: <strong className="text-slate-800">Good Standing</strong></p>
                </div>
              </div>
              <div className="mt-4 pt-2">
                <Link
                  href="/reports"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-white/85 hover:bg-white text-slate-800 border border-white/90 rounded-xl text-xs font-bold shadow-2xs transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Report Card (PDF)</span>
                </Link>
              </div>
            </div>

            {/* Card 2: Quick Operations */}
            <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/85 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Quick Access
                  </span>
                  <div className="h-7 w-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <CalendarCheck className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 space-y-2 text-xs">
                  <Link
                    href="/academics/attendance"
                    className="flex items-center justify-between py-1 text-slate-700 hover:text-cyan-700 font-semibold transition-colors"
                  >
                    <span>• Attendance Log</span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                  </Link>
                  <Link
                    href="/academics/marks"
                    className="flex items-center justify-between py-1 text-slate-700 hover:text-cyan-700 font-semibold transition-colors"
                  >
                    <span>• CIE Internal Marks</span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                  </Link>
                  <Link
                    href="/academics/syllabus"
                    className="flex items-center justify-between py-1 text-slate-700 hover:text-cyan-700 font-semibold transition-colors"
                  >
                    <span>• Syllabus Coverage</span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                  </Link>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-4 pt-2 border-t border-white/60">
                Min 75% required for university exam
              </p>
            </div>

            {/* Card 3: Capstone Project */}
            <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/85 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Capstone Project
                  </span>
                  <div className="h-7 w-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <FolderGit2 className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-xs font-extrabold text-slate-900 block truncate">
                    Smart Agriculture IoT
                  </span>
                  <span className="text-xs text-slate-500 mt-0.5 block">
                    Guide: Prof. Amol Patil
                  </span>
                  <span className="text-xs text-emerald-600 font-bold block mt-1">
                    Similarity: 12% (Original)
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-2">
                <Link
                  href="/projects"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-500/20 transition-all"
                >
                  <span>Project Hub →</span>
                </Link>
              </div>
            </div>

            {/* Card 4: Assistant */}
            <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/85 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    AI Assistant
                  </span>
                  <div className="h-7 w-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-cyan-500" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-xs font-extrabold text-slate-900 block">
                    EduSync AI Knowledge Hub
                  </span>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Search notes, past exam questions, and regulations.
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-2">
                <Link
                  href="/assistant"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-white/85 hover:bg-white text-slate-800 border border-white/90 rounded-xl text-xs font-bold shadow-2xs transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5 text-cyan-600" />
                  <span>Launch Assistant</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
