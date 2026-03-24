import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Betting Intelligence Dashboard",
  description: "Sports betting analytics powered by AI",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
