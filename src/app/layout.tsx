import type { Metadata } from "next";
import { Exo_2, JetBrains_Mono, Lexend, Montserrat, Rajdhani } from "next/font/google";
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

// grit-arena-v3 (US-0141): Exo 2 for Portal titles/numerals (font-grit-title),
// JetBrains Mono for tabular numbers (font-grit-mono). Rajdhani stays for landing/auth.
const exo2 = Exo_2({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-exo2",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
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
        className={`${lexend.variable} ${rajdhani.variable} ${montserrat.variable} ${exo2.variable} ${jetbrainsMono.variable} font-display antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
