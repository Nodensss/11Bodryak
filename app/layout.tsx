import type { Metadata } from "next";
import { Manrope, Prata } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
});

const prata = Prata({
  subsets: ["latin", "cyrillic"],
  weight: "400",
  variable: "--font-prata",
});

export const metadata: Metadata = {
  title: "Встреча выпускников 11 «Б» — выбери удобный день!",
  description:
    "Голосование и обсуждение даты встречи выпускников 11 «Б».",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${manrope.variable} ${prata.variable}`}>
        {children}
      </body>
    </html>
  );
}
