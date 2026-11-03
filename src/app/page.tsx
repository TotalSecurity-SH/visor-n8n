import { ToolHero } from "@/components/ToolHero";
import Visor from "@/components/Visor";

export default function Page() {
  return (
    <>
      <ToolHero
        slug="n8n"
        title={
          <>
            Entiende y audita tus workflows de <span className="text-teal">n8n</span>
          </>
        }
        subtitle="Pega el JSON de un workflow y obtén su diagrama, los servicios que conecta y una revisión de riesgos: secretos expuestos, webhooks abiertos y más."
        chips={["Diagrama automático", "Detecta secretos expuestos", "Agentes de IA", "Sin enviar datos"]}
      />
      <Visor />
    </>
  );
}
