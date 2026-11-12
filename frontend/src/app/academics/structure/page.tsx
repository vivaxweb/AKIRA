"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { ClassGroup, Subject, User, PaginatedResponse } from "@/types";
import { Card, Badge, Skeleton, EmptyState } from "@/components/ui/CardsAndFeedback";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Dialog } from "@/components/ui/DialogAndTable";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { Plus, GraduationCap, BookOpen, Users, UserCheck } from "lucide-react";

export default function AcademicStructurePage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [classGroups, setClassGroups] = React.useState<ClassGroup[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [facultyUsers, setFacultyUsers] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedClassId, setSelectedClassId] = React.useState<number | null>(null);

  // Modals
  const [isClassModalOpen, setIsClassModalOpen] = React.useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = React.useState(false);
  const [isCoordinatorModalOpen, setIsCoordinatorModalOpen] = React.useState(false);
  const [activeClassGroup, setActiveClassGroup] = React.useState<ClassGroup | null>(null);

  // Form states
  const [newClassName, setNewClassName] = React.useState("");
  const [newClassDiv, setNewClassDiv] = React.useState("A");
  const [newClassYear, setNewClassYear] = React.useState(3);
  const [newClassSem, setNewClassSem] = React.useState(5);

  const [newSubCode, setNewSubCode] = React.useState("");
  const [newSubName, setNewSubName] = React.useState("");
  const [newSubCredits, setNewSubCredits] = React.useState(3);
  const [newSubFaculty, setNewSubFaculty] = React.useState<number | null>(null);

  const [selectedCoordinator, setSelectedCoordinator] = React.useState<number | null>(null);

  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const [cgRes, subRes, usersRes] = await Promise.all([
        apiClient<PaginatedResponse<ClassGroup>>("/class-groups/"),
        apiClient<PaginatedResponse<Subject>>("/subjects/"),
        apiClient<PaginatedResponse<User>>("/users/", { params: { role: "FACULTY" } }),
      ]);
      setClassGroups(cgRes.results);
      setSubjects(subRes.results);
      setFacultyUsers(usersRes.results);
      if (cgRes.results.length > 0 && selectedClassId === null) {
        setSelectedClassId(cgRes.results[0].id);
      }
    } catch {
      toastError("Failed to load academic structure", "Could not fetch classes or subjects.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedClassId, toastError]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient<ClassGroup>("/class-groups/", {
        method: "POST",
        body: JSON.stringify({
          name: newClassName,
          division: newClassDiv,
          year: newClassYear,
          semester: newClassSem,
          academic_year: "2026-27",
        }),
      });
      success("Class group created", `${newClassName} Div ${newClassDiv} created.`);
      setIsClassModalOpen(false);
      setNewClassName("");
      fetchData();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError("Creation failed", apiErr?.detail || "Could not create class group.");
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) return;

    try {
      await apiClient<Subject>("/subjects/", {
        method: "POST",
        body: JSON.stringify({
          code: newSubCode,
          name: newSubName,
          credits: newSubCredits,
          class_group: selectedClassId,
          faculty: newSubFaculty || undefined,
        }),
      });
      success("Subject created", `${newSubCode} - ${newSubName} created.`);
      setIsSubjectModalOpen(false);
      setNewSubCode("");
      setNewSubName("");
      fetchData();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError("Creation failed", apiErr?.detail || "Could not create subject.");
    }
  };

  const handleAssignCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClassGroup) return;

    try {
      await apiClient<ClassGroup>(`/class-groups/${activeClassGroup.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ coordinator: selectedCoordinator }),
      });
      success("Coordinator assigned", `Class coordinator updated for ${activeClassGroup.name}.`);
      setIsCoordinatorModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError("Update failed", apiErr?.detail || "Could not assign coordinator.");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 md:col-span-2" />
        </div>
      </div>
    );
  }

  const selectedClass = classGroups.find((cg) => cg.id === selectedClassId);
  const classSubjects = subjects.filter((s) => s.class_group === selectedClassId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Academic Structure & Faculty Allocation</h2>
          <p className="text-xs text-slate-500">
            Manage academic class groups, subjects, and allocate teaching faculty and class coordinators.
          </p>
        </div>

        {user?.role === "HOD" && (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setIsClassModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Class Group
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Class Groups Column */}
        <Card className="p-4 md:col-span-1 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-indigo-600" /> Class Groups (2026-27)
            </h3>
            <span className="text-xs font-bold text-slate-700">{classGroups.length}</span>
          </div>

          <div className="space-y-2">
            {classGroups.map((cg) => (
              <div
                key={cg.id}
                onClick={() => setSelectedClassId(cg.id)}
                className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                  selectedClassId === cg.id
                    ? "border-indigo-500 bg-indigo-50/50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{cg.name} (Div {cg.division})</span>
                  <Badge variant="outline">Year {cg.year} · Sem {cg.semester}</Badge>
                </div>
                <div className="mt-2 text-slate-500 flex items-center justify-between text-[11px]">
                  <span>Coordinator: <strong className="text-slate-700">{cg.coordinator_name || "Unassigned"}</strong></span>
                  {user?.role === "HOD" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveClassGroup(cg);
                        setSelectedCoordinator(cg.coordinator);
                        setIsCoordinatorModalOpen(true);
                      }}
                      className="text-indigo-600 hover:underline flex items-center gap-0.5"
                    >
                      <UserCheck className="h-3 w-3" /> Assign
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Subjects Column */}
        <Card className="p-5 md:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Subjects for {selectedClass?.name || "Selected Class"} (Div {selectedClass?.division || "A"})
              </h3>
              <p className="text-xs text-slate-500">
                Teaching faculty allocations and course credit hours.
              </p>
            </div>

            {user?.role === "HOD" && selectedClassId && (
              <Button size="sm" variant="secondary" onClick={() => setIsSubjectModalOpen(true)}>
                <BookOpen className="h-4 w-4 mr-1.5" />
                Add Subject
              </Button>
            )}
          </div>

          {classSubjects.length === 0 ? (
            <EmptyState
              title="No subjects allocated"
              description="Click 'Add Subject' to create a subject and allocate faculty."
              action={
                user?.role === "HOD" ? (
                  <Button size="sm" onClick={() => setIsSubjectModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-1.5" /> Add Subject
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Subject Name</TableHead>
                  <TableHead>Allocated Faculty</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classSubjects.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-mono font-semibold text-slate-900">{sub.code}</TableCell>
                    <TableCell className="font-medium text-slate-800">{sub.name}</TableCell>
                    <TableCell>
                      {sub.faculty_name ? (
                        <span className="text-xs text-slate-700 flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-indigo-500" />
                          {sub.faculty_name}
                        </span>
                      ) : (
                        <Badge variant="warning">Not Allocated</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{sub.credits} Credits</TableCell>
                    <TableCell>
                      <Badge variant={sub.is_active ? "success" : "danger"}>
                        {sub.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Add Class Group Modal */}
      <Dialog
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        title="Add Class Group"
        description="Create an academic class division for the department."
      >
        <form onSubmit={handleCreateClass} className="space-y-4 text-xs">
          <Input
            label="Class Name"
            placeholder="e.g. SE-CSE or TE-CSE"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            required
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Division"
              placeholder="e.g. A"
              value={newClassDiv}
              onChange={(e) => setNewClassDiv(e.target.value)}
              required
            />
            <Select
              label="Year"
              value={newClassYear}
              onChange={(e) => setNewClassYear(Number(e.target.value))}
            >
              <option value={1}>1 (FE)</option>
              <option value={2}>2 (SE)</option>
              <option value={3}>3 (TE)</option>
              <option value={4}>4 (BE)</option>
            </Select>
            <Select
              label="Semester"
              value={newClassSem}
              onChange={(e) => setNewClassSem(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>Sem {s}</option>
              ))}
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsClassModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Class Group</Button>
          </div>
        </form>
      </Dialog>

      {/* Add Subject Modal */}
      <Dialog
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        title="Add Subject & Allocate Faculty"
        description={`Allocate a new course to ${selectedClass?.name || "this class"}.`}
      >
        <form onSubmit={handleCreateSubject} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Subject Code"
              placeholder="e.g. CS501"
              value={newSubCode}
              onChange={(e) => setNewSubCode(e.target.value)}
              required
            />
            <Input
              label="Credits"
              type="number"
              min={1}
              max={6}
              value={newSubCredits}
              onChange={(e) => setNewSubCredits(Number(e.target.value))}
              required
            />
          </div>

          <Input
            label="Subject Title"
            placeholder="e.g. Database Management Systems"
            value={newSubName}
            onChange={(e) => setNewSubName(e.target.value)}
            required
          />

          <Select
            label="Allocate Faculty Member"
            value={newSubFaculty || ""}
            onChange={(e) => setNewSubFaculty(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">-- Choose Faculty (Optional) --</option>
            {facultyUsers.map((f) => (
              <option key={f.id} value={f.id}>{f.full_name} ({f.email})</option>
            ))}
          </Select>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsSubjectModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Subject</Button>
          </div>
        </form>
      </Dialog>

      {/* Assign Coordinator Modal */}
      <Dialog
        isOpen={isCoordinatorModalOpen}
        onClose={() => setIsCoordinatorModalOpen(false)}
        title="Assign Class Coordinator"
        description={`Select a faculty coordinator for ${activeClassGroup?.name || "this class"}.`}
      >
        <form onSubmit={handleAssignCoordinator} className="space-y-4 text-xs">
          <Select
            label="Class Coordinator"
            value={selectedCoordinator || ""}
            onChange={(e) => setSelectedCoordinator(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">-- No Coordinator --</option>
            {facultyUsers.map((f) => (
              <option key={f.id} value={f.id}>{f.full_name} ({f.email})</option>
            ))}
          </Select>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsCoordinatorModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Assign Coordinator</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
