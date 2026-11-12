"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Subject } from "@/types";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/CardsAndFeedback";
import { useToast } from "@/components/ui/Toast";
import {
  FileSpreadsheet,
  Download,
  CalendarCheck,
  Target,
  GraduationCap,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface StudentRiskItem {
  student_id: number;
  roll_no: string;
  name: string;
  class_group_name: string;
}

export default function ReportsExportPage() {
  const { user } = useAuth();
  const { success, error } = useToast();

  const isStudent = user?.role === "STUDENT";

  // Form selections
  const [attendanceSubjectId, setAttendanceSubjectId] = useState("");
  const [marksSubjectId, setMarksSubjectId] = useState("");
  const [copoSubjectId, setCopoSubjectId] = useState("");
  const [selectedStudentProfileId, setSelectedStudentProfileId] = useState("");

  // Loading states for individual exports
  const [isExportingAtt, setIsExportingAtt] = useState(false);
  const [isExportingMarks, setIsExportingMarks] = useState(false);
  const [isExportingCopo, setIsExportingCopo] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Fetch subjects
  const { data: subjectsData } = useQuery<{ results?: Subject[] } | Subject[]>({
    queryKey: ["reports-subjects"],
    queryFn: () => api.get("/subjects/"),
    enabled: !isStudent,
  });
  const subjects: Subject[] = React.useMemo(
    () => (Array.isArray(subjectsData) ? subjectsData : subjectsData?.results || []),
    [subjectsData]
  );

  // Fetch student roster for PDF progress report (staff only)
  const { data: studentRiskData } = useQuery<{ results?: StudentRiskItem[] } | StudentRiskItem[]>({
    queryKey: ["reports-student-list"],
    queryFn: () => api.get("/insights/student-risk/"),
    enabled: !isStudent,
  });
  const students: StudentRiskItem[] = React.useMemo(
    () => (Array.isArray(studentRiskData) ? studentRiskData : studentRiskData?.results || []),
    [studentRiskData]
  );

  // Pre-fill initial subject selections
  React.useEffect(() => {
    if (subjects.length > 0) {
      if (!attendanceSubjectId) setAttendanceSubjectId(String(subjects[0].id));
      if (!marksSubjectId) setMarksSubjectId(String(subjects[0].id));
      if (!copoSubjectId) setCopoSubjectId(String(subjects[0].id));
    }
  }, [subjects, attendanceSubjectId, marksSubjectId, copoSubjectId]);

  React.useEffect(() => {
    if (students.length > 0 && !selectedStudentProfileId) {
      setSelectedStudentProfileId(String(students[0].student_id));
    }
  }, [students, selectedStudentProfileId]);

  // Handlers
  const handleDownloadAttendance = async () => {
    if (!attendanceSubjectId) return;
    setIsExportingAtt(true);
    try {
      const selectedSubj = subjects.find((s) => s.id === parseInt(attendanceSubjectId, 10));
      const code = selectedSubj?.code || "subject";
      await api.download(
        `/reports/attendance-export/?subject_id=${attendanceSubjectId}`,
        `attendance_matrix_${code}.xlsx`
      );
      success("Export Ready", "Attendance register spreadsheet downloaded successfully.");
    } catch {
      error("Export Failed", "Unable to generate attendance spreadsheet.");
    } finally {
      setIsExportingAtt(false);
    }
  };

  const handleDownloadMarks = async () => {
    if (!marksSubjectId) return;
    setIsExportingMarks(true);
    try {
      const selectedSubj = subjects.find((s) => s.id === parseInt(marksSubjectId, 10));
      const code = selectedSubj?.code || "subject";
      await api.download(
        `/reports/marks-export/?subject_id=${marksSubjectId}`,
        `cie_marks_${code}.xlsx`
      );
      success("Export Ready", "Continuous internal evaluation marks downloaded.");
    } catch {
      error("Export Failed", "Unable to generate internal marks spreadsheet.");
    } finally {
      setIsExportingMarks(false);
    }
  };

  const handleDownloadCOPO = async () => {
    if (!copoSubjectId) return;
    setIsExportingCopo(true);
    try {
      const selectedSubj = subjects.find((s) => s.id === parseInt(copoSubjectId, 10));
      const code = selectedSubj?.code || "subject";
      await api.download(
        `/reports/copo-export/?subject_id=${copoSubjectId}`,
        `copo_attainment_${code}.xlsx`
      );
      success("Export Ready", "CO-PO attainment calculation workbook downloaded.");
    } catch {
      error("Export Failed", "Unable to generate CO-PO spreadsheet.");
    } finally {
      setIsExportingCopo(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsExportingPdf(true);
    try {
      let endpoint = "/reports/student-progress-pdf/";
      let filename = "student_progress_report.pdf";

      if (!isStudent && selectedStudentProfileId) {
        endpoint += `?student_id=${selectedStudentProfileId}`;
        const targetStudent = students.find((s) => s.student_id === parseInt(selectedStudentProfileId, 10));
        if (targetStudent) {
          filename = `progress_report_${targetStudent.roll_no}.pdf`;
        }
      }

      await api.download(endpoint, filename);
      success("PDF Generated", "Student comprehensive academic progress card downloaded.");
    } catch {
      error("PDF Failed", "Unable to generate student progress report PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                <FileSpreadsheet className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Academic Reports & Export Center
                </h1>
                <p className="text-sm text-slate-500">
                  Generate authenticated institutional XLSX spreadsheets and official progress PDFs
                </p>
              </div>
            </div>
          </div>

          <Link href="/accreditation">
            <Button variant="secondary" className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              NBA Accreditation Hub <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {/* Export Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Attendance Matrix XLSX */}
          {!isStudent && (
            <Card className="hover:border-indigo-200 transition-all shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-lg bg-blue-50 text-blue-700">
                    <CalendarCheck className="w-5 h-5" />
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">
                    XLSX SPREADSHEET
                  </span>
                </div>
                <CardTitle className="text-base mt-2">Course Attendance Register</CardTitle>
                <p className="text-xs text-slate-500">
                  Full student roster matrix with session dates, total present, and attendance %
                </p>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Course / Subject
                  </label>
                  <Select
                    value={attendanceSubjectId}
                    onChange={(e) => setAttendanceSubjectId(e.target.value)}
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} — {s.name} ({s.class_group_name || "TE-CSE"})
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="pt-2">
                  <Button
                    onClick={handleDownloadAttendance}
                    isLoading={isExportingAtt}
                    disabled={!attendanceSubjectId}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Download Attendance Register (XLSX)
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Card 2: CIE Marks Sheet XLSX */}
          {!isStudent && (
            <Card className="hover:border-indigo-200 transition-all shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                    <FileSpreadsheet className="w-5 h-5" />
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">
                    XLSX SPREADSHEET
                  </span>
                </div>
                <CardTitle className="text-base mt-2">Internal Assessment Marks Sheet</CardTitle>
                <p className="text-xs text-slate-500">
                  Tabulated CIE scores with class averages, percentages, and pass/fail classification
                </p>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Course / Subject
                  </label>
                  <Select
                    value={marksSubjectId}
                    onChange={(e) => setMarksSubjectId(e.target.value)}
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} — {s.name} ({s.class_group_name || "TE-CSE"})
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="pt-2">
                  <Button
                    onClick={handleDownloadMarks}
                    isLoading={isExportingMarks}
                    disabled={!marksSubjectId}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Download Marks Sheet (XLSX)
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Card 3: CO-PO Attainment Calculation XLSX */}
          {!isStudent && (
            <Card className="hover:border-indigo-200 transition-all shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
                    <Target className="w-5 h-5" />
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">
                    2-SHEET WORKBOOK
                  </span>
                </div>
                <CardTitle className="text-base mt-2">CO-PO Attainment Calculation</CardTitle>
                <p className="text-xs text-slate-500">
                  Direct Course Outcome score mapping and full PO1..PO12 weighted correlation matrix
                </p>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Course / Subject
                  </label>
                  <Select
                    value={copoSubjectId}
                    onChange={(e) => setCopoSubjectId(e.target.value)}
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} — {s.name} ({s.class_group_name || "TE-CSE"})
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="pt-2">
                  <Button
                    onClick={handleDownloadCOPO}
                    isLoading={isExportingCopo}
                    disabled={!copoSubjectId}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Download Attainment Workbook (XLSX)
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Card 4: Comprehensive Student Progress Card PDF */}
          <Card className={`hover:border-indigo-200 transition-all shadow-sm ${isStudent ? "md:col-span-2" : ""}`}>
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-lg bg-rose-50 text-rose-700">
                  <GraduationCap className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-50 font-semibold text-rose-700 border border-rose-200">
                  OFFICIAL PDF CARD
                </span>
              </div>
              <CardTitle className="text-base mt-2">
                {isStudent ? "My Academic Progress Report Card" : "Student Comprehensive Progress Report"}
              </CardTitle>
              <p className="text-xs text-slate-500">
                Official institutional report card with attendance, CIE grades, risk status, capstone project, and signatures
              </p>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {!isStudent ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Student to Generate Report
                  </label>
                  <Select
                    value={selectedStudentProfileId}
                    onChange={(e) => setSelectedStudentProfileId(e.target.value)}
                  >
                    {students.map((st) => (
                      <option key={st.student_id} value={st.student_id}>
                        {st.roll_no} — {st.name} ({st.class_group_name})
                      </option>
                    ))}
                  </Select>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
                  <p>
                    <strong>Student Name:</strong> {user?.first_name} {user?.last_name}
                  </p>
                  <p className="mt-1">
                    <strong>Email:</strong> {user?.email}
                  </p>
                </div>
              )}
              <div className="pt-2">
                <Button
                  onClick={handleDownloadPDF}
                  isLoading={isExportingPdf}
                  className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white"
                >
                  <Download className="w-4 h-4" /> Download Progress Report (PDF)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
