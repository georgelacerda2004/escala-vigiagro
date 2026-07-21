import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "KidsGuard — Painel do Responsável",
  description: "Resumo e alertas da atividade do seu filho no YouTube e Roblox.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
