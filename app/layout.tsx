import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZED Route Finder — Staff Travel Route Planner",
  description: "Find the best routes using only your eligible ZED / staff-travel interline airlines. Intelligent constrained route planner for staff travel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
