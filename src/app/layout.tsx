import type { Metadata, Viewport } from "next";
import { MovedNotice } from "@/components/MovedNotice";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pacto — seu compromisso com o grupo",
  description: "Estudo, digitação e leitura em um desafio entre amigos. Registre provas, acompanhe o progresso e cumpra o combinado.",
  openGraph: {
    title: "Pacto — seu compromisso com o grupo",
    description: "Estudo, digitação e leitura em um desafio entre amigos. Registre provas, acompanhe o progresso e cumpra o combinado.",
    locale: "pt_BR",
    type: "website",
  },
  applicationName: "Pacto",
  appleWebApp: { capable: true, title: "Pacto", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#26292e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh">
        <MovedNotice />
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
