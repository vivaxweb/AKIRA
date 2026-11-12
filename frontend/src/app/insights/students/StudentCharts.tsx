"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent, Skeleton } from "@/components/ui/CardsAndFeedback";
import { StudentAnalyticsSummary } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
} from "recharts";

interface StudentChartsProps {
  analytics: StudentAnalyticsSummary | undefined;
  isLoading: boolean;
}

export default function StudentCharts({ analytics, isLoading }: StudentChartsProps) {
  const scatterData = analytics?.scatter_points || [];

  return (
    <>
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Attendance vs Marks Correlation */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center justify-between">
              <span>Attendance vs. Internal Marks Correlation</span>
              <span className="text-xs font-normal text-slate-500">Each dot represents a student</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : scatterData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-sm text-slate-400">
                No correlation data available
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      type="number"
                      dataKey="attendance_pct"
                      name="Attendance"
                      unit="%"
                      domain={[40, 100]}
                      label={{ value: "Attendance (%)", position: "insideBottom", offset: -10, fill: "#64748b", fontSize: 12 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="marks_avg_pct"
                      name="CIE Marks"
                      unit="%"
                      domain={[0, 100]}
                      label={{ value: "Internal Marks (%)", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 12 }}
                    />
                    <ZAxis range={[70, 70]} />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-2 rounded shadow text-xs space-y-1">
                              <p className="font-bold">{data.name} ({data.roll_no})</p>
                              <p>Attendance: <span className="text-indigo-300 font-semibold">{data.attendance_pct}%</span></p>
                              <p>CIE Marks: <span className="text-emerald-300 font-semibold">{data.marks_avg_pct}%</span></p>
                              <p>Risk Level: <span className="font-semibold">{data.risk_level}</span></p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter
                      name="Students"
                      data={scatterData}
                      fill="#4f46e5"
                    >
                      {scatterData.map((entry, index) => {
                        const color =
                          entry.risk_level === "HIGH"
                            ? "#ef4444"
                            : entry.risk_level === "MEDIUM"
                            ? "#f59e0b"
                            : "#10b981";
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex items-center justify-center gap-6 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Low Risk / On Track
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Medium Risk
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> High Risk
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: Risk Breakdown Donut */}
        <Card>
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900">Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics?.risk_breakdown || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {(analytics?.risk_breakdown || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assessment Progression Bar Chart */}
      <Card>
        <CardHeader className="pb-2 border-b border-slate-100">
          <CardTitle className="text-base font-semibold text-slate-900">
            Assessment Score &amp; Pass Rate Progression
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (analytics?.assessment_trends || []).length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-slate-400">
              No published assessments available
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.assessment_trends || []} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="assessment_name"
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <YAxis stroke="#64748b" domain={[0, 100]} unit="%" fontSize={12} />
                  <Tooltip
                    formatter={(val: unknown) => [`${String(val)}%`, "Rate"]}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="average_pct" name="Average Score %" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pass_rate_pct" name="Pass Rate %" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
