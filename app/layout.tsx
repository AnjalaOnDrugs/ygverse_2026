import type { Metadata, Viewport } from "next";
import { Unbounded, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { AppShell } from "@/components/AppShell";

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YGverse 2026",
  description: "The YGverse event app — photos, games and red-carpet voting",
  applicationName: "YGverse",
  // iOS ignores the manifest's display mode; these make "Add to Home
  // Screen" open the app full-screen like an installed PWA.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "YGverse",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#08080c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${unbounded.variable} ${schibsted.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ConvexClientProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
