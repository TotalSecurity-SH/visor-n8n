"use client";

import { useMemo, useState } from "react";
import { auditar, diagrama, leerWorkflow, resumen, WorkflowInvalido, type Categoria } from "@/lib/workflow";
import { EJEMPLO } from "@/lib/ejemplo";
import { COLOR, Diagrama } from "./Diagrama";

const ESTILO = { error: "text-bad", aviso: "text-warn", info: "text-steel" } as const;
const ICONO = { error: "✕", aviso: "▲", info: "i" } as const;

export default function Visor() {
  const [texto, setTexto] = useState(() => JSON.stringify(EJEMPLO, null, 2));
  const [zoom, setZoom] = useState<number | "ajustar">("ajustar");
  const nivel = zoom === "ajustar" ? 1 : zoom;
  const [resaltado, setResaltado] = useState<string>();

  const analisis = useMemo(() => {
    try {
      const wf = leerWorkflow(texto);
      return { ok: true as const, wf, ...diagrama(wf), resumen: resumen(wf), hallazgos: auditar(wf) };
    } catch (e) {
      return { ok: false as const, mensaje: e instanceof WorkflowInvalido ? e.message : "No pudimos leer el workflow." };
    }
  }, [texto]);

  const cargarArchivo = async (archivo?: File) => {
    if (archivo) setTexto(await archivo.text());
  };

  return (
    <main className="mx-auto -mt-16 w-full max-w-6xl flex-1 space-y-4 px-4 pb-16 sm:px-6">
      <section className="card fade-up p-4 shadow-xl shadow-black/5" style={{ animationDelay: ".25s" }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="json" className="text-sm font-semibold">
            JSON del workflow
          </label>
          <div className="flex gap-2 text-xs">
            <label className="cursor-pointer rounded-lg border border-[var(--line)] px-3 py-1.5 font-medium hover:border-teal">
              Subir archivo .json
              <input id="archivo" type="file" accept=".json,application/json" className="sr-only" onChange={(e) => cargarArchivo(e.target.files?.[0])} />
            </label>
            <button onClick={() => setTexto(JSON.stringify(EJEMPLO, null, 2))} className="rounded-lg border border-[var(--line)] px-3 py-1.5 font-medium hover:border-teal">
              Ver ejemplo
            </button>
            <button onClick={() => setTexto("")} className="muted rounded-lg px-2 py-1.5 hover:text-bad">
              Limpiar
            </button>
          </div>
        </div>
        <textarea
          id="json"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          spellCheck={false}
          rows={5}
          placeholder="En n8n: abre el workflow, Ctrl+A, Ctrl+C y pégalo aquí."
          className="mt-3 w-full resize-y rounded-lg border border-[var(--line)] bg-transparent px-3 py-2.5 font-mono text-xs outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/25"
        />
        <p className="muted mt-2 text-xs">🔒 Se analiza en tu navegador. Tu workflow y tus credenciales no se envían a ningún servidor.</p>
      </section>

      {!analisis.ok ? (
        texto.trim() && <p className="card p-5 text-sm text-bad">{analisis.mensaje}</p>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Nodos", analisis.resumen.total],
              ["Conexiones", analisis.resumen.conexiones],
              ["Servicios", analisis.resumen.servicios.length],
              ["Hallazgos", analisis.hallazgos.filter((h) => h.nivel !== "info").length],
            ].map(([l, v]) => (
              <div key={l} className="card px-4 py-3">
                <div className="text-2xl font-bold tabular-nums">{v}</div>
                <div className="muted text-xs">{l}</div>
              </div>
            ))}
          </section>

          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3">
              <h2 className="min-w-0 truncate font-semibold">{analisis.wf.name || "Workflow sin nombre"}</h2>
              <div className="flex items-center gap-1 text-sm">
                <button onClick={() => setZoom(Math.max(0.4, nivel - 0.2))} className="h-8 w-8 rounded-md border border-[var(--line)] hover:border-teal" aria-label="Alejar">
                  −
                </button>
                <button onClick={() => setZoom("ajustar")} className="muted w-16 text-center font-mono text-xs hover:text-teal" title="Ajustar a la pantalla">
                  {zoom === "ajustar" ? "ajustar" : `${Math.round(zoom * 100)}%`}
                </button>
                <button onClick={() => setZoom(Math.min(2, nivel + 0.2))} className="h-8 w-8 rounded-md border border-[var(--line)] hover:border-teal" aria-label="Acercar">
                  +
                </button>
              </div>
            </div>
            <div className="overflow-auto bg-[radial-gradient(var(--line)_1px,transparent_1px)] [background-size:18px_18px] p-4" style={{ maxHeight: 520 }}>
              <Diagrama nodos={analisis.nodos} conexiones={analisis.conexiones} escala={zoom} resaltado={resaltado} onSeleccion={setResaltado} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--line)] px-4 py-2.5 text-xs">
              {(Object.keys(COLOR) as Categoria[])
                .filter((c) => analisis.resumen.porCategoria[c])
                .map((c) => (
                  <span key={c} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR[c] }} />
                    {c} · {analisis.resumen.porCategoria[c]}
                  </span>
                ))}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <section className="card min-w-0 p-5">
              <h2 className="font-semibold">Auditoría</h2>
              {analisis.hallazgos.length === 0 ? (
                <p className="mt-2 text-sm text-ok">✓ No encontramos problemas.</p>
              ) : (
                <ul className="mt-3 space-y-2.5 text-sm">
                  {analisis.hallazgos.map((h, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className={`${ESTILO[h.nivel]} w-4 shrink-0 text-center font-bold`} aria-hidden>
                        {ICONO[h.nivel]}
                      </span>
                      <span>
                        {h.nodo && (
                          <button onClick={() => setResaltado(h.nodo)} className="mr-1 font-semibold underline decoration-dotted underline-offset-2 hover:text-teal-dark dark:hover:text-teal">
                            {h.nodo}:
                          </button>
                        )}
                        {h.titulo}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="card min-w-0 p-5">
              <h2 className="font-semibold">Inventario</h2>
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="muted text-xs uppercase tracking-wider">Se activa con</dt>
                  <dd>{analisis.resumen.disparadores.join(", ") || "Manual / otro workflow"}</dd>
                </div>
                <div>
                  <dt className="muted text-xs uppercase tracking-wider">Servicios conectados</dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {analisis.resumen.servicios.map((s) => (
                      <span key={s} className="rounded-full border border-[var(--line)] px-2.5 py-0.5 text-xs">
                        {s}
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </>
      )}
    </main>
  );
}
