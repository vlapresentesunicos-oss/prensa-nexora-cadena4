import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nora Corresponsal - Nexativa News",
  description: "Terminal de reportes de exteriores de Nexativa News",
  manifest: "/corresponsal-manifest.json",
};

export default function CorresponsalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
