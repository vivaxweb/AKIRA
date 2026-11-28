"use client";

import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Copy,
  Check,
  Code2,
  Layers,
  Calculator,
  ShieldCheck,
  GraduationCap,
  MessageSquare,
} from "lucide-react";

interface PromptCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  prompts: string[];
}

const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    id: "testing",
    label: "Testing & Complexity",
    icon: ShieldCheck,
    prompts: [
      "What is the difference between Black Box and White Box testing, and how is Cyclomatic Complexity calculated?",
      "What is the difference between Code Walkthrough and Code Inspection, and what is Gunning's Fog Index?",
      "What are the unit testing environment components (drivers and stubs)?",
    ],
  },
  {
    id: "cocomo",
    label: "COCOMO Models",
    icon: Calculator,
    prompts: [
      "What are the three modes of COCOMO and their KLOC ranges?",
      "What are the Basic COCOMO coefficients and formulas for effort and development time?",
      "What are the 15 cost drivers in Intermediate COCOMO?",
      "What are the 3 stages of COCOMO-II and how are Object Points calculated?",
      "How does Detailed COCOMO calculate size equivalent for reusable code?",
    ],
  },
  {
    id: "design",
    label: "Software Design",
    icon: Layers,
    prompts: [
      "What is the difference between coupling and cohesion and their six types?",
      "What are the objectives and three levels of software design?",
      "What are the DFD symbols and Object-Oriented Design concepts?",
    ],
  },
  {
    id: "srs",
    label: "SRS & Process",
    icon: Code2,
    prompts: [
      "What are the 12 characteristics and components of a good SRS document?",
      "What are the 5 framework activities and 8 umbrella activities in software process?",
    ],
  },
  {
    id: "academic",
    label: "Academic Rules",
    icon: GraduationCap,
    prompts: [
      "What is the mandatory attendance cutoff & condonation policy?",
      "What are the passing criteria for CIE internal marks?",
      "What is the duplicate similarity threshold for Capstone Projects?",
      "TCS & Infosys campus placement eligibility & CGPA cutoff",
    ],
  },
];

const CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  ACADEMIC_REGULATION: "Academic Regulations",
  SYLLABUS: "Course Syllabus",
  PROJECT_GUIDELINES: "Capstone Guidelines",
  PLACEMENT: "Placement Policies",
  GENERAL: "General Knowledge",
};

// Enhanced Markdown & Table Parser
function MarkdownContent({ content }: { content: string }) {
  const blocks = React.useMemo(() => {
    const rawLines = content.split("\n");
    const resultBlocks: { type: "table" | "code" | "lines"; data: string[] }[] = [];
    let currentTable: string[] = [];
    let currentCode: string[] = [];
    let inCode = false;
    let normalLines: string[] = [];

    const flushNormal = () => {
      if (normalLines.length > 0) {
        resultBlocks.push({ type: "lines", data: [...normalLines] });
        normalLines = [];
      }
    };

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      const trimmed = line.trim();

      // Fenced code blocks
      if (trimmed.startsWith("```")) {
        if (inCode) {
          resultBlocks.push({ type: "code", data: [...currentCode] });
          currentCode = [];
          inCode = false;
        } else {
          flushNormal();
          inCode = true;
        }
        continue;
      }

      if (inCode) {
        currentCode.push(line);
        continue;
      }

      // Markdown Tables
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        flushNormal();
        currentTable.push(trimmed);
        continue;
      } else if (currentTable.length > 0) {
        resultBlocks.push({ type: "table", data: [...currentTable] });
        currentTable = [];
      }

      normalLines.push(line);
    }

    if (inCode && currentCode.length > 0) {
      resultBlocks.push({ type: "code", data: currentCode });
    }
    if (currentTable.length > 0) {
      resultBlocks.push({ type: "table", data: currentTable });
    }
    flushNormal();

    return resultBlocks;
  }, [content]);

  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-slate-800">
      {blocks.map((block, bIdx) => {
        if (block.type === "code") {
          return (
            <pre
              key={bIdx}
              className="my-3 overflow-x-auto rounded-xl bg-slate-900 p-3.5 font-mono text-xs text-emerald-400 shadow-inner"
            >
              <code>{block.data.join("\n")}</code>
            </pre>
          );
        }

        if (block.type === "table") {
          const rows = block.data
            .map((r) =>
              r
                .split("|")
                .map((cell) => cell.trim())
                .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
            )
            .filter((r) => r.length > 0);

          if (rows.length < 2) return null;

          const headerRow = rows[0];
          const isSeparator = (r: string[]) => r.every((c) => /^:?-+:?$/.test(c));
          const bodyRows = rows.slice(1).filter((r) => !isSeparator(r));

          return (
            <div
              key={bIdx}
              className="my-3.5 overflow-x-auto rounded-xl border border-slate-200/90 shadow-xs bg-white"
            >
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-100 to-indigo-50/60 border-b border-slate-200 text-slate-900 font-bold">
                    {headerRow.map((h, hIdx) => (
                      <th key={hIdx} className="px-3.5 py-2.5 whitespace-nowrap">
                        {renderFormattedText(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bodyRows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={
                        rIdx % 2 === 0
                          ? "bg-white hover:bg-indigo-50/30 transition-colors"
                          : "bg-slate-50/50 hover:bg-indigo-50/30 transition-colors"
                      }
                    >
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3.5 py-2 text-slate-700 leading-normal">
                          {renderFormattedText(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        // Normal Lines
        return (
          <React.Fragment key={bIdx}>
            {block.data.map((line, lIdx) => {
              const trimmed = line.trim();
              if (!trimmed) {
                return <div key={lIdx} className="h-1.5" />;
              }

              // Display Math ($$ ... $$)
              if (trimmed.startsWith("$$") && trimmed.endsWith("$$")) {
                const mathExpr = trimmed.slice(2, -2).trim();
                return (
                  <div
                    key={lIdx}
                    className="my-3 overflow-x-auto rounded-xl border border-indigo-200/70 bg-gradient-to-r from-indigo-50/90 via-slate-50 to-blue-50/70 px-4 py-2.5 font-mono text-xs sm:text-sm font-semibold text-indigo-950 shadow-xs"
                  >
                    {mathExpr}
                  </div>
                );
              }

              // Headings
              if (trimmed.startsWith("#### ")) {
                return (
                  <h4
                    key={lIdx}
                    className="pt-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-indigo-900 border-l-2 border-indigo-600 pl-2 mt-2"
                  >
                    {trimmed.replace(/^####\s+/, "")}
                  </h4>
                );
              }
              if (trimmed.startsWith("### ")) {
                return (
                  <h3
                    key={lIdx}
                    className="pt-2 text-base font-bold text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-1.5"
                  >
                    <Sparkles className="h-4 w-4 text-indigo-600 inline shrink-0" />
                    <span>{trimmed.replace(/^###\s+/, "")}</span>
                  </h3>
                );
              }
              if (trimmed.startsWith("## ")) {
                return (
                  <h2 key={lIdx} className="pt-3 text-lg font-bold text-slate-900 border-b border-slate-200 pb-1">
                    {trimmed.replace(/^##\s+/, "")}
                  </h2>
                );
              }
              if (trimmed.startsWith("# ")) {
                return (
                  <h1 key={lIdx} className="pt-4 text-xl font-bold text-slate-900">
                    {trimmed.replace(/^#\s+/, "")}
                  </h1>
                );
              }

              // Divider
              if (trimmed === "---") {
                return <hr key={lIdx} className="my-3 border-slate-200" />;
              }

              // Blockquote
              if (trimmed.startsWith("> ")) {
                return (
                  <blockquote
                    key={lIdx}
                    className="my-2 border-l-4 border-indigo-500 bg-indigo-50/60 px-3.5 py-2 text-xs italic text-indigo-950 rounded-r-lg"
                  >
                    {renderFormattedText(trimmed.replace(/^>\s+/, ""))}
                  </blockquote>
                );
              }

              // Unordered List
              if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                const itemText = trimmed.replace(/^[-*]\s+/, "");
                return (
                  <div key={lIdx} className="flex items-start gap-2.5 pl-2 my-1">
                    <span className="text-indigo-600 mt-1.5 font-bold text-[10px] shrink-0">●</span>
                    <span className="text-slate-700">{renderFormattedText(itemText)}</span>
                  </div>
                );
              }

              // Ordered List
              const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
              if (olMatch) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-2 my-1">
                    <span className="font-bold text-xs text-indigo-700 min-w-[1.25rem] shrink-0">
                      {olMatch[1]}.
                    </span>
                    <span className="text-slate-700">{renderFormattedText(olMatch[2])}</span>
                  </div>
                );
              }

              // Regular paragraph
              return (
                <p key={lIdx} className="text-slate-700 leading-relaxed">
                  {renderFormattedText(trimmed)}
                </p>
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Inline formatting (bold, italic, code, math)
function renderFormattedText(text: string): React.ReactNode {
  // Regex to match **bold**, `code`, and $math$
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\$.*?\$)/g);

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
        <code key={index} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs text-indigo-700 font-medium">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("$") && part.endsWith("$")) {
      return (
        <span key={index} className="font-mono text-indigo-900 font-semibold bg-indigo-50/80 px-1 py-0.5 rounded text-xs">
          {part.slice(1, -1)}
        </span>
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
  const [selectedPromptCategory, setSelectedPromptCategory] = useState<string>("testing");
  const [inputQuery, setInputQuery] = useState("");
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [corpusSearch, setCorpusSearch] = useState("");
  const [corpusCategory, setCorpusCategory] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      success("Conversation Reset", "Assistant chat history has been cleared.");
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleSourceExpand = (msgIndex: number, srcIndex: number) => {
    const key = `${msgIndex}-${srcIndex}`;
    setExpandedSources((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const activeCategoryObj = PROMPT_CATEGORIES.find((c) => c.id === selectedPromptCategory) || PROMPT_CATEGORIES[0];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-1.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-200">
              <Sparkles className="w-5 h-5" />
            </span>
            EduSync AI Knowledge Assistant
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Autonomous RAG assistant indexed with Software Engineering (COCOMO, Testing, Design, SRS), Syllabi &amp; Academic Guidelines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Dual-Engine RAG: 16 Indexed Documents
          </span>
        </div>
      </div>

      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === "chat"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                : "bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Interactive Chat
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === "documents"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                : "bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Knowledge Repository ({documents.length || 16})
          </button>
        </div>

        {activeTab === "chat" && chatHistory.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending}
            className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Clear Chat History
          </Button>
        )}
      </div>

      {/* TAB 1: INTERACTIVE CHAT */}
      {activeTab === "chat" && (
        <div className="space-y-4">
          {/* Quick-Inquiry Category Explorer */}
          <div className="bg-gradient-to-r from-indigo-50/80 via-white to-blue-50/80 p-3.5 rounded-2xl border border-indigo-100 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                <HelpCircle className="h-3.5 w-3.5 text-indigo-600" />
                <span>Suggested Inquiries by Domain:</span>
              </div>
              <span className="text-[11px] text-indigo-600 font-medium hidden sm:inline">
                Click any topic to ask instantly
              </span>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-1.5">
              {PROMPT_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = cat.id === selectedPromptCategory;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedPromptCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Prompt Chips for Selected Category */}
            <div className="flex flex-wrap gap-2 pt-1 border-t border-indigo-100/60">
              {activeCategoryObj.prompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  disabled={chatMutation.isPending}
                  className="text-left text-xs bg-white text-slate-800 hover:text-indigo-700 hover:border-indigo-400 border border-slate-200 px-3 py-1.5 rounded-xl transition-all shadow-2xs hover:shadow-xs group flex items-center gap-1.5"
                >
                  <Sparkles className="h-3 w-3 text-indigo-400 group-hover:text-indigo-600 shrink-0" />
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Conversation Workspace Container */}
          <Card className="h-[620px] flex flex-col p-0 overflow-hidden bg-slate-50/40 rounded-2xl border-slate-200 shadow-sm">
            {/* Scrollable Message Flow */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {isHistoryLoading ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                  <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mb-3" />
                  <p className="text-xs font-medium">Loading assistant memory and regulations...</p>
                </div>
              ) : chatHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center max-w-xl mx-auto space-y-4">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900">
                      How can I help you today?
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      Ask any question regarding Software Engineering (Testing, COCOMO, Design, SRS),
                      Autonomous Academic Rules, DBMS Syllabi, or Capstone Policies.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left pt-2">
                    {PROMPT_CATEGORIES.slice(0, 4).map((c) => {
                      const Icon = c.icon;
                      return (
                        <div
                          key={c.id}
                          onClick={() => handleSend(c.prompts[0])}
                          className="p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-xs cursor-pointer transition-all group"
                        >
                          <div className="flex items-center gap-2 mb-1 text-slate-900 group-hover:text-indigo-600 font-semibold text-xs">
                            <Icon className="h-3.5 w-3.5 text-indigo-600" />
                            <span>{c.label}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2">
                            {c.prompts[0]}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                chatHistory.map((msg, msgIdx) => (
                  <div key={msg.id || msgIdx} className="space-y-3.5">
                    {/* User Query Bubble */}
                    <div className="flex justify-end items-end gap-2">
                      <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-xs bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-3 text-xs sm:text-sm font-medium shadow-sm shadow-indigo-100">
                        <p className="leading-relaxed">{msg.query}</p>
                        <div className="mt-1 text-[10px] text-indigo-200 text-right">
                          {user?.first_name || "You"} • {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}
                        </div>
                      </div>
                    </div>

                    {/* Assistant Response Card */}
                    <div className="flex justify-start items-start gap-3">
                      <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xs shrink-0 mt-1">
                        <Sparkles className="h-4 w-4" />
                      </div>

                      <div className="flex-1 max-w-[95%] sm:max-w-[88%] rounded-2xl bg-white border border-slate-200/90 p-4 sm:p-5 space-y-3.5 shadow-xs">
                        {/* Header with Engine & Copy */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              EduSync Academic Assistant
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              <Cpu className="h-3 w-3 text-indigo-600" />
                              {msg.mode === "groq_llm" ? "Groq Llama-3.1" : "Dual-Engine RAG"}
                            </span>
                          </div>

                          <button
                            onClick={() => handleCopy(msg.response, msgIdx)}
                            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600 transition-colors px-2 py-1 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200"
                            title="Copy response to clipboard"
                          >
                            {copiedIndex === msgIdx ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-600" />
                                <span className="text-emerald-600 font-semibold text-[10px]">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span className="text-[10px]">Copy</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Render Markdown Response */}
                        <MarkdownContent content={msg.response} />

                        {/* Sources & Citations Box */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="pt-3 border-t border-slate-100 space-y-2">
                            <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5 text-indigo-600" />
                              <span>Cited Knowledge Sources ({msg.sources.length}):</span>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                              {msg.sources.map((src, srcIdx) => {
                                const isExpanded = !!expandedSources[`${msgIdx}-${srcIdx}`];
                                return (
                                  <div
                                    key={src.id || srcIdx}
                                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs text-slate-700 transition-all hover:bg-white hover:border-indigo-300 shadow-2xs"
                                  >
                                    <div
                                      onClick={() => toggleSourceExpand(msgIdx, srcIdx)}
                                      className="flex items-center justify-between cursor-pointer select-none gap-2"
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 shrink-0 bg-white">
                                          {src.category}
                                        </Badge>
                                        <span className="font-semibold text-slate-900 truncate hover:text-indigo-600">
                                          {src.title}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                          {Math.round(src.score * 100)}% match
                                        </span>
                                        {isExpanded ? (
                                          <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                                        ) : (
                                          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                                        )}
                                      </div>
                                    </div>

                                    {isExpanded && (
                                      <div className="mt-2.5 pt-2 border-t border-slate-200 text-xs text-slate-600 bg-white p-2.5 rounded-lg border leading-relaxed">
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

              {/* Pending Assistant Response Loader */}
              {chatMutation.isPending && (
                <div className="flex justify-start items-center gap-3 animate-pulse">
                  <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
                    <Sparkles className="h-4 w-4 animate-spin" />
                  </div>
                  <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3 text-xs text-slate-700 flex items-center gap-2 shadow-xs">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-bounce" />
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]" />
                    </div>
                    <span className="font-medium text-slate-600">
                      Searching knowledge base and formulating technical response...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-200 bg-white">
              <div className="flex items-center gap-2.5">
                <textarea
                  ref={textareaRef}
                  rows={2}
                  placeholder="Ask any technical or academic question (e.g. 'What is the difference between Black Box and White Box testing?', 'COCOMO modes')..."
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={chatMutation.isPending}
                  className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                <Button
                  onClick={() => handleSend()}
                  disabled={!inputQuery.trim() || chatMutation.isPending}
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white h-12 px-5 rounded-xl shadow-xs shrink-0 flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline font-semibold text-xs">Send</span>
                </Button>
              </div>

              <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400 px-1">
                <span>Press <strong>Enter</strong> to submit, <strong>Shift + Enter</strong> for a new line.</span>
                <span className="font-medium">TKIET CSE Academic Hub</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: KNOWLEDGE CORPUS */}
      {activeTab === "documents" && (
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
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
                <option value="SYLLABUS">Course Syllabus &amp; SE</option>
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
                <Card key={n} className="animate-pulse h-48 bg-slate-50 rounded-2xl" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <Card className="text-center py-12 text-slate-500 rounded-2xl">
              <FileText className="h-8 w-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-semibold">No knowledge documents matched your filter.</p>
              <p className="text-xs mt-1">Try resetting search filters or keywords.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map((doc) => (
                <Card
                  key={doc.id}
                  className="flex flex-col justify-between border-slate-200 hover:border-indigo-300 transition-all shadow-xs rounded-2xl bg-white"
                >
                  <div>
                    <div className="p-5 pb-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="info">
                          {CATEGORY_LABELS[doc.category] || doc.category}
                        </Badge>
                        <span className="text-[10px] text-slate-400">
                          Updated {new Date(doc.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {doc.title}
                      </h3>
                    </div>
                    <CardContent>
                      <div className="line-clamp-4 text-xs text-slate-600 leading-relaxed font-normal bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                        {doc.content}
                      </div>
                      {doc.tags && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {doc.tags.split(",").map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium"
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
                      Doc #{doc.id}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActiveTab("chat");
                        handleSend(`Explain details regarding: ${doc.title}`);
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200 rounded-xl"
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
  );
}
