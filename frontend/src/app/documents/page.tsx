"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { DepartmentDocument, DocumentCategory, Role } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  Skeleton,
} from "@/components/ui/CardsAndFeedback";
import { Dialog } from "@/components/ui/DialogAndTable";
import { useToast } from "@/components/ui/Toast";
import {
  Upload,
  Search,
  Download,
  Lock,
  Calendar,
  User,
  FileCheck2,
  FolderOpen,
} from "lucide-react";

const CATEGORIES: { label: string; value: string }[] = [
  { label: "All Documents", value: "" },
  { label: "Syllabus", value: "SYLLABUS" },
  { label: "Timetable", value: "TIMETABLE" },
  { label: "Circulars", value: "CIRCULAR" },
  { label: "Templates", value: "TEMPLATE" },
  { label: "Lab Manuals", value: "LAB_MANUAL" },
  { label: "Question Papers", value: "QUESTION_PAPER" },
  { label: "Institutional Records", value: "ACCREDITATION" },
];

export default function DocumentLibraryPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Upload Form State
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState<DocumentCategory>("SYLLABUS");
  const [formVersion, setFormVersion] = useState("1.0");
  const [formIsRestricted, setFormIsRestricted] = useState(false);
  const [formFile, setFormFile] = useState<File | null>(null);

  // Fetch Documents
  const { data: documentsData, isLoading } = useQuery<{ results?: DepartmentDocument[] } | DepartmentDocument[]>({
    queryKey: ["department-documents", search, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (selectedCategory) params.append("category", selectedCategory);
      return api.get(`/communication/documents/?${params.toString()}`);
    },
  });

  const documents: DepartmentDocument[] = Array.isArray(documentsData)
    ? documentsData
    : documentsData?.results || [];

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return api.post("/communication/documents/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      success("Document Uploaded", "Document successfully indexed in repository.");
      setIsUploadModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["department-documents"] });
    },
    onError: (err: unknown) => {
      error("Upload Failed", err instanceof Error ? err.message : "Error uploading document");
    },
  });

  // Download Trigger Mutation (increments server counter and opens file)
  const downloadMutation = useMutation({
    mutationFn: async (doc: DepartmentDocument) => {
      await api.post(`/communication/documents/${doc.id}/download/`, {});
      return doc;
    },
    onSuccess: (doc: DepartmentDocument) => {
      queryClient.invalidateQueries({ queryKey: ["department-documents"] });
      if (doc.file_url) {
        window.open(doc.file_url, "_blank");
      } else {
        success("Download Recorded", `Download recorded for ${doc.title}.`);
      }
    },
  });

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormCategory("SYLLABUS");
    setFormVersion("1.0");
    setFormIsRestricted(false);
    setFormFile(null);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formFile) {
      error("Validation Error", "Please provide document title and select a file.");
      return;
    }

    const data = new FormData();
    data.append("title", formTitle.trim());
    data.append("description", formDescription.trim());
    data.append("category", formCategory);
    data.append("version", formVersion.trim());
    data.append("file", formFile);

    const allowedRoles: Role[] = formIsRestricted
      ? ["FACULTY", "HOD", "PRINCIPAL", "COORDINATOR"]
      : [];
    data.append("allowed_roles", JSON.stringify(allowedRoles));

    uploadMutation.mutate(data);
  };

  const canUpload =
    user?.role === "HOD" ||
    user?.role === "PRINCIPAL" ||
    user?.role === "FACULTY" ||
    user?.role === "COORDINATOR";

  return (
    <div className="space-y-6">
      {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <FolderOpen className="w-7 h-7 text-indigo-600" />
              Department Document Library
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Curriculum syllabi, academic timetables, lab manuals, templates, and administrative records.
            </p>
          </div>
          {canUpload && (
            <Button
              onClick={() => {
                resetForm();
                setIsUploadModalOpen(true);
              }}
              className="flex items-center gap-2 self-start sm:self-auto"
            >
              <Upload className="w-4 h-4" />
              Upload Document
            </Button>
          )}
        </div>

        {/* Search & Category Filter */}
        <Card>
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Search documents by title, keyword, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
                    selectedCategory === cat.value
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Documents Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardContent className="pt-4 space-y-3">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileCheck2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No Documents Found</p>
              <p className="text-xs text-slate-400 mt-1">
                No documents in the repository match the selected search or category filter.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => {
              const isRestricted = doc.allowed_roles && doc.allowed_roles.length > 0;

              return (
                <Card
                  key={doc.id}
                  className="flex flex-col justify-between hover:shadow-md transition-shadow border-slate-200"
                >
                  <div className="p-5 pb-2 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {doc.category.replace("_", " ")}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          v{doc.version}
                        </span>
                        {isRestricted && (
                          <span
                            className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded"
                            title="Restricted Document"
                          >
                            <Lock className="w-3 h-3 text-amber-600" /> Staff
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {doc.title}
                    </h3>
                  </div>

                  <CardContent className="pt-0 space-y-4 flex-1 flex flex-col justify-between">
                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                      {doc.description || "Official departmental repository file."}
                    </p>

                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {doc.uploader_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-500 font-medium">
                          {doc.download_count} {doc.download_count === 1 ? "download" : "downloads"}
                        </span>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadMutation.mutate(doc)}
                          isLoading={downloadMutation.isPending}
                          className="flex items-center gap-1.5 text-xs h-7"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download ({doc.file_type || "PDF"})
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal: Upload Document */}
        <Dialog
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          title="Upload Department Document"
          description="Index new syllabi, lab manuals, templates, circulars, or question papers."
          maxWidth="lg"
        >
          <form onSubmit={handleUploadSubmit} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document Title <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. B.Tech Computer Science & Engineering Curriculum (2026-27)"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as DocumentCategory)}
                >
                  <option value="SYLLABUS">Syllabus &amp; Curriculum</option>
                  <option value="TIMETABLE">Academic Timetable</option>
                  <option value="CIRCULAR">Official Circular</option>
                  <option value="TEMPLATE">Format &amp; Template</option>
                  <option value="LAB_MANUAL">Lab Manual</option>
                  <option value="QUESTION_PAPER">Question Paper / Bank</option>
                  <option value="ACCREDITATION">Institutional Record</option>
                  <option value="OTHER">Other</option>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Version
                </label>
                <Input
                  placeholder="e.g. 1.0 or 2.1"
                  value={formVersion}
                  onChange={(e) => setFormVersion(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description &amp; Purpose
              </label>
              <Textarea
                rows={3}
                placeholder="Brief summary of the document, target course, or autonomous scheme version..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            {/* File Upload Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select File (PDF, DOCX, XLSX) <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                required
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-slate-200 rounded-md p-1"
              />
            </div>

            {/* Access Restriction */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsRestricted}
                  onChange={(e) => setFormIsRestricted(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Restricted Document (Visible to Teaching Faculty &amp; HOD only)</span>
              </label>
              <span className="text-[11px] text-slate-400 block mt-1">
                When checked, students will not see or have download access to this document.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUploadModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={uploadMutation.isPending}
                disabled={uploadMutation.isPending}
              >
                Upload Document
              </Button>
            </div>
          </form>
        </Dialog>
      </div>
  );
}
