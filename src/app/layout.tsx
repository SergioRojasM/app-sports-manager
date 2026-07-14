import type { Metadata } from "next";
import { Lexend, Montserrat, Rajdhani } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-rajdhani",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "GRIT Arena",
  description: "Transformando la forma de gestionar equipos deportivos con GRIT Arena: tu plataforma integral para entrenadores y atletas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${lexend.variable} ${rajdhani.variable} ${montserrat.variable} font-display antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
