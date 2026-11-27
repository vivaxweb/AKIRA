"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Subject } from "@/types";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import {
  Card,
  CardContent,
} from "@/components/ui/CardsAndFeedback";
import { useToast } from "@/components/ui/Toast";
import {
  FileSpreadsheet,
  Download,
  CalendarCheck,
  GraduationCap,
} from "lucide-react";

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
  const [selectedStudentProfileId, setSelectedStudentProfileId] = useState("");

  // Loading states for individual exports
  const [isExportingAtt, setIsExportingAtt] = useState(false);
  const [isExportingMarks, setIsExportingMarks] = useState(false);
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
    }
  }, [subjects, attendanceSubjectId, marksSubjectId]);

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
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Frosted Header */}
      <div className="p-5 rounded-2xl bg-white/60 border border-white/80 backdrop-blur-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white rounded-xl shadow-sm shadow-cyan-500/20">
            <FileSpreadsheet className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Academic Reports & Export Center
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Generate authenticated institutional XLSX spreadsheets and official progress PDFs
            </p>
          </div>
        </div>
      </div>

      {/* Export Cards Grid (Frosted Glassmorphism) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: Attendance Matrix XLSX */}
        {!isStudent && (
          <Card className="rounded-2xl border border-white/85 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:bg-white/80 transition-all flex flex-col justify-between">
            <div className="p-5 pb-3 border-b border-white/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-blue-50/80 text-blue-700 border border-blue-100">
                  <CalendarCheck className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/80 border border-white/90 font-bold text-slate-700">
                  XLSX MATRIX
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">Course Attendance Register</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Full student roster matrix with session dates, total present, and attendance %
                </p>
              </div>
            </div>
            <CardContent className="pt-4 space-y-4 flex-1 flex flex-col justify-between">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
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
                  variant="glass"
                  className="w-full flex items-center justify-center gap-2 text-xs font-bold py-2.5"
                >
                  <Download className="w-4 h-4 text-cyan-600" /> Download Register (XLSX)
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card 2: CIE Marks Sheet XLSX */}
        {!isStudent && (
          <Card className="rounded-2xl border border-white/85 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:bg-white/80 transition-all flex flex-col justify-between">
            <div className="p-5 pb-3 border-b border-white/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-emerald-50/80 text-emerald-700 border border-emerald-100">
                  <FileSpreadsheet className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/80 border border-white/90 font-bold text-slate-700">
                  XLSX SPREADSHEET
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">Internal Assessment Marks Sheet</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Tabulated CIE scores with class averages, percentages, and pass/fail classification
                </p>
              </div>
            </div>
            <CardContent className="pt-4 space-y-4 flex-1 flex flex-col justify-between">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
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
                  variant="glass"
                  className="w-full flex items-center justify-center gap-2 text-xs font-bold py-2.5"
                >
                  <Download className="w-4 h-4 text-emerald-600" /> Download Marks (XLSX)
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card 3: Comprehensive Student Progress Card PDF */}
        <Card className={`rounded-2xl border border-white/85 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:bg-white/80 transition-all flex flex-col justify-between ${isStudent ? "md:col-span-2 lg:col-span-3" : ""}`}>
          <div className="p-5 pb-3 border-b border-white/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-xl bg-purple-50/80 text-purple-700 border border-purple-100">
                <GraduationCap className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-50 font-bold text-purple-700 border border-purple-200">
                OFFICIAL PDF
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-snug">
                {isStudent ? "My Academic Progress Report Card" : "Student Progress Card"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Official institutional report card with attendance, CIE grades, risk status, capstone project, and signatures
              </p>
            </div>
          </div>
          <CardContent className="pt-4 space-y-4 flex-1 flex flex-col justify-between">
            {!isStudent ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
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
              <div className="p-3 bg-white/60 rounded-xl border border-white/80 text-xs text-slate-600">
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
                variant="primary"
                className="w-full flex items-center justify-center gap-2 text-xs font-bold py-2.5"
              >
                <Download className="w-4 h-4" /> Download Progress Report (PDF)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
