import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { AppLayout } from "@/components/layout/AppLayout";

export const metadata: Metadata = {
  title: "Department Digital Hub | CSE TKIET",
  description: "Academic operations, analytics, project repository, and communication platform for Computer Science & Engineering.",
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
