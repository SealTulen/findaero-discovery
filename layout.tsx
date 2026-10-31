import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FINDaero CHANGELOG — Изменения в авиации",
  description: "Проверяемые изменения в российской гражданской авиации.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
