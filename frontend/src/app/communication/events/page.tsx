"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { DepartmentEvent, EventType } from "@/types";
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
  CalendarDays,
  Plus,
  MapPin,
  Clock,
  User,
  CalendarCheck2,
} from "lucide-react";

const EVENT_TYPE_BADGES: Record<
  EventType,
  { label: string; variant: "danger" | "warning" | "info" | "success" | "default" }
> = {
  EXAM: { label: "Examination", variant: "danger" },
  DEADLINE: { label: "Deadline", variant: "warning" },
  WORKSHOP: { label: "Workshop", variant: "info" },
  SEMINAR: { label: "Guest Seminar", variant: "info" },
  MEETING: { label: "Meeting", variant: "default" },
  HOLIDAY: { label: "Holiday", variant: "success" },
  OTHER: { label: "Other", variant: "default" },
};

export default function EventsCalendarPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const [selectedType, setSelectedType] = useState<string>("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState<EventType>("WORKSHOP");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formLocation, setFormLocation] = useState("");

  // Fetch Events
  const { data: eventsData, isLoading } = useQuery<{ results?: DepartmentEvent[] } | DepartmentEvent[]>({
    queryKey: ["department-events", selectedType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedType) params.append("event_type", selectedType);
      return api.get(`/communication/events/?${params.toString()}`);
    },
  });

  const events: DepartmentEvent[] = Array.isArray(eventsData)
    ? eventsData
    : eventsData?.results || [];

  // Add Event Mutation
  const addEventMutation = useMutation({
    mutationFn: async (payload: {
      title: string;
      description: string;
      event_type: EventType;
      start_datetime: string;
      end_datetime?: string;
      location?: string;
    }) => {
      return api.post("/communication/events/", payload);
    },
    onSuccess: () => {
      success("Event Scheduled", "New academic calendar event added successfully.");
      setIsAddModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["department-events"] });
    },
    onError: (err: unknown) => {
      error("Scheduling Failed", err instanceof Error ? err.message : "Error creating event");
    },
  });

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormType("WORKSHOP");
    setFormStart("");
    setFormEnd("");
    setFormLocation("");
  };

  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formStart) {
      error("Validation Error", "Please provide event title and start date & time.");
      return;
    }

    addEventMutation.mutate({
      title: formTitle.trim(),
      description: formDescription.trim(),
      event_type: formType,
      start_datetime: new Date(formStart).toISOString(),
      end_datetime: formEnd ? new Date(formEnd).toISOString() : undefined,
      location: formLocation.trim(),
    });
  };

  const canSchedule =
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
              <CalendarDays className="w-7 h-7 text-indigo-600" />
              Academic Calendar &amp; Deadlines
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Internal exams, project reviews, expert workshops, and departmental events.
            </p>
          </div>
          {canSchedule && (
            <Button
              onClick={() => {
                resetForm();
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              Schedule Event
            </Button>
          )}
        </div>

        {/* Filter Bar */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: "All Events", value: "" },
                  { label: "Exams", value: "EXAM" },
                  { label: "Deadlines", value: "DEADLINE" },
                  { label: "Workshops", value: "WORKSHOP" },
                  { label: "Seminars", value: "SEMINAR" },
                  { label: "Meetings", value: "MEETING" },
                  { label: "Holidays", value: "HOLIDAY" },
                ].map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setSelectedType(t.value)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
                      selectedType === t.value
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <span className="text-xs text-slate-400">
                Semester Schedule: AY 2026-27 (Even Semester)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Events Timeline / List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarCheck2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No Events Scheduled</p>
              <p className="text-xs text-slate-400 mt-1">No upcoming calendar entries match the selected filter.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {events.map((evt) => {
              const startDate = new Date(evt.start_datetime);
              const endDate = evt.end_datetime ? new Date(evt.end_datetime) : null;
              const monthStr = startDate.toLocaleString("default", { month: "short" }).toUpperCase();
              const dayStr = startDate.getDate();
              const timeStr = startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

              return (
                <Card
                  key={evt.id}
                  className="hover:border-indigo-300 hover:shadow-sm transition border-slate-200"
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      {/* Date Badge */}
                      <div className="flex sm:flex-col items-center justify-center bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 w-full sm:w-20 text-center flex-shrink-0">
                        <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">
                          {monthStr}
                        </span>
                        <span className="text-2xl font-black text-indigo-900 block leading-tight">
                          {dayStr}
                        </span>
                      </div>

                      {/* Event Details */}
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={EVENT_TYPE_BADGES[evt.event_type]?.variant || "default"}>
                            {EVENT_TYPE_BADGES[evt.event_type]?.label || evt.event_type}
                          </Badge>
                          <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {timeStr}
                            {endDate && ` - ${endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                          </span>
                          {evt.location && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {evt.location}
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-slate-900 text-base">
                          {evt.title}
                        </h3>

                        {evt.description && (
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {evt.description}
                          </p>
                        )}

                        <div className="pt-2 flex items-center gap-4 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Organizer: {evt.organizer_name}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal: Schedule Event */}
        <Dialog
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Schedule Department Event"
          description="Add academic events, exam slots, workshops, or submission deadlines."
          maxWidth="lg"
        >
          <form onSubmit={handleEventSubmit} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Event Title <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Continuous Internal Evaluation (CIE-2) Examination Week"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Event Type <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as EventType)}
                >
                  <option value="EXAM">Examination</option>
                  <option value="DEADLINE">Submission Deadline</option>
                  <option value="WORKSHOP">Workshop &amp; Training</option>
                  <option value="SEMINAR">Guest Seminar</option>
                  <option value="MEETING">Department Meeting</option>
                  <option value="HOLIDAY">Holiday</option>
                  <option value="OTHER">Other</option>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Location / Venue
                </label>
                <Input
                  placeholder="e.g. Seminar Hall B / Computer Lab 3"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Start Date &amp; Time <span className="text-red-500">*</span>
                </label>
                <Input
                  type="datetime-local"
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  End Date &amp; Time
                </label>
                <Input
                  type="datetime-local"
                  value={formEnd}
                  onChange={(e) => setFormEnd(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description &amp; Agenda
              </label>
              <Textarea
                rows={4}
                placeholder="Provide additional context, prerequisites, or session schedule..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={addEventMutation.isPending}
                disabled={addEventMutation.isPending}
              >
                Schedule Event
              </Button>
            </div>
          </form>
        </Dialog>
      </div>
  );
}
