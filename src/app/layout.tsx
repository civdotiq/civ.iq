import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CIV.IQ - Civic Intelligence Hub",
  description: "Know your representatives and stay informed about your government",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}