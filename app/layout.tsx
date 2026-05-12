import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Letterpair Trainer",
  description: "Trainiere deine Letterpairs",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
        {children}
      </body>
    </html>
  );
}
