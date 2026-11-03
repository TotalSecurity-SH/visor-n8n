import type { Metadata, Viewport } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://herramientas.totalsecuritysh.com"),
  title: "Visor de workflows n8n · Total Security SH",
  description: "Pega el JSON de un workflow de n8n y velo como diagrama, con su inventario de nodos y una auditoría de riesgos.",
};

export const viewport: Viewport = { themeColor: "#0b1424" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-MX" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
