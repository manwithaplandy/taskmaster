import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "Taskmaster - Silly Tasks, Serious Points",
  description:
    "Generate silly tasks inspired by Taskmaster, complete them, and compete on the leaderboard!",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Navbar />
        <ErrorBoundary>
          <main className="max-w-lg mx-auto px-4 py-6">{children}</main>
        </ErrorBoundary>
      </body>
    </html>
  );
}
