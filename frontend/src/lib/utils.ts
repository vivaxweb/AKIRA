import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRole(role?: string): string {
  if (!role) return "";
  switch (role) {
    case "PRINCIPAL":
      return "Principal";
    case "HOD":
      return "Head of Department";
    case "FACULTY":
      return "Faculty";
    case "COORDINATOR":
      return "Class Coordinator";
    case "STUDENT":
      return "Student";
    default:
      return role;
  }
}
