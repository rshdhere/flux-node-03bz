import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "flux-node-03bz",
  description: "make me a chat-app using nextjs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
