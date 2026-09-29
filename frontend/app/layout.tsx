import type { Metadata } from "next";
import { Inter, Space_Mono, Caveat } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  variable: "--font-space-mono",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aesthetic Lens - Retro Visual Posing Copilot",
  description: "Visual Posing Copilot & Editorial Darkroom Engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={inter.variable + " " + spaceMono.variable + " " + caveat.variable + " font-sans antialiased bg-[#FAF7EE] text-[#121212]"}
      >
        {children}
      </body>
    </html>
  );
}
