import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prensa NexoraOne • Cadena 4",
  description: "Suite Enterprise de Periodismo, Cobertura en Vivo con IA, Auto-Clipper y Distribución Omnicanal por Nexora One",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="bg-[#030712] text-slate-100 antialiased selection:bg-red-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
