// Lectura, diagrama y auditoría de workflows exportados de n8n (JSON).

export interface NodoN8n {
  id?: string;
  name: string;
  type: string;
  typeVersion?: number;
  position: [number, number];
  parameters?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  disabled?: boolean;
}

export interface Workflow {
  name?: string;
  nodes: NodoN8n[];
  connections: Record<string, Record<string, { node: string; type: string; index: number }[][]>>;
  settings?: Record<string, unknown>;
}

export type Categoria = "Disparador" | "IA" | "Lógica" | "Datos" | "Código" | "HTTP" | "Integración";

export interface NodoVisual {
  nombre: string;
  tipo: string;
  servicio: string;
  categoria: Categoria;
  x: number;
  y: number;
  deshabilitado: boolean;
}

export interface Conexion {
  de: string;
  a: string;
  salida: number;
  tipo: string;
}

export interface Hallazgo {
  nivel: "error" | "aviso" | "info";
  titulo: string;
  nodo?: string;
}

export class WorkflowInvalido extends Error {}

const LOGICA = ["if", "switch", "merge", "filter", "splitInBatches", "wait", "noOp", "splitOut", "aggregate", "compareDatasets", "executeWorkflow", "stopAndError"];
const DATOS = ["set", "itemLists", "dateTime", "crypto", "html", "markdown", "xml", "spreadsheetFile", "extractFromFile", "convertToFile", "sort", "limit", "removeDuplicates", "renameKeys"];

const NOMBRES: Record<string, string> = {
  agent: "Agente IA", lmChatOpenAi: "OpenAI", lmChatAnthropic: "Anthropic", lmChatGoogleGemini: "Gemini",
  memoryBufferWindow: "Memoria", whatsApp: "WhatsApp", hubspot: "HubSpot", googleSheets: "Google Sheets",
  gmail: "Gmail", googleDrive: "Google Drive", googleCalendar: "Google Calendar", httpRequest: "HTTP",
  webhook: "Webhook", scheduleTrigger: "Programado", manualTrigger: "Manual", openAi: "OpenAI",
  postgres: "PostgreSQL", mySql: "MySQL", supabase: "Supabase", telegram: "Telegram", chatwoot: "Chatwoot",
};

function nombreServicio(tipo: string): string {
  const corto = tipo.split(".").pop() ?? tipo;
  if (NOMBRES[corto]) return NOMBRES[corto];
  const limpio = corto.replace(/Trigger$/, "").replace(/Tool$/, "");
  if (NOMBRES[limpio]) return NOMBRES[limpio];
  return limpio.charAt(0).toUpperCase() + limpio.slice(1).replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function categoria(tipo: string): Categoria {
  const corto = tipo.split(".").pop() ?? "";
  if (/trigger$/i.test(corto) || corto === "webhook" || corto === "cron" || corto === "manualTrigger") return "Disparador";
  if (tipo.startsWith("@n8n/n8n-nodes-langchain") || /openAi|anthropic|gemini|mistral|ollama/i.test(corto)) return "IA";
  if (corto === "code" || corto === "function" || corto === "functionItem" || corto === "executeCommand") return "Código";
  if (corto === "httpRequest" || corto === "respondToWebhook" || corto === "graphql") return "HTTP";
  if (LOGICA.includes(corto)) return "Lógica";
  if (DATOS.includes(corto)) return "Datos";
  return "Integración";
}

export function leerWorkflow(texto: string): Workflow {
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    throw new WorkflowInvalido("El texto no es JSON válido. Copia el workflow desde n8n con Ctrl+A y Ctrl+C.");
  }
  const wf = (Array.isArray(datos) ? datos[0] : datos) as Partial<Workflow> & { data?: Workflow };
  const real = wf?.nodes ? wf : wf?.data;
  if (!real || !Array.isArray(real.nodes)) throw new WorkflowInvalido("No encontramos nodos. Asegúrate de pegar un workflow exportado de n8n.");
  return { name: real.name, nodes: real.nodes, connections: real.connections ?? {}, settings: real.settings };
}

export function diagrama(wf: Workflow) {
  const nodos: NodoVisual[] = wf.nodes
    .filter((n) => !n.type.endsWith("stickyNote"))
    .map((n) => ({
      nombre: n.name,
      tipo: n.type,
      servicio: nombreServicio(n.type),
      categoria: categoria(n.type),
      x: n.position?.[0] ?? 0,
      y: n.position?.[1] ?? 0,
      deshabilitado: !!n.disabled,
    }));
  const nombres = new Set(nodos.map((n) => n.nombre));
  const conexiones: Conexion[] = [];
  for (const [de, porTipo] of Object.entries(wf.connections)) {
    for (const [tipo, salidas] of Object.entries(porTipo)) {
      salidas?.forEach((destinos, salida) =>
        destinos?.forEach((d) => {
          if (nombres.has(de) && nombres.has(d.node)) conexiones.push({ de, a: d.node, salida, tipo });
        }),
      );
    }
  }
  return { nodos, conexiones };
}

/* ------------------------------- Auditoría ------------------------------- */

const SECRETOS: [RegExp, string][] = [
  [/\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}/, "una API key de IA"],
  [/\bAKIA[0-9A-Z]{16}\b/, "una llave de AWS"],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}/, "un token de GitHub"],
  [/\bxox[abposr]-[A-Za-z0-9-]{10,}/, "un token de Slack"],
  [/\bEAA[A-Za-z0-9]{40,}/, "un token de Meta / WhatsApp"],
  [/Bearer\s+[A-Za-z0-9._-]{20,}/, "un token Bearer"],
];

function recorrer(valor: unknown, ruta: string, visita: (texto: string, ruta: string) => void) {
  if (typeof valor === "string") visita(valor, ruta);
  else if (Array.isArray(valor)) valor.forEach((v, i) => recorrer(v, `${ruta}[${i}]`, visita));
  else if (valor && typeof valor === "object")
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) recorrer(v, ruta ? `${ruta}.${k}` : k, visita);
}

export function auditar(wf: Workflow): Hallazgo[] {
  const h: Hallazgo[] = [];
  const { nodos, conexiones } = diagrama(wf);
  const conEntrada = new Set(conexiones.map((c) => c.a));
  const conSalida = new Set(conexiones.map((c) => c.de));

  for (const n of wf.nodes) {
    if (n.type.endsWith("stickyNote")) continue;
    const p = n.parameters ?? {};
    const corto = n.type.split(".").pop();

    recorrer(p, "", (texto, ruta) => {
      if (texto.trim().startsWith("=")) return; // expresión de n8n, no un valor fijo
      for (const [re, que] of SECRETOS) {
        if (re.test(texto)) {
          h.push({ nivel: "error", titulo: `Se encontró ${que} directamente en el nodo (${ruta}). Ese valor debe ir en Credenciales de n8n.`, nodo: n.name });
          return;
        }
      }
      if (/(password|contrase|secret|api_?key|token)$/i.test(ruta) && texto.length >= 6) {
        h.push({ nivel: "error", titulo: `El campo "${ruta}" tiene un valor fijo que parece secreto. Usa Credenciales.`, nodo: n.name });
      }
    });

    if (corto === "webhook" && (!p.authentication || p.authentication === "none")) {
      h.push({ nivel: "aviso", titulo: "Webhook sin autenticación: cualquiera que conozca la URL puede ejecutarlo.", nodo: n.name });
    }
    if (corto === "httpRequest" && typeof p.url === "string" && p.url.startsWith("http://")) {
      h.push({ nivel: "aviso", titulo: "Petición HTTP sin cifrar (http://). Usa https://.", nodo: n.name });
    }
    if (corto === "executeCommand") {
      h.push({ nivel: "aviso", titulo: "Ejecuta comandos en el servidor. Revisa que no reciba datos externos sin validar.", nodo: n.name });
    }
    if (n.disabled) h.push({ nivel: "info", titulo: "Nodo deshabilitado.", nodo: n.name });
  }

  for (const n of nodos) {
    if (n.categoria !== "Disparador" && !conEntrada.has(n.nombre) && !conSalida.has(n.nombre)) {
      h.push({ nivel: "aviso", titulo: "Nodo suelto: no está conectado a nada.", nodo: n.nombre });
    }
  }
  if (!nodos.some((n) => n.categoria === "Disparador")) {
    h.push({ nivel: "aviso", titulo: "No tiene disparador: solo se ejecutará manualmente o desde otro workflow." });
  }
  if (!wf.settings?.errorWorkflow) {
    h.push({ nivel: "info", titulo: "Sin workflow de errores: si falla, nadie se entera. Configúralo en Settings → Error Workflow." });
  }
  const orden = { error: 0, aviso: 1, info: 2 };
  return h.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
}

export function resumen(wf: Workflow) {
  const { nodos, conexiones } = diagrama(wf);
  const porCategoria = nodos.reduce<Record<string, number>>((acc, n) => ((acc[n.categoria] = (acc[n.categoria] ?? 0) + 1), acc), {});
  const servicios = [...new Set(nodos.filter((n) => n.categoria === "Integración" || n.categoria === "IA").map((n) => n.servicio))];
  const disparadores = nodos.filter((n) => n.categoria === "Disparador").map((n) => n.servicio);
  return { total: nodos.length, conexiones: conexiones.length, porCategoria, servicios, disparadores };
}
