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
      <body className="bg-slate-50 text-slate-900 antialiased">
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}
