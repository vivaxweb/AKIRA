"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Notice, NoticeCategory, NoticePriority, Role } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  Badge,
  Skeleton,
} from "@/components/ui/CardsAndFeedback";
import { Dialog } from "@/components/ui/DialogAndTable";
import { useToast } from "@/components/ui/Toast";
import {
  Bell,
  Pin,
  Plus,
  Search,
  Calendar,
  User,
  Paperclip,
  Flame,
  AlertCircle,
  FileText,
} from "lucide-react";

const CATEGORIES: { label: string; value: string }[] = [
  { label: "All Notices", value: "" },
  { label: "Academic", value: "ACADEMIC" },
  { label: "Exams", value: "EXAM" },
  { label: "Placements", value: "PLACEMENT" },
  { label: "Events & Workshops", value: "EVENT" },
  { label: "General", value: "GENERAL" },
];

const PRIORITY_BADGES: Record<NoticePriority, { label: string; variant: "danger" | "warning" | "default" }> = {
  URGENT: { label: "Urgent", variant: "danger" },
  NORMAL: { label: "Normal", variant: "default" },
  LOW: { label: "Low", variant: "default" },
};

export default function NoticeBoardPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [activeNotice, setActiveNotice] = useState<Notice | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<NoticeCategory>("ACADEMIC");
  const [formPriority, setFormPriority] = useState<NoticePriority>("NORMAL");
  const [formContent, setFormContent] = useState("");
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formTargetRoles, setFormTargetRoles] = useState<Role[]>([]);

  // Fetch Notices
  const { data: noticesData, isLoading } = useQuery<{ results?: Notice[] } | Notice[]>({
    queryKey: ["notices", search, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (selectedCategory) params.append("category", selectedCategory);
      return api.get(`/communication/notices/?${params.toString()}`);
    },
  });

  const notices: Notice[] = Array.isArray(noticesData)
    ? noticesData
    : noticesData?.results || [];

  const pinnedNotices = notices.filter((n) => n.is_pinned);
  const regularNotices = notices.filter((n) => !n.is_pinned);

  // Publish Notice Mutation
  const publishNoticeMutation = useMutation({
    mutationFn: async (payload: {
      title: string;
      content: string;
      category: NoticeCategory;
      priority: NoticePriority;
      is_pinned: boolean;
      target_roles: Role[];
    }) => {
      return api.post("/communication/notices/", payload);
    },
    onSuccess: () => {
      success("Notice Published", "Your notice has been broadcasted to the department.");
      setIsPublishModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["notices"] });
    },
    onError: (err: unknown) => {
      error("Publishing Failed", err instanceof Error ? err.message : "Error publishing notice");
    },
  });

  const resetForm = () => {
    setFormTitle("");
    setFormCategory("ACADEMIC");
    setFormPriority("NORMAL");
    setFormContent("");
    setFormIsPinned(false);
    setFormTargetRoles([]);
  };

  const handlePublishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) {
      error("Validation Error", "Please provide both title and content.");
      return;
    }

    publishNoticeMutation.mutate({
      title: formTitle.trim(),
      content: formContent.trim(),
      category: formCategory,
      priority: formPriority,
      is_pinned: formIsPinned,
      target_roles: formTargetRoles,
    });
  };

  const canPublish =
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
              <Bell className="w-7 h-7 text-indigo-600" />
              Department Notice Board
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Official circulars, exam notifications, and placement announcements for CSE Department.
            </p>
          </div>
          {canPublish && (
            <Button
              onClick={() => {
                resetForm();
                setIsPublishModalOpen(true);
              }}
              className="flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              Publish Notice
            </Button>
          )}
        </div>

        {/* Filter Controls & Search */}
        <Card>
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  placeholder="Search notices by keyword, title, or publisher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            {/* Category Pills */}
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

        {/* Pinned Notices Carousel / Section */}
        {pinnedNotices.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700">
              <Pin className="w-4 h-4 text-indigo-600 fill-indigo-100" />
              Pinned Announcements ({pinnedNotices.length})
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pinnedNotices.map((n) => (
                <div
                  key={n.id}
                  onClick={() => setActiveNotice(n)}
                  className="p-4 rounded-xl border-2 border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/70 transition cursor-pointer shadow-sm relative group"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                        {n.category}
                      </span>
                      {n.priority === "URGENT" && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded animate-pulse">
                          <Flame className="w-3 h-3 text-red-600" /> URGENT
                        </span>
                      )}
                    </div>
                    <Pin className="w-4 h-4 text-indigo-600 fill-indigo-600" />
                  </div>

                  <h3 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition">
                    {n.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                    {n.content}
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-indigo-100 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      {n.publisher_name} ({n.publisher_role})
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {new Date(n.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Regular Notices List */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            All Recent Circulars ({regularNotices.length})
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : regularNotices.length === 0 && pinnedNotices.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No Notices Found</p>
                <p className="text-xs text-slate-400 mt-1">There are no notices matching this criteria.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {regularNotices.map((n) => (
                <Card
                  key={n.id}
                  onClick={() => setActiveNotice(n)}
                  className="cursor-pointer hover:border-indigo-300 hover:shadow-sm transition"
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {n.category}
                        </span>
                        <Badge variant={PRIORITY_BADGES[n.priority]?.variant || "default"}>
                          {n.priority}
                        </Badge>
                      </div>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm hover:text-indigo-600 transition">
                      {n.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {n.content}
                    </p>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Published by {n.publisher_name} ({n.publisher_role})
                      </span>
                      {n.attachment && (
                        <span className="flex items-center gap-1 text-indigo-600 font-medium">
                          <Paperclip className="w-3 h-3" /> Attachment Available
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Modal 1: Read Notice Detail */}
        <Dialog
          isOpen={!!activeNotice}
          onClose={() => setActiveNotice(null)}
          title={activeNotice?.title || "Department Notice"}
          description={
            activeNotice
              ? `${activeNotice.category} Notice • Priority: ${activeNotice.priority}`
              : ""
          }
          maxWidth="lg"
        >
          {activeNotice && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div>
                  <span className="font-semibold text-slate-700 block">
                    {activeNotice.publisher_name}
                  </span>
                  <span className="text-[11px]">{activeNotice.publisher_role}</span>
                </div>
                <div className="text-right">
                  <span className="block font-medium">
                    {new Date(activeNotice.created_at).toLocaleString()}
                  </span>
                  {activeNotice.expires_at && (
                    <span className="text-[11px] text-amber-600">
                      Valid until: {activeNotice.expires_at}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {activeNotice.content}
                </p>
              </div>

              {activeNotice.attachment && (
                <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-medium text-indigo-900">Official Attachment File</span>
                  </div>
                  <a
                    href={activeNotice.attachment}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  >
                    Download File
                  </a>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button variant="outline" size="sm" onClick={() => setActiveNotice(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Dialog>

        {/* Modal 2: Publish Notice */}
        <Dialog
          isOpen={isPublishModalOpen}
          onClose={() => setIsPublishModalOpen(false)}
          title="Publish New Department Notice"
          description="Broadcast official announcements and circulars to students and faculty."
          maxWidth="lg"
        >
          <form onSubmit={handlePublishSubmit} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notice Title <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Schedule for CIE-2 Verification and Marks Entry"
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
                  onChange={(e) => setFormCategory(e.target.value as NoticeCategory)}
                >
                  <option value="ACADEMIC">Academic</option>
                  <option value="EXAM">Examination</option>
                  <option value="PLACEMENT">Placement &amp; Internships</option>
                  <option value="EVENT">Events &amp; Workshops</option>
                  <option value="GENERAL">General Notice</option>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Priority <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as NoticePriority)}
                >
                  <option value="NORMAL">Normal</option>
                  <option value="URGENT">Urgent (Highlighted Alert)</option>
                  <option value="LOW">Low</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notice Content <span className="text-red-500">*</span>
              </label>
              <Textarea
                rows={5}
                placeholder="Enter complete notice text, instructions, deadlines, and contact details..."
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                required
              />
            </div>

            {/* Target Audience & Pinned Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsPinned}
                  onChange={(e) => setFormIsPinned(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Pin to top of Notice Board</span>
              </label>

              <div className="text-xs text-slate-500">
                Audience: <span className="font-semibold text-slate-700">All Department Members</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPublishModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={publishNoticeMutation.isPending}
                disabled={publishNoticeMutation.isPending}
              >
                Publish Notice
              </Button>
            </div>
          </form>
        </Dialog>
      </div>
  );
}
