import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { GlobalLoadingBar } from "@/components/ui/GlobalLoadingBar";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "Evalo — Assessment & Student Review Portal",
  description:
    "Modern classroom assessment, automated OMR grading, and interactive study reviewer portal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased selection:bg-steel/25 selection:text-text-primary"
        suppressHydrationWarning
      >
        <ThemeProvider>
          <GlobalLoadingBar />
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
