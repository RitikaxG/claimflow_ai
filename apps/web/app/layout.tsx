import "@repo/ui/styles.css";
import "./globals.css";
import type { Metadata } from "next";
import { Geist } from "next/font/google";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "ClaimFlow AI",
    template: "%s · ClaimFlow AI",
  },
  description: "A governed agentic insurance-claim workflow with RAG, guardrails, human review, safe memory, gateway observability, and evaluations.",
  applicationName: "ClaimFlow AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={geist.className}>{children}</body>
    </html>
  );
}
