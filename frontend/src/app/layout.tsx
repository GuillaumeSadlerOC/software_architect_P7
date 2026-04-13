import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Your Car Your Way — Tchat Support",
  description: "Preuve de Concept — Tchat temps réel",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
