"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { User, PaginatedResponse, Role, CSVImportResult } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Card, Badge, Skeleton, EmptyState, Pagination } from "@/components/ui/CardsAndFeedback";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/DialogAndTable";
import { Dialog } from "@/components/ui/DialogAndTable";
import { useToast } from "@/components/ui/Toast";
import { formatRole } from "@/lib/utils";
import {
  UserPlus,
  FileSpreadsheet,
  Search,
  Filter,
  Upload,
} from "lucide-react";

export default function UserManagementPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [users, setUsers] = React.useState<User[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("");

  // Create User Modal
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [newUserEmail, setNewUserEmail] = React.useState("");
  const [newUserFirstName, setNewUserFirstName] = React.useState("");
  const [newUserLastName, setNewUserLastName] = React.useState("");
  const [newUserRole, setNewUserRole] = React.useState<Role>("STUDENT");
  const [newUserRollNo, setNewUserRollNo] = React.useState("");
  const [newUserEmpId, setNewUserEmpId] = React.useState("");
  const [newUserDesig, setNewUserDesig] = React.useState("");
  const [createError, setCreateError] = React.useState<string | null>(null);

  // CSV Import Modal
  const [isCSVOpen, setIsCSVOpen] = React.useState(false);
  const [csvFile, setCsvFile] = React.useState<File | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [importResult, setImportResult] = React.useState<CSVImportResult | null>(null);

  const fetchUsers = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiClient<PaginatedResponse<User>>("/users/", {
        params: {
          page,
          search: search || undefined,
          role: roleFilter || undefined,
        },
      });
      setUsers(data.results);
      setTotalCount(data.count);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError("Failed to load users", apiErr?.detail || "Could not fetch user directory.");
    } finally {
      setIsLoading(false);
    }
  }, [page, search, roleFilter, toastError]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleActive = async (targetUser: User) => {
    try {
      await apiClient<{ is_active: boolean }>(`/users/${targetUser.id}/toggle-active/`, {
        method: "POST",
      });
      success(
        targetUser.is_active ? "User deactivated" : "User activated",
        `${targetUser.full_name}'s account status updated.`
      );
      fetchUsers();
    } catch {
      toastError("Status update failed", "Could not toggle user active status.");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    try {
      setIsSubmitting(true);
      await apiClient<User>("/users/", {
        method: "POST",
        body: JSON.stringify({
          email: newUserEmail,
          first_name: newUserFirstName,
          last_name: newUserLastName,
          role: newUserRole,
          roll_no: newUserRole === "STUDENT" ? newUserRollNo : undefined,
          employee_id: newUserRole !== "STUDENT" ? newUserEmpId : undefined,
          designation: newUserRole !== "STUDENT" ? newUserDesig : undefined,
        }),
      });
      success("User created", `Account for ${newUserEmail} created successfully.`);
      setIsCreateOpen(false);
      // Reset form
      setNewUserEmail("");
      setNewUserFirstName("");
      setNewUserLastName("");
      setNewUserRollNo("");
      setNewUserEmpId("");
      setNewUserDesig("");
      fetchUsers();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string; fields?: Record<string, string[]> };
      const msg = apiErr?.fields
        ? Object.entries(apiErr.fields).map(([k, v]) => `${k}: ${v.join(", ")}`).join(" | ")
        : apiErr?.detail || "Failed to create user.";
      setCreateError(msg);
      toastError("Creation error", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCSVImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;

    const formData = new FormData();
    formData.append("file", csvFile);

    try {
      setIsImporting(true);
      setImportResult(null);
      const res = await apiClient<CSVImportResult>("/users/import-csv/", {
        method: "POST",
        body: formData,
      });
      setImportResult(res);
      if (res.imported_count > 0) {
        success("CSV Import complete", `Successfully imported ${res.imported_count} student(s).`);
        fetchUsers();
      }
    } catch (err: unknown) {
      const apiErr = err as { detail?: string; result?: CSVImportResult };
      if (apiErr?.result) {
        setImportResult(apiErr.result);
      }
      toastError("CSV Import failed", apiErr?.detail || "Could not import CSV.");
    } finally {
      setIsImporting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / 20);

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">User Management</h2>
          <p className="text-xs text-slate-500">
            Create, manage, and bulk-import students and faculty in the {user?.department_name || "department"}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsCSVOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5 text-slate-500" />
            Import CSV
          </Button>
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1.5" />
            Create User
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, roll number or employee ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 sm:w-48">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Roles</option>
              <option value="STUDENT">Student</option>
              <option value="FACULTY">Faculty</option>
              <option value="COORDINATOR">Coordinator</option>
              <option value="HOD">HOD</option>
              <option value="PRINCIPAL">Principal</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            title="No users found"
            description="Try modifying your search or filter criteria, or add a new user."
            action={
              <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                <UserPlus className="h-4 w-4 mr-1.5" />
                Add First User
              </Button>
            }
          />
        ) : (
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Identifier</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-slate-900">{u.full_name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          u.role === "HOD" || u.role === "PRINCIPAL"
                            ? "info"
                            : u.role === "COORDINATOR"
                            ? "warning"
                            : u.role === "FACULTY"
                            ? "success"
                            : "default"
                        }
                      >
                        {formatRole(u.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {u.student_profile?.roll_no ? (
                        <span className="font-mono">{u.student_profile.roll_no}</span>
                      ) : u.faculty_profile?.employee_id ? (
                        <span className="font-mono">{u.faculty_profile.employee_id}</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {u.department_code || "General"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? "success" : "danger"}>
                        {u.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {u.id !== user?.id && (
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-md border transition-colors ${
                            u.is_active
                              ? "border-red-200 text-red-600 hover:bg-red-50"
                              : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                          }`}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              onPageChange={setPage}
            />
          </div>
        )}
      </Card>

      {/* Create User Dialog */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New User"
        description="Add a student or faculty account to the department."
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              placeholder="e.g. John"
              value={newUserFirstName}
              onChange={(e) => setNewUserFirstName(e.target.value)}
              required
            />
            <Input
              label="Last Name"
              placeholder="e.g. Doe"
              value={newUserLastName}
              onChange={(e) => setNewUserLastName(e.target.value)}
              required
            />
          </div>

          <Input
            label="Email Address"
            type="email"
            placeholder="john.doe@demo.local"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            required
          />

          <Select
            label="Role"
            value={newUserRole}
            onChange={(e) => setNewUserRole(e.target.value as Role)}
          >
            <option value="STUDENT">Student</option>
            <option value="FACULTY">Faculty</option>
            <option value="COORDINATOR">Class Coordinator</option>
          </Select>

          {newUserRole === "STUDENT" ? (
            <Input
              label="Roll Number"
              placeholder="e.g. 23CSE050"
              value={newUserRollNo}
              onChange={(e) => setNewUserRollNo(e.target.value)}
              required
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Employee ID"
                placeholder="e.g. EMP-CSE-010"
                value={newUserEmpId}
                onChange={(e) => setNewUserEmpId(e.target.value)}
                required
              />
              <Input
                label="Designation"
                placeholder="e.g. Assistant Professor"
                value={newUserDesig}
                onChange={(e) => setNewUserDesig(e.target.value)}
              />
            </div>
          )}

          {createError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {createError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create User
            </Button>
          </div>
        </form>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog
        isOpen={isCSVOpen}
        onClose={() => {
          setIsCSVOpen(false);
          setImportResult(null);
          setCsvFile(null);
        }}
        title="Bulk Import Students from CSV"
        description="Upload a CSV with columns: email, first_name, last_name, roll_no, class_group_id."
        maxWidth="lg"
      >
        <form onSubmit={handleCSVImport} className="space-y-4 text-xs">
          <div className="p-4 border-2 border-dashed border-slate-200 rounded-lg text-center hover:border-indigo-400 transition-colors">
            <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              className="text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <p className="mt-2 text-[11px] text-slate-400">
              Only UTF-8 formatted .csv files are supported.
            </p>
          </div>

          {importResult && (
            <div className="space-y-3">
              <div
                className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                  importResult.structural_error
                    ? "bg-red-50 border-red-200 text-red-700"
                    : importResult.failed_count > 0
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-emerald-50 border-emerald-200 text-emerald-800"
                }`}
              >
                <div>
                  <p className="font-semibold">
                    {importResult.structural_error
                      ? "Structural Error"
                      : `Imported ${importResult.imported_count} of ${importResult.total_rows} row(s)`}
                  </p>
                  {importResult.structural_error && (
                    <p className="text-[11px] mt-0.5">{importResult.structural_error}</p>
                  )}
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
                  <p className="font-semibold text-slate-700 text-[11px]">Row Error Report:</p>
                  {importResult.errors.map((err, idx) => (
                    <div key={idx} className="text-[11px] text-red-700 bg-white p-2 rounded border border-red-100">
                      <span className="font-semibold">Row {err.row}</span> ({err.email || "No email"}):{" "}
                      {err.errors.join("; ")}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsCSVOpen(false);
                setImportResult(null);
                setCsvFile(null);
              }}
            >
              Close
            </Button>
            <Button type="submit" disabled={!csvFile} isLoading={isImporting}>
              Start Import
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
