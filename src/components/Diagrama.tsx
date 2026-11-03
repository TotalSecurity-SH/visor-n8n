import type { Categoria, Conexion, NodoVisual } from "@/lib/workflow";

const ANCHO = 200;
const ALTO = 60;
const MARGEN = 60;

export const COLOR: Record<Categoria, string> = {
  Disparador: "#c48e6b",
  IA: "#9a8cc4",
  Lógica: "#c4a86b",
  Datos: "#6fb5ad",
  Código: "#b58aa3",
  HTTP: "#7c93c9",
  Integración: "#5fb3c4",
};

const SIGLA: Record<Categoria, string> = {
  Disparador: "▶",
  IA: "IA",
  Lógica: "⇄",
  Datos: "{}",
  Código: "</>",
  HTTP: "↗",
  Integración: "◆",
};

type Props = { nodos: NodoVisual[]; conexiones: Conexion[]; escala: number | "ajustar"; resaltado?: string; onSeleccion?: (nombre: string) => void };

const recortar = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export function Diagrama({ nodos, conexiones, escala, resaltado, onSeleccion }: Props) {
  if (!nodos.length) return null;
  const minX = Math.min(...nodos.map((n) => n.x)) - MARGEN;
  const minY = Math.min(...nodos.map((n) => n.y)) - MARGEN;
  const maxX = Math.max(...nodos.map((n) => n.x)) + ANCHO + MARGEN;
  const maxY = Math.max(...nodos.map((n) => n.y)) + ALTO + MARGEN;
  const pos = new Map(nodos.map((n) => [n.nombre, n]));
  const salidasPorNodo = new Map<string, number>();
  for (const c of conexiones) if (c.tipo === "main") salidasPorNodo.set(c.de, Math.max(salidasPorNodo.get(c.de) ?? 0, c.salida + 1));

  return (
    <svg
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      width={escala === "ajustar" ? "100%" : (maxX - minX) * escala}
      height={escala === "ajustar" ? undefined : (maxY - minY) * escala}
      className="block max-w-none"
      role="img"
      aria-label="Diagrama del workflow"
    >
      <defs>
        <marker id="flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 10 5 0 10z" fill="var(--muted)" />
        </marker>
      </defs>

      {conexiones.map((c, i) => {
        const de = pos.get(c.de)!;
        const a = pos.get(c.a)!;
        if (c.tipo !== "main") {
          // Subnodos de IA (modelo, memoria, herramientas): línea punteada hacia el agente.
          const x1 = de.x + ANCHO / 2, y1 = de.y, x2 = a.x + ANCHO / 2, y2 = a.y + ALTO;
          return <path key={i} d={`M${x1} ${y1} C${x1} ${y1 - 50} ${x2} ${y2 + 50} ${x2} ${y2}`} fill="none" stroke={COLOR.IA} strokeWidth={2} strokeDasharray="5 5" />;
        }
        const total = salidasPorNodo.get(c.de) ?? 1;
        const y1 = de.y + (ALTO * (c.salida + 1)) / (total + 1);
        const x1 = de.x + ANCHO, x2 = a.x - 4, y2 = a.y + ALTO / 2;
        const dx = Math.max(40, (x2 - x1) / 2);
        const etiqueta = total === 2 && de.tipo.endsWith(".if") ? (c.salida === 0 ? "sí" : "no") : null;
        return (
          <g key={i}>
            <path d={`M${x1} ${y1} C${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`} fill="none" stroke="var(--muted)" strokeOpacity={0.7} strokeWidth={2} markerEnd="url(#flecha)" />
            {etiqueta && (
              <text x={x1 + 12} y={c.salida === 0 ? y1 - 8 : y1 + 18} fontSize={12} fontWeight={600} fill="var(--muted)">
                {etiqueta}
              </text>
            )}
          </g>
        );
      })}

      {nodos.map((n) => {
        const color = COLOR[n.categoria];
        const activo = resaltado === n.nombre;
        return (
          <g
            key={n.nombre}
            transform={`translate(${n.x} ${n.y})`}
            opacity={n.deshabilitado ? 0.45 : 1}
            onClick={() => onSeleccion?.(n.nombre)}
            className={onSeleccion ? "cursor-pointer" : undefined}
          >
            <title>{`${n.nombre} · ${n.servicio}`}</title>
            <rect width={ANCHO} height={ALTO} rx={12} fill="var(--card)" stroke={activo ? "#c0504d" : color} strokeWidth={activo ? 3 : 1.5} />
            <rect width={6} height={ALTO} rx={3} fill={color} />
            <rect x={16} y={14} width={32} height={32} rx={8} fill={color} fillOpacity={0.18} />
            <text x={32} y={35} textAnchor="middle" fontSize={13} fontWeight={700} fill={color}>
              {SIGLA[n.categoria]}
            </text>
            <text x={58} y={27} fontSize={13} fontWeight={600} fill="var(--text)">
              {recortar(n.nombre, 18)}
            </text>
            <text x={58} y={45} fontSize={11} fill="var(--muted)">
              {recortar(n.servicio, 22)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
