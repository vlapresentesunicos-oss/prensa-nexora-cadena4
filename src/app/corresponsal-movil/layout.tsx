import type { Metadata } from "next";
import InstallAppPrompt from "@/components/InstallAppPrompt";

export const metadata: Metadata = {
  title: "Nora Móvil • Prensa NexoraOne",
  description: "Terminal de exteriores de Prensa NexoraOne • Cadena 4",
  manifest: "/corresponsal-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nora Móvil",
  },
};

export default function CorresponsalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <InstallAppPrompt
        appName="Nora Móvil"
        tagline="Periodista de Exteriores • Cadena 4"
        storageKey="nora_movil"
      />
    </>
  );
}
