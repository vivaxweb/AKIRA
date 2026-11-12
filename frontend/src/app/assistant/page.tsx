"use client";

import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import {
  KnowledgeDocument,
  KnowledgeCategory,
  ChatMessageItem,
  AssistantChatResponse,
} from "@/types";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
} from "@/components/ui/CardsAndFeedback";
import { useToast } from "@/components/ui/Toast";
import {
  Sparkles,
  Send,
  Trash2,
  BookOpen,
  HelpCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Cpu,
  RefreshCw,
  Search,
} from "lucide-react";

const SUGGESTED_PROMPTS = [
  "What is the mandatory attendance cutoff & condonation policy?",
  "What are the passing criteria for CIE internal marks?",
  "What is the duplicate similarity threshold for Capstone Projects?",
  "CS501 Database Management Systems syllabus & units",
  "TCS & Infosys campus placement eligibility & CGPA cutoff",
];

const CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  ACADEMIC_REGULATION: "Academic Regulations",
  SYLLABUS: "Course Syllabus",
  PROJECT_GUIDELINES: "Capstone Guidelines",
  PLACEMENT: "Placement Policies",
  GENERAL: "General Knowledge",
};

// Lightweight, zero-dependency Markdown Formatter
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-2 text-sm leading-relaxed text-slate-800">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Headings
        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={idx} className="pt-2 text-base font-bold text-slate-900 border-b border-slate-100 pb-1">
              {trimmed.replace(/^###\s+/, "")}
            </h3>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={idx} className="pt-3 text-lg font-bold text-slate-900 border-b border-slate-200 pb-1">
              {trimmed.replace(/^##\s+/, "")}
            </h2>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h1 key={idx} className="pt-4 text-xl font-bold text-slate-900">
              {trimmed.replace(/^#\s+/, "")}
            </h1>
          );
        }

        // Blockquote
        if (trimmed.startsWith("> ")) {
          return (
            <blockquote
              key={idx}
              className="my-1.5 border-l-4 border-indigo-500 bg-indigo-50/50 px-3 py-1.5 text-xs italic text-indigo-950 rounded-r"
            >
              {renderFormattedText(trimmed.replace(/^>\s+/, ""))}
            </blockquote>
          );
        }

        // Unordered List
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const itemText = trimmed.replace(/^[-*]\s+/, "");
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-indigo-600 mt-1 font-bold text-xs">•</span>
              <span>{renderFormattedText(itemText)}</span>
            </div>
          );
        }

        // Ordered list
        const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (olMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="font-semibold text-xs text-indigo-700 min-w-[1.25rem]">{olMatch[1]}.</span>
              <span>{renderFormattedText(olMatch[2])}</span>
            </div>
          );
        }

        // Regular paragraph
        return <p key={idx}>{renderFormattedText(trimmed)}</p>;
      })}
    </div>
  );
}

// Inline formatting (bold, italic, code)
function renderFormattedText(text: string): React.ReactNode {
  // Regex to match **bold** and `code`
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs text-slate-800">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export default function AssistantPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"chat" | "documents">("chat");
  const [inputQuery, setInputQuery] = useState("");
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [corpusSearch, setCorpusSearch] = useState("");
  const [corpusCategory, setCorpusCategory] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch Chat History
  const { data: historyData, isLoading: isHistoryLoading } = useQuery<ChatMessageItem[]>({
    queryKey: ["assistant-history"],
    queryFn: async () => {
      const res = await api.get("/assistant/history/");
      return Array.isArray(res) ? res : [];
    },
  });

  const chatHistory = React.useMemo(() => historyData || [], [historyData]);

  // Fetch Knowledge Documents
  const { data: documentsData, isLoading: isDocsLoading } = useQuery<{ results?: KnowledgeDocument[] } | KnowledgeDocument[]>({
    queryKey: ["assistant-documents", corpusSearch, corpusCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (corpusSearch) params.append("search", corpusSearch);
      if (corpusCategory) params.append("category", corpusCategory);
      return api.get(`/assistant/documents/?${params.toString()}`);
    },
    enabled: activeTab === "documents",
  });

  const documents: KnowledgeDocument[] = React.useMemo(() => {
    return Array.isArray(documentsData)
      ? documentsData
      : documentsData?.results || [];
  }, [documentsData]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (activeTab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, activeTab]);

  // Chat Mutation
  const chatMutation = useMutation({
    mutationFn: async (query: string): Promise<AssistantChatResponse> => {
      return api.post("/assistant/chat/", { query });
    },
    onSuccess: () => {
      setInputQuery("");
      queryClient.invalidateQueries({ queryKey: ["assistant-history"] });
    },
    onError: (err: unknown) => {
      error("Query Failed", err instanceof Error ? err.message : "Failed to retrieve response");
    },
  });

  // Clear History Mutation
  const clearMutation = useMutation({
    mutationFn: async () => {
      return api.delete("/assistant/history/");
    },
    onSuccess: () => {
      success("Conversation Cleared", "Assistant chat history has been reset.");
      queryClient.invalidateQueries({ queryKey: ["assistant-history"] });
    },
    onError: (err: unknown) => {
      error("Clear Failed", err instanceof Error ? err.message : "Failed to clear history");
    },
  });

  const handleSend = (text?: string) => {
    const queryToSend = (text || inputQuery).trim();
    if (!queryToSend || chatMutation.isPending) return;
    chatMutation.mutate(queryToSend);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleSourceExpand = (msgIndex: number, srcIndex: number) => {
    const key = `${msgIndex}-${srcIndex}`;
    setExpandedSources((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Sparkles className="w-7 h-7 text-indigo-600" />
              Department Knowledge Assistant
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Interactive RAG assistant for academic rules, course syllabi, capstone guidelines & placement norms.
            </p>
          </div>
        </div>
        {/* Top Control Bar & Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "chat"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Interactive Chat
            </button>
            <button
              onClick={() => setActiveTab("documents")}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "documents"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Department Corpus
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Dual-Engine RAG: Active
            </span>
            {activeTab === "chat" && chatHistory.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => clearMutation.mutate()}
                disabled={clearMutation.isPending}
                className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear Chat
              </Button>
            )}
          </div>
        </div>

        {/* TAB 1: INTERACTIVE CHAT */}
        {activeTab === "chat" && (
          <div className="grid grid-cols-1 gap-4">
            {/* Suggested Prompts Banner */}
            <div className="bg-gradient-to-r from-indigo-50/70 via-slate-50 to-blue-50/70 p-3.5 rounded-xl border border-indigo-100">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900 mb-2">
                <HelpCircle className="h-3.5 w-3.5 text-indigo-600" />
                Suggested Inquiries:
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(prompt)}
                    disabled={chatMutation.isPending}
                    className="text-left text-xs bg-white text-slate-700 hover:text-indigo-600 hover:border-indigo-300 border border-slate-200 px-2.5 py-1 rounded-lg transition-all shadow-xs"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation Flow Container */}
            <Card className="min-h-[480px] max-h-[620px] flex flex-col p-0 overflow-hidden bg-white">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                {isHistoryLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <RefreshCw className="h-7 w-7 animate-spin text-indigo-500 mb-2" />
                    <p className="text-xs">Loading assistant conversation...</p>
                  </div>
                ) : chatHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 shadow-xs">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">
                      Department Knowledge Assistant
                    </h3>
                    <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                      Ask any question regarding autonomous academic regulations, course syllabi,
                      capstone duplicate checks, or campus placement eligibility.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left w-full">
                      <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 text-xs text-slate-700">
                        <span className="font-semibold block text-slate-900 mb-0.5">Offline-Ready</span>
                        Full extractive retrieval with zero third-party dependencies required.
                      </div>
                      <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 text-xs text-slate-700">
                        <span className="font-semibold block text-slate-900 mb-0.5">Accredited Corpus</span>
                        Official TKIET Warananagar CSE guidelines, syllabus, and criteria.
                      </div>
                    </div>
                  </div>
                ) : (
                  chatHistory.map((msg, msgIdx) => (
                    <div key={msg.id || msgIdx} className="space-y-4">
                      {/* User Query */}
                      <div className="flex justify-end">
                        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl bg-indigo-600 text-white px-4 py-2.5 text-xs sm:text-sm font-medium shadow-sm">
                          <p>{msg.query}</p>
                          <div className="mt-1 text-[10px] text-indigo-200 text-right">
                            {user?.first_name || "You"}
                          </div>
                        </div>
                      </div>

                      {/* Assistant Response */}
                      <div className="flex justify-start">
                        <div className="max-w-[92%] sm:max-w-[85%] rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                          {/* Engine & Source Attribution Header */}
                          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="h-4 w-4 text-indigo-600" />
                              <span className="text-xs font-bold text-slate-900">
                                Department Assistant
                              </span>
                            </div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200/60 text-slate-700">
                              <Cpu className="h-3 w-3 text-slate-600" />
                              {msg.mode === "groq_llm" ? "Groq Llama-3.1" : "Offline Extractive"}
                            </span>
                          </div>

                          {/* Render Markdown Response */}
                          <MarkdownContent content={msg.response} />

                          {/* Sources & Citations Box */}
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="pt-2 border-t border-slate-200/80">
                              <div className="text-[11px] font-semibold text-slate-600 mb-2 flex items-center gap-1">
                                <FileText className="h-3 w-3 text-indigo-600" />
                                Cited Department Documents ({msg.sources.length}):
                              </div>
                              <div className="space-y-1.5">
                                {msg.sources.map((src, srcIdx) => {
                                  const isExpanded = !!expandedSources[`${msgIdx}-${srcIdx}`];
                                  return (
                                    <div
                                      key={src.id || srcIdx}
                                      className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-700 transition-all shadow-2xs"
                                    >
                                      <div
                                        onClick={() => toggleSourceExpand(msgIdx, srcIdx)}
                                        className="flex items-center justify-between cursor-pointer select-none"
                                      >
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                            {src.category}
                                          </Badge>
                                          <span className="font-semibold text-slate-900 hover:text-indigo-600">
                                            {src.title}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-mono text-emerald-600 font-semibold">
                                            {Math.round(src.score * 100)}% match
                                          </span>
                                          {isExpanded ? (
                                            <ChevronUp className="h-3 w-3 text-slate-400" />
                                          ) : (
                                            <ChevronDown className="h-3 w-3 text-slate-400" />
                                          )}
                                        </div>
                                      </div>
                                      {isExpanded && (
                                        <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-600 bg-slate-50/60 p-2 rounded italic">
                                          &ldquo;{src.snippet}&rdquo;
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Loading Bubble */}
                {chatMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-600 flex items-center gap-2 shadow-xs">
                      <Sparkles className="h-4 w-4 text-indigo-600 animate-spin" />
                      <span>Retrieving regulations and analyzing context...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Footer */}
              <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Input
                    ref={inputRef}
                    placeholder="Type your academic or project inquiry (e.g. 'Attendance cutoff', 'DBMS units')..."
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={chatMutation.isPending}
                    className="flex-1 bg-white text-xs sm:text-sm"
                  />
                  <Button
                    onClick={() => handleSend()}
                    disabled={!inputQuery.trim() || chatMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 shrink-0"
                  >
                    <Send className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Send</span>
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400 px-1">
                  <span>Press Enter to send. Supports autonomous regulation retrieval & citations.</span>
                  <span>TKIET CSE Department Hub</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 2: KNOWLEDGE CORPUS */}
        {activeTab === "documents" && (
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200">
              <div className="sm:col-span-2 relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search knowledge documents by keyword, syllabus topic, or regulations..."
                  value={corpusSearch}
                  onChange={(e) => setCorpusSearch(e.target.value)}
                  className="pl-9 text-xs sm:text-sm"
                />
              </div>
              <div>
                <Select
                  value={corpusCategory}
                  onChange={(e) => setCorpusCategory(e.target.value)}
                  className="text-xs sm:text-sm"
                >
                  <option value="">All Categories</option>
                  <option value="ACADEMIC_REGULATION">Academic Regulations</option>
                  <option value="SYLLABUS">Course Syllabus</option>
                  <option value="PROJECT_GUIDELINES">Capstone Guidelines</option>
                  <option value="PLACEMENT">Placement Policies</option>
                  <option value="GENERAL">General</option>
                </Select>
              </div>
            </div>

            {/* Document Cards Grid */}
            {isDocsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <Card key={n} className="animate-pulse h-48 bg-slate-50" />
                ))}
              </div>
            ) : documents.length === 0 ? (
              <Card className="text-center py-12 text-slate-500">
                <FileText className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-semibold">No knowledge documents matched your filter.</p>
                <p className="text-xs mt-1">Try resetting search filters or keywords.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map((doc) => (
                  <Card key={doc.id} className="flex flex-col justify-between border-slate-200 hover:border-indigo-300 transition-all shadow-xs">
                    <div>
                      <CardHeader className="mb-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="info">
                              {CATEGORY_LABELS[doc.category] || doc.category}
                            </Badge>
                            <span className="text-[10px] text-slate-400">
                              Updated {new Date(doc.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                          <CardTitle className="text-sm font-bold text-slate-900 mt-1">
                            {doc.title}
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="line-clamp-4 text-xs text-slate-600 leading-relaxed font-normal bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                          {doc.content}
                        </div>
                        {doc.tags && (
                          <div className="flex flex-wrap gap-1 mt-2.5">
                            {doc.tags.split(",").map((tag, tIdx) => (
                              <span
                                key={tIdx}
                                className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                              >
                                #{tag.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </div>

                    <div className="p-4 pt-0 border-t border-slate-100 mt-3 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-mono">
                        ID: #{doc.id}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setActiveTab("chat");
                          handleSend(`Explain details regarding: ${doc.title}`);
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        Ask Assistant
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
