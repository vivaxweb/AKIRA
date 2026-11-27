import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { AppLayout } from "@/components/layout/AppLayout";

export const metadata: Metadata = {
  title: "EduSync | Academic Hub · CSE TKIET",
  description: "EduSync Academic Hub — Autonomous Academic operations, student analytics, capstone project repository, and AI assistant for Computer Science & Engineering.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="text-slate-900 antialiased min-h-screen selection:bg-cyan-200 selection:text-cyan-900">
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}
