"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent, Badge, Skeleton } from "@/components/ui/CardsAndFeedback";
import { api } from "@/lib/api";
import { ClassGroup, StudentAnalyticsSummary } from "@/types";
import dynamic from "next/dynamic";
import {
  GraduationCap,
  CalendarCheck,
  TrendingUp,
  AlertTriangle,
  User,
} from "lucide-react";

const StudentCharts = dynamic(() => import("./StudentCharts"), {
  ssr: false,
  loading: () => <Skeleton className="h-96 w-full" />,
});

interface SubjectAttendanceDetail {
  subject_id: string;
  subject_code: string;
  subject_name: string;
  attendance_pct: number;
  attended_sessions: number;
  total_sessions: number;
}

interface StudentTimelineItem {
  assessment_id: string;
  subject_code: string;
  assessment_name: string;
  date: string;
  marks_obtained: number;
  max_marks: number;
  percentage: number;
  is_absent: boolean;
}

interface StudentDetailData {
  student_profile: {
    full_name: string;
    roll_number: string;
    overall_attendance_pct: number;
    marks_avg_pct: number;
    risk_level: string;
    subject_attendance: SubjectAttendanceDetail[];
  };
  timeline: StudentTimelineItem[];
  interventions: unknown[];
}

export default function StudentAnalyticsPage() {
  const [selectedClassGroup, setSelectedClassGroup] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  // Fetch Class Groups
  const { data: classGroups = [] } = useQuery<ClassGroup[]>({
    queryKey: ["class-groups"],
    queryFn: async () => {
      const res = await api.get<ClassGroup[] | { results: ClassGroup[] }>("/academics/class-groups/");
      if (Array.isArray(res)) return res;
      if (res && "results" in res && Array.isArray(res.results)) return res.results;
      return [];
    },
  });

  // Fetch Class Summary Analytics
  const { data: analytics, isLoading } = useQuery<StudentAnalyticsSummary>({
    queryKey: ["student-analytics", selectedClassGroup],
    queryFn: async () => {
      const url = selectedClassGroup
        ? `/insights/student-analytics/?class_group_id=${selectedClassGroup}`
        : "/insights/student-analytics/";
      return api.get<StudentAnalyticsSummary>(url);
    },
  });

  // Fetch Individual Student Drilldown (if selected)
  const { data: studentDetail, isLoading: isLoadingDetail } = useQuery<StudentDetailData>({
    queryKey: ["student-drilldown", selectedStudentId],
    queryFn: async () => {
      return api.get<StudentDetailData>(`/insights/student-analytics/?student_id=${selectedStudentId}`);
    },
    enabled: !!selectedStudentId,
  });

  const scatterData = analytics?.scatter_points || [];

  return (
    <div className="space-y-6">
      {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Performance Analytics</h1>
            <p className="text-sm text-slate-500 mt-1">
              Holistic academic intelligence: Attendance vs. marks correlation, assessment trends, and student deep-dive.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={selectedClassGroup}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setSelectedClassGroup(e.target.value);
                setSelectedStudentId("");
              }}
              className="w-48 text-sm"
            >
              <option value="">All Class Groups</option>
              {classGroups.map((cg) => (
                <option key={cg.id} value={cg.id}>
                  {cg.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-slate-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Enrolled</p>
                <GraduationCap className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {analytics?.total_students ?? <Skeleton className="h-7 w-12" />}
              </p>
              <p className="text-xs text-slate-400 mt-1">Department roster</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Attendance</p>
                <CalendarCheck className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {analytics ? `${analytics.average_attendance_pct}%` : <Skeleton className="h-7 w-16" />}
              </p>
              <p className="text-xs text-slate-400 mt-1">Threshold: 75% cutoff</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg CIE Score</p>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {analytics ? `${analytics.average_marks_pct}%` : <Skeleton className="h-7 w-16" />}
              </p>
              <p className="text-xs text-slate-400 mt-1">Internal evaluations</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">At-Risk Ratio</p>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {analytics && analytics.total_students > 0
                  ? `${Math.round(((analytics.high_risk_count + analytics.medium_risk_count) / analytics.total_students) * 100)}%`
                  : "0%"}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {analytics ? `${analytics.high_risk_count} high, ${analytics.medium_risk_count} medium` : "Calculating..."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Dynamic Charts (Code-split for performance) */}
        <StudentCharts analytics={analytics} isLoading={isLoading} />

        {/* Student Individual Drill-Down Section */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  Individual Student Deep-Dive
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a student to view subject-wise attendance and assessment history.
                </p>
              </div>

              <Select
                value={selectedStudentId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedStudentId(e.target.value)}
                className="w-full sm:w-64 text-sm"
              >
                <option value="">Select a student...</option>
                {scatterData.map((s) => (
                  <option key={s.student_id} value={s.student_id}>
                    {s.roll_no ? `${s.roll_no} - ` : ""}{s.name} ({s.attendance_pct}%)
                  </option>
                ))}
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {!selectedStudentId ? (
              <div className="py-8 text-center text-sm text-slate-400">
                Choose a student from the dropdown above to inspect their detailed learning progression.
              </div>
            ) : isLoadingDetail ? (
              <div className="space-y-3 py-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : studentDetail ? (
              <div className="space-y-6">
                {/* Profile Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
                  <div>
                    <span className="text-xs text-slate-400 block">Name &amp; Roll</span>
                    <span className="font-semibold text-slate-900 block">
                      {studentDetail.student_profile.full_name}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      {studentDetail.student_profile.roll_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Overall Attendance</span>
                    <span className="font-bold text-lg text-slate-900">
                      {studentDetail.student_profile.overall_attendance_pct}%
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">CIE Average</span>
                    <span className="font-bold text-lg text-slate-900">
                      {studentDetail.student_profile.marks_avg_pct}%
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Risk Category</span>
                    <Badge
                      variant={
                        studentDetail.student_profile.risk_level === "HIGH"
                          ? "danger"
                          : studentDetail.student_profile.risk_level === "MEDIUM"
                          ? "warning"
                          : "success"
                      }
                    >
                      {studentDetail.student_profile.risk_level}
                    </Badge>
                  </div>
                </div>

                {/* Subject Attendance Breakdown */}
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                    Subject-wise Attendance Roster
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {studentDetail.student_profile.subject_attendance.map((sub: SubjectAttendanceDetail) => (
                      <div key={sub.subject_id} className="p-3 border border-slate-200 rounded-lg bg-white">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-slate-800 text-sm block">{sub.subject_code}</span>
                            <span className="text-xs text-slate-500 block truncate">{sub.subject_name}</span>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-bold ${
                              sub.attendance_pct < 75 ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {sub.attendance_pct}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                          <div
                            className={`h-1.5 rounded-full ${sub.attendance_pct < 75 ? "bg-red-500" : "bg-emerald-500"}`}
                            style={{ width: `${Math.min(sub.attendance_pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {sub.attended_sessions}/{sub.total_sessions} attended
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Assessment History Table */}
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                    Assessment Timeline &amp; Marks
                  </h3>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-600 uppercase border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4">Subject</th>
                          <th className="py-2.5 px-4">Assessment</th>
                          <th className="py-2.5 px-4">Date</th>
                          <th className="py-2.5 px-4">Marks Obtained</th>
                          <th className="py-2.5 px-4">Percentage</th>
                          <th className="py-2.5 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {studentDetail.timeline.map((item: StudentTimelineItem) => (
                          <tr key={item.assessment_id}>
                            <td className="py-2.5 px-4 font-semibold text-slate-800">{item.subject_code}</td>
                            <td className="py-2.5 px-4">{item.assessment_name}</td>
                            <td className="py-2.5 px-4 text-slate-500">{item.date}</td>
                            <td className="py-2.5 px-4 font-mono font-medium">
                              {item.is_absent ? (
                                <span className="text-red-500">Absent</span>
                              ) : (
                                `${item.marks_obtained} / ${item.max_marks}`
                              )}
                            </td>
                            <td className="py-2.5 px-4 font-bold">{item.percentage}%</td>
                            <td className="py-2.5 px-4">
                              {item.percentage >= 40 ? (
                                <Badge variant="success">Pass</Badge>
                              ) : (
                                <Badge variant="danger">Fail (&lt;40%)</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
  );
}
