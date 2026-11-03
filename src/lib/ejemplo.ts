// Workflow de ejemplo: lead de WhatsApp calificado por un agente de IA y enviado al CRM.
// Incluye a propósito dos malas prácticas para mostrar la auditoría.
export const EJEMPLO = {
  name: "Leads de WhatsApp con agente de IA",
  nodes: [
    { name: "WhatsApp entrante", type: "n8n-nodes-base.webhook", typeVersion: 2, position: [0, 200], parameters: { httpMethod: "POST", path: "whatsapp-lead" } },
    { name: "Normalizar datos", type: "n8n-nodes-base.set", typeVersion: 3, position: [240, 200], parameters: { mode: "manual" } },
    { name: "Agente de ventas", type: "@n8n/n8n-nodes-langchain.agent", typeVersion: 1, position: [480, 200], parameters: { text: "={{ $json.mensaje }}" } },
    { name: "Modelo de lenguaje", type: "@n8n/n8n-nodes-langchain.lmChatOpenAi", typeVersion: 1, position: [340, 420], parameters: { model: "gpt-4o-mini" } },
    { name: "Memoria de conversación", type: "@n8n/n8n-nodes-langchain.memoryBufferWindow", typeVersion: 1, position: [620, 420], parameters: {} },
    { name: "¿Lead calificado?", type: "n8n-nodes-base.if", typeVersion: 2, position: [760, 200], parameters: {} },
    { name: "Crear contacto en HubSpot", type: "n8n-nodes-base.hubspot", typeVersion: 2, position: [1000, 80], parameters: { resource: "contact" } },
    { name: "Avisar al equipo", type: "n8n-nodes-base.slack", typeVersion: 2, position: [1240, 80], parameters: { channel: "#ventas" } },
    { name: "Respuesta automática", type: "n8n-nodes-base.whatsApp", typeVersion: 1, position: [1000, 320], parameters: { operation: "send" } },
    {
      name: "CRM antiguo",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4,
      position: [1240, 320],
      parameters: { url: "http://crm-interno.ejemplo.mx/api/leads", headerParameters: { Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.ejemplo-falso-0123456789" } },
    },
  ],
  connections: {
    "WhatsApp entrante": { main: [[{ node: "Normalizar datos", type: "main", index: 0 }]] },
    "Normalizar datos": { main: [[{ node: "Agente de ventas", type: "main", index: 0 }]] },
    "Modelo de lenguaje": { ai_languageModel: [[{ node: "Agente de ventas", type: "ai_languageModel", index: 0 }]] },
    "Memoria de conversación": { ai_memory: [[{ node: "Agente de ventas", type: "ai_memory", index: 0 }]] },
    "Agente de ventas": { main: [[{ node: "¿Lead calificado?", type: "main", index: 0 }]] },
    "¿Lead calificado?": {
      main: [[{ node: "Crear contacto en HubSpot", type: "main", index: 0 }], [{ node: "Respuesta automática", type: "main", index: 0 }]],
    },
    "Crear contacto en HubSpot": { main: [[{ node: "Avisar al equipo", type: "main", index: 0 }]] },
    "Respuesta automática": { main: [[{ node: "CRM antiguo", type: "main", index: 0 }]] },
  },
  settings: { executionOrder: "v1" },
};
