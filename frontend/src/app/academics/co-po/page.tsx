"use client";

import * as React from "react";
import { apiClient } from "@/lib/api";
import {
  Subject,
  CourseOutcome,
  ProgramOutcome,
  COPOMapping,
  COAttainmentResult,
  POAttainmentResult,
  PaginatedResponse,
} from "@/types";
import { Card, Badge, Skeleton, EmptyState } from "@/components/ui/CardsAndFeedback";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/DialogAndTable";
import { Button } from "@/components/ui/Button";
import { Target, Info, Calculator } from "lucide-react";

export default function COPOAttainmentPage() {
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<number | null>(null);

  const [cos, setCos] = React.useState<CourseOutcome[]>([]);
  const [pos, setPos] = React.useState<ProgramOutcome[]>([]);
  const [mappings, setMappings] = React.useState<COPOMapping[]>([]);

  const [coAttainment, setCoAttainment] = React.useState<COAttainmentResult | null>(null);
  const [poAttainment, setPoAttainment] = React.useState<POAttainmentResult | null>(null);
  const [isComputing, setIsComputing] = React.useState(false);

  // Load subjects & POs
  React.useEffect(() => {
    async function init() {
      try {
        const [subRes, poRes] = await Promise.all([
          apiClient<PaginatedResponse<Subject>>("/subjects/"),
          apiClient<PaginatedResponse<ProgramOutcome>>("/program-outcomes/"),
        ]);
        setSubjects(subRes.results);
        setPos(poRes.results);
        if (subRes.results.length > 0) {
          setSelectedSubjectId(subRes.results[0].id);
        }
      } catch {
        // quiet catch
      }
    }
    init();
  }, []);

  // Load COs, Mappings, and Attainment for selected subject
  const loadSubjectData = React.useCallback(async (subId: number) => {
    try {
      setIsComputing(true);
      const [cosRes, mapRes, coAtt, poAtt] = await Promise.all([
        apiClient<PaginatedResponse<CourseOutcome>>("/course-outcomes/", { params: { subject: subId } }),
        apiClient<PaginatedResponse<COPOMapping>>("/co-po-mappings/"),
        apiClient<COAttainmentResult>(`/subjects/${subId}/co-attainment/`),
        apiClient<POAttainmentResult>(`/subjects/${subId}/po-attainment/`),
      ]);
      setCos(cosRes.results);
      setMappings(mapRes.results);
      setCoAttainment(coAtt);
      setPoAttainment(poAtt);
    } catch {
      // quiet catch
    } finally {
      setIsComputing(false);
    }
  }, []);

  React.useEffect(() => {
    if (selectedSubjectId) {
      loadSubjectData(selectedSubjectId);
    }
  }, [selectedSubjectId, loadSubjectData]);

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);

  // Build matrix lookup: co_id -> po_id -> level
  const matrix = React.useMemo(() => {
    const map = new Map<string, number>();
    mappings.forEach((m) => {
      map.set(`${m.course_outcome}_${m.program_outcome}`, m.level);
    });
    return map;
  }, [mappings]);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">CO-PO Mapping & Outcome Attainment</h2>
          <p className="text-xs text-slate-500">
            Outcome-Based Education (OBE): Direct Course Outcome attainment and derived Program Outcome articulation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedSubjectId || ""}
            onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>

          <Button
            size="sm"
            variant="outline"
            onClick={() => selectedSubjectId && loadSubjectData(selectedSubjectId)}
            isLoading={isComputing}
          >
            <Calculator className="h-4 w-4 mr-1.5 text-indigo-600" /> Recompute Attainment
          </Button>
        </div>
      </div>

      {/* Mandatory Department Default Values Note per Section 1.1.5 */}
      <div className="p-3.5 rounded-lg bg-indigo-50/60 border border-indigo-200 text-xs text-indigo-900 flex items-start gap-2.5">
        <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Default Department OBE Thresholds Applied: </span>
          <span>Target Score: 60% · Level 3: ≥70% students · Level 2: ≥60% students · Level 1: ≥50% students. </span>
          <span className="text-slate-500 italic block mt-0.5">
            Default values — edit in Attainment Settings to match department accreditation guidelines.
          </span>
        </div>
      </div>

      {/* 1. Direct CO Attainment Table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Target className="h-4 w-4 text-indigo-600" />
              Direct Course Outcome (CO) Attainment
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              Subject: {currentSubject?.code} · {currentSubject?.name}
            </p>
          </div>
          <Badge variant="info">OBE Criterion 3</Badge>
        </div>

        {isComputing ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !coAttainment || coAttainment.co_results.length === 0 ? (
          <EmptyState
            title="No course outcomes assessed"
            description="Create assessments and link them to course outcomes to generate direct attainment scores."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">CO Code</TableHead>
                <TableHead>Course Outcome Description</TableHead>
                <TableHead className="w-28 text-center">Linked Exams</TableHead>
                <TableHead className="w-32 text-center">Students Met</TableHead>
                <TableHead className="w-28 text-center">% Achieved</TableHead>
                <TableHead className="w-36 text-center">Attainment Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coAttainment.co_results.map((co) => (
                <TableRow key={co.co_id}>
                  <TableCell className="font-mono font-bold text-slate-900">{co.co_code}</TableCell>
                  <TableCell className="text-slate-700 text-xs">{co.description}</TableCell>
                  <TableCell className="text-center text-xs font-semibold text-slate-700">
                    {co.assessments_count}
                  </TableCell>
                  <TableCell className="text-center text-xs text-slate-700">
                    <strong>{co.students_met_target}</strong> / {co.total_students}
                  </TableCell>
                  <TableCell className="text-center text-xs font-bold text-slate-900">
                    {co.percentage_met}%
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        co.attainment_level === 3
                          ? "bg-emerald-100 text-emerald-800"
                          : co.attainment_level === 2
                          ? "bg-blue-100 text-blue-800"
                          : co.attainment_level === 1
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      Level {co.attainment_level} (of 3)
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* 2. CO-PO Mapping Matrix */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">CO-PO Articulation Matrix</h3>
            <p className="text-xs text-slate-500 mt-0.5">Correlation levels: 1 = Low, 2 = Medium, 3 = High</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-slate-50 w-24">CO \ PO</TableHead>
                {pos.map((po) => (
                  <TableHead key={po.id} className="text-center w-14 font-mono text-[11px]" title={po.title}>
                    {po.code}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {cos.map((co) => (
                <TableRow key={co.id}>
                  <TableCell className="sticky left-0 bg-white font-mono font-bold text-slate-900">
                    {co.code}
                  </TableCell>
                  {pos.map((po) => {
                    const level = matrix.get(`${co.id}_${po.id}`);
                    return (
                      <TableCell key={po.id} className="text-center font-bold text-xs">
                        {level ? (
                          <span
                            className={`inline-block w-6 h-6 leading-6 rounded-md text-center text-xs ${
                              level === 3
                                ? "bg-indigo-600 text-white"
                                : level === 2
                                ? "bg-indigo-100 text-indigo-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {level}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* 3. Derived PO Attainment */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Derived Program Outcome Attainment</h3>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">
            Formula: PO Attainment = sum(CO_level * Mapping_level) / sum(Mapping_level)
          </p>
        </div>

        {!poAttainment ? (
          <Skeleton className="h-32 m-4" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4">
            {poAttainment.po_results.map((po) => (
              <div
                key={po.po_code}
                className={`p-3 rounded-lg border text-xs text-center ${
                  po.attainment > 0 ? "border-indigo-200 bg-indigo-50/30" : "border-slate-200 bg-slate-50/50"
                }`}
              >
                <span className="font-mono font-bold text-slate-800">{po.po_code}</span>
                <p className="text-lg font-black text-slate-900 mt-1">
                  {po.attainment > 0 ? po.attainment : "—"}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate" title={po.po_title}>
                  {po.po_title}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
