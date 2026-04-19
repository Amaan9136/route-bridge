import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "route-bridge · Flask demo",
  description: "Flask + Next.js demo powered by route-bridge",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}