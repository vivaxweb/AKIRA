import { Role } from "@/types";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  FileSpreadsheet,
  BookOpen,
  ClipboardList,
  Target,
  BarChart3,
  AlertTriangle,
  FolderGit2,
  Bell,
  FileText,
  FileCheck2,
  Sparkles,
  Settings,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
  badge?: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["PRINCIPAL", "HOD", "FACULTY", "COORDINATOR", "STUDENT"],
  },
  // Academic Operations
  {
    title: "Structure & Allocation",
    href: "/academics/structure",
    icon: GraduationCap,
    roles: ["HOD"],
  },
  {
    title: "Attendance",
    href: "/academics/attendance",
    icon: CalendarCheck,
    roles: ["PRINCIPAL", "HOD", "FACULTY", "COORDINATOR", "STUDENT"],
  },
  {
    title: "Internal Marks",
    href: "/academics/marks",
    icon: FileSpreadsheet,
    roles: ["PRINCIPAL", "HOD", "FACULTY", "COORDINATOR", "STUDENT"],
  },
  {
    title: "Syllabus Coverage",
    href: "/academics/syllabus",
    icon: BookOpen,
    roles: ["PRINCIPAL", "HOD", "FACULTY", "COORDINATOR"],
  },
  {
    title: "Digital Logbook",
    href: "/academics/logbook",
    icon: ClipboardList,
    roles: ["PRINCIPAL", "HOD", "FACULTY", "COORDINATOR"],
  },
  {
    title: "CO-PO Attainment",
    href: "/academics/co-po",
    icon: Target,
    roles: ["PRINCIPAL", "HOD", "FACULTY", "COORDINATOR"],
  },
  // Insights & Analytics
  {
    title: "Student Analytics",
    href: "/insights/students",
    icon: BarChart3,
    roles: ["PRINCIPAL", "HOD", "FACULTY", "COORDINATOR"],
  },
  {
    title: "Academic Risk",
    href: "/insights/risk",
    icon: AlertTriangle,
    roles: ["PRINCIPAL", "HOD", "COORDINATOR"],
  },
  {
    title: "Faculty Performance",
    href: "/insights/faculty",
    icon: BarChart3,
    roles: ["PRINCIPAL", "HOD", "FACULTY", "COORDINATOR"],
  },
  // Projects
  {
    title: "Project Repository",
    href: "/projects",
    icon: FolderGit2,
    roles: ["PRINCIPAL", "HOD", "FACULTY", "COORDINATOR", "STUDENT"],
  },
  // Communication
  {
    title: "Notice Board",
    href: "/communication/notices",
    icon: Bell,
    roles: ["PRINCIPAL", "HOD", "FACULTY", "COORDINATOR", "STUDENT"],
  },
  // Documents & AI
  {
    title: "Document Library",
    href: "/documents",
    icon: FileText,
    roles: ["PRINCIPAL", "HOD", "FACULTY", "COORDINATOR", "STUDENT"],
  },
  {
    title: "AI Assistant",
    href: "/assistant",
    icon: Sparkles,
    roles: ["PRINCIPAL", "HOD", "FACULTY", "COORDINATOR", "STUDENT"],
  },
  // Reports & Accreditation
  {
    title: "Reports",
    href: "/reports",
    icon: FileSpreadsheet,
    roles: ["PRINCIPAL", "HOD", "FACULTY", "COORDINATOR", "STUDENT"],
  },
  {
    title: "Accreditation",
    href: "/accreditation",
    icon: FileCheck2,
    roles: ["PRINCIPAL", "HOD", "FACULTY", "COORDINATOR"],
  },
  // User Management
  {
    title: "User Management",
    href: "/admin/users",
    icon: Users,
    roles: ["HOD"],
  },
  // Settings
  {
    title: "Profile & Settings",
    href: "/settings/profile",
    icon: Settings,
    roles: ["PRINCIPAL", "HOD", "FACULTY", "COORDINATOR", "STUDENT"],
  },
];

export function getNavItemsForRole(role?: Role): NavItem[] {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
