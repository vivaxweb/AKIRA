"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { ExecutiveDashboardKPIs, Notice as NoticeType } from "@/types";
import { Skeleton } from "@/components/ui/CardsAndFeedback";
import {
  Users,
  GraduationCap,
  CalendarCheck,
  ArrowRight,
  Clock,
  Sparkles,
  FolderGit2,
  Download,
  BookOpen,
  Bell,
  TrendingUp,
  Award,
  ChevronRight,
  PlusCircle,
  FileSpreadsheet,
  CalendarDays,
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

// Clean Live Time & Date Display
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
    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
      <Clock className="h-3.5 w-3.5 text-slate-400" />
      <span className="font-mono font-semibold text-slate-700">
        {timeStr || "12:00:00 PM"}
      </span>
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
        <Skeleton className="h-10 w-1/3 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!user) return null;

  const currentCohort = COHORT_DATA[activeCohort];

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2 font-sans text-slate-800 antialiased">
      {/* ========================================================================= */}
      {/* 1. HOD / PRINCIPAL DASHBOARD                                              */}
      {/* ========================================================================= */}
      {(user.role === "HOD" || user.role === "PRINCIPAL") && (
        <div className="space-y-6">
          {/* Airy Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Head of Department — CSE
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Computer Science & Engineering · TKIET Warananagar · AY 2026-27
              </p>
            </div>
            <div className="flex items-center gap-3">
              <LiveDateTime />
              <Link
                href="/admin/users"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>New Enroll</span>
              </Link>
            </div>
          </div>

          {/* 4 Clean Metric Cards (De-cluttered, No nested badges) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Students */}
            <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Total Students
                </span>
                <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <GraduationCap className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold text-slate-900 tracking-tight">
                  {kpis?.total_students || 51}
                </span>
                <p className="text-xs text-slate-400 mt-1">SE, TE & BE cohorts</p>
              </div>
            </div>

            {/* Total Faculty */}
            <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Total Faculty
                </span>
                <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold text-slate-900 tracking-tight">
                  {kpis?.total_faculty || 15}
                </span>
                <p className="text-xs text-slate-400 mt-1">Active CSE faculty</p>
              </div>
            </div>

            {/* Active Courses */}
            <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Active Courses
                </span>
                <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <BookOpen className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold text-slate-900 tracking-tight">
                  6
                </span>
                <p className="text-xs text-slate-400 mt-1">Even semester running</p>
              </div>
            </div>

            {/* Achievement */}
            <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  NBA Attainment
                </span>
                <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Award className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold text-slate-900 tracking-tight">
                  {kpis?.nba_compliance_rate || 60}%
                </span>
                <p className="text-xs text-slate-400 mt-1">Criteria met · NAAC &apos;A&apos;</p>
              </div>
            </div>
          </div>

          {/* Main Grid: Cohorts & Actions on Left, Activity on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left 8 Columns */}
            <div className="lg:col-span-8 space-y-5">
              {/* Class Cohorts Card */}
              <div className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-xs space-y-4">
                {/* Cohort Header & Segmented Switcher */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Class Cohorts & Batches
                    </h2>
                    <p className="text-xs text-slate-400">
                      Select academic class level to review allocations
                    </p>
                  </div>

                  {/* Sleek Segment Control */}
                  <div className="inline-flex p-1 bg-slate-100/80 rounded-xl text-xs">
                    {(["SY", "TY", "FY"] as CohortYear[]).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveCohort(tab)}
                        className={`px-4 py-1.5 font-semibold rounded-lg transition-all ${
                          activeCohort === tab
                            ? "bg-white text-indigo-600 shadow-2xs font-bold"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {tab === "SY" ? "SY (Second)" : tab === "TY" ? "TY (Third)" : "FY (Final)"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cohort Details (Clean Typography, No Nested Box Clutter) */}
                <div className="pt-1 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {currentCohort.name} · {currentCohort.code}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {currentCohort.semester} • Class Coordinator:{" "}
                        <span className="font-semibold text-slate-700">
                          {currentCohort.coordinator}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">
                          Enrolled
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                          {currentCohort.studentsCount} Students
                        </span>
                      </div>
                      <div className="h-7 w-px bg-slate-200/80" />
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">
                          Avg Attendance
                        </span>
                        <span className="text-sm font-bold text-emerald-600">
                          {currentCohort.avgAttendance}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Progress Bar */}
                  <div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${currentCohort.avgAttendance}%` }}
                      />
                    </div>
                  </div>

                  {/* Course Allocations Tags */}
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-2">
                      Allocated Courses for {activeCohort}:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {currentCohort.activeSubjects.map((sub, i) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 rounded-lg text-slate-700 font-medium transition-colors"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Action Buttons (Faithful to Hand-Drawn Sketch: New Enroll, Course Manage, Schedule Event, Report) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Link
                  href="/admin/users"
                  className="p-3.5 bg-white border border-slate-200/70 hover:border-indigo-300 hover:shadow-xs rounded-xl transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-slate-500 group-hover:text-indigo-600 transition-colors">
                    <PlusCircle className="h-4 w-4" />
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                  </div>
                  <div className="mt-3">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors block">
                      New Enroll
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Student directory & CSV
                    </span>
                  </div>
                </Link>

                <Link
                  href="/academics/structure"
                  className="p-3.5 bg-white border border-slate-200/70 hover:border-indigo-300 hover:shadow-xs rounded-xl transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-slate-500 group-hover:text-indigo-600 transition-colors">
                    <BookOpen className="h-4 w-4" />
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                  </div>
                  <div className="mt-3">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors block">
                      Course Manage
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Subjects & allocations
                    </span>
                  </div>
                </Link>

                <Link
                  href="/communication/events"
                  className="p-3.5 bg-white border border-slate-200/70 hover:border-indigo-300 hover:shadow-xs rounded-xl transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-slate-500 group-hover:text-indigo-600 transition-colors">
                    <CalendarDays className="h-4 w-4" />
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                  </div>
                  <div className="mt-3">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors block">
                      Schedule Event
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Exams & calendar
                    </span>
                  </div>
                </Link>

                <Link
                  href="/reports"
                  className="p-3.5 bg-white border border-slate-200/70 hover:border-indigo-300 hover:shadow-xs rounded-xl transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-slate-500 group-hover:text-indigo-600 transition-colors">
                    <FileSpreadsheet className="h-4 w-4" />
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                  </div>
                  <div className="mt-3">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors block">
                      Report Center
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      NBA & audit export
                    </span>
                  </div>
                </Link>
              </div>
            </div>

            {/* Right 4 Columns: Recent Activity */}
            <div className="lg:col-span-4 bg-white border border-slate-200/70 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-slate-500" />
                  <span>Recent Activity</span>
                </h3>
                <Link
                  href="/academics/logbook"
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  Logbook →
                </Link>
              </div>

              {/* Minimal Clean Activity Timeline */}
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 first:pt-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">
                      Capstone Proposal Submitted
                    </span>
                    <span className="text-[10px] text-slate-400">10m ago</span>
                  </div>
                  <p className="text-slate-500 mt-0.5 text-[11px]">
                    Vivek Desai (TE-CSE) submitted Phase-2 proposal.
                  </p>
                </div>

                <div className="py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">
                      Topic Coverage Logged
                    </span>
                    <span className="text-[10px] text-slate-400">1h ago</span>
                  </div>
                  <p className="text-slate-500 mt-0.5 text-[11px]">
                    Prof. Amol Patil logged Unit-3 for Database Systems.
                  </p>
                </div>

                <div className="py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">
                      Attendance Marked
                    </span>
                    <span className="text-[10px] text-slate-400">3h ago</span>
                  </div>
                  <p className="text-slate-500 mt-0.5 text-[11px]">
                    Attendance marked for TE-CSE Web Tech session.
                  </p>
                </div>

                <div className="py-2.5 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">
                      CIE Marks Published
                    </span>
                    <span className="text-[10px] text-slate-400">Yesterday</span>
                  </div>
                  <p className="text-slate-500 mt-0.5 text-[11px]">
                    Internal test scores published for Final Year.
                  </p>
                </div>
              </div>

              {/* Notice Highlight */}
              {notices.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                    <Bell className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
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
      )}

      {/* ========================================================================= */}
      {/* 2. FACULTY GUIDE DASHBOARD                                                */}
      {/* ========================================================================= */}
      {(user.role === "FACULTY" || user.role === "COORDINATOR") && (
        <div className="space-y-6">
          {/* Header & Faculty Profile */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-xs">
                {user.first_name?.[0]}
                {user.last_name?.[0]}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {user.full_name || "Prof. Amol G. Patil"}
                </h1>
                <p className="text-xs text-slate-500">
                  {user.faculty_profile?.designation || "Assistant Professor"} · Computer Science & Engineering
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <LiveDateTime />
              <div className="inline-flex p-1 bg-slate-100/80 rounded-xl text-xs">
                {(["SY", "TY", "FY"] as CohortYear[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveCohort(tab)}
                    className={`px-3 py-1 font-semibold rounded-lg transition-all ${
                      activeCohort === tab
                        ? "bg-white text-indigo-600 shadow-2xs font-bold"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Grid: Timetable & Syllabus on Left, Notices on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left 7 Columns: Personal Timetable + Syllabus */}
            <div className="lg:col-span-7 space-y-5">
              {/* Personal Timetable Card */}
              <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-900">
                    Today&apos;s Teaching Schedule
                  </h2>
                  <Link
                    href="/academics/attendance"
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                  >
                    Mark attendance →
                  </Link>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/60 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        Database Engineering (CS301)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {currentCohort.code} · Hall 204
                      </span>
                    </div>
                    <span className="font-mono text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200 text-[11px]">
                      09:30 AM – 10:30 AM
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/60 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        Machine Learning Laboratory
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Batch B1 · CSE Lab 3
                      </span>
                    </div>
                    <span className="font-mono text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200 text-[11px]">
                      11:00 AM – 01:00 PM
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/60 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        Capstone Project Mentorship
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Team Akira · Seminar Room
                      </span>
                    </div>
                    <span className="font-mono text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200 text-[11px]">
                      02:00 PM – 03:00 PM
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Cards: Syllabus/Logbook and Report */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  href="/academics/logbook"
                  className="bg-white border border-slate-200/70 hover:border-indigo-300 rounded-2xl p-4 shadow-xs transition-all block group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      Digital Logbook & Syllabus
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Log today&apos;s topic coverage and verify pacing.
                  </p>
                  <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full"
                      style={{ width: `${kpis?.syllabus_completion_rate || 68}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1.5 font-medium">
                    {kpis?.syllabus_completion_rate || 68}% covered
                  </span>
                </Link>

                <Link
                  href="/reports"
                  className="bg-white border border-slate-200/70 hover:border-indigo-300 rounded-2xl p-4 shadow-xs transition-all block group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      Academic Reports
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Download university attendance and CIE assessment marksheets.
                  </p>
                  <span className="text-xs text-indigo-600 font-semibold block mt-4">
                    Open Export Center →
                  </span>
                </Link>
              </div>
            </div>

            {/* Right 5 Columns: Notices & Recent Activity */}
            <div className="lg:col-span-5 space-y-4">
              {/* Notices Card */}
              <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Bell className="h-4 w-4 text-slate-400" />
                    <span>Department Circulars</span>
                  </h3>
                  <Link
                    href="/communication/notices"
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                  >
                    All notices →
                  </Link>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  {notices.length > 0 ? (
                    notices.slice(0, 3).map((n) => (
                      <div key={n.id} className="py-2.5 first:pt-0 last:pb-0">
                        <span className="font-semibold text-slate-800 block truncate">
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

              {/* Activity Card */}
              <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 mb-2">
                  Recent Entries
                </h3>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between py-1">
                    <span>Database Systems attendance logged</span>
                    <span className="text-[11px] text-slate-400">Today</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span>Topic 4.2 logbook approved by HOD</span>
                    <span className="text-[11px] text-slate-400">Yesterday</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span>Milestone 2 sign-off recorded</span>
                    <span className="text-[11px] text-slate-400">Nov 20</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. STUDENT DASHBOARD                                                      */}
      {/* ========================================================================= */}
      {user.role === "STUDENT" && (
        <div className="space-y-6">
          {/* Clean Student Profile Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-xs">
                {user.first_name?.[0]}
                {user.last_name?.[0]}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {user.full_name || "Vivek Vijaykumar Desai"}
                </h1>
                <p className="text-xs text-slate-500">
                  Roll:{" "}
                  <strong className="text-slate-700">
                    {user.student_profile?.roll_no || "26MCA121"}
                  </strong>{" "}
                  • {user.student_profile?.class_group_name || "TE-CSE (Div A)"} • Computer
                  Science & Engineering
                </p>
              </div>
            </div>

            <LiveDateTime />
          </div>

          {/* 4 Clean Action Cards (From Hand-Drawn Sketch: Academic Profile, Quick Access, Project, Assistant) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Academic Profile */}
            <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Academic Standing
                  </span>
                  <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-extrabold text-emerald-600 tracking-tight">
                    84.2%
                  </span>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    Overall Attendance (Eligible)
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                  <p>
                    Semester: <strong className="text-slate-700">Semester VI</strong>
                  </p>
                  <p>
                    Status: <strong className="text-slate-700">Good Standing</strong>
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-2">
                <Link
                  href="/reports"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 rounded-xl text-xs font-semibold transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Report Card (PDF)</span>
                </Link>
              </div>
            </div>

            {/* Card 2: Quick Operations */}
            <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Quick Access
                  </span>
                  <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <CalendarCheck className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 space-y-2 text-xs">
                  <Link
                    href="/academics/attendance"
                    className="flex items-center justify-between py-1 text-slate-700 hover:text-indigo-600 font-medium transition-colors"
                  >
                    <span>• Attendance Records</span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                  </Link>
                  <Link
                    href="/academics/marks"
                    className="flex items-center justify-between py-1 text-slate-700 hover:text-indigo-600 font-medium transition-colors"
                  >
                    <span>• CIE Internal Marks</span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                  </Link>
                  <Link
                    href="/academics/syllabus"
                    className="flex items-center justify-between py-1 text-slate-700 hover:text-indigo-600 font-medium transition-colors"
                  >
                    <span>• Syllabus Coverage</span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                  </Link>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-4 pt-2 border-t border-slate-100">
                Min 75% required for university exam
              </p>
            </div>

            {/* Card 3: Capstone Project */}
            <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Capstone Project
                  </span>
                  <div className="h-7 w-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <FolderGit2 className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-xs font-bold text-slate-900 block truncate">
                    Smart Agriculture IoT
                  </span>
                  <span className="text-xs text-slate-500 mt-0.5 block">
                    Guide: Prof. Amol Patil
                  </span>
                  <span className="text-xs text-emerald-600 font-semibold block mt-1">
                    Similarity: 12% (Original)
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-2">
                <Link
                  href="/projects"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  <span>Project Hub →</span>
                </Link>
              </div>
            </div>

            {/* Card 4: Assistant */}
            <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    AI Assistant
                  </span>
                  <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Sparkles className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-xs font-bold text-slate-900 block">
                    EduSync AI Knowledge Hub
                  </span>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Search course notes, past questions, and academic regulations.
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-2">
                <Link
                  href="/assistant"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
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
