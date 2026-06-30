import { useEffect, useId, useRef, useState } from "react";

let mermaidInitialized = false;

function getMermaidTheme(): "default" | "dark" {
  if (typeof document === "undefined") return "default";
  return document.documentElement.classList.contains("dark") ? "dark" : "default";
}

async function ensureMermaidInit() {
  const { default: mermaid } = await import("mermaid");
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: getMermaidTheme(),
      securityLevel: "strict",
      fontFamily: "inherit",
    });
    mermaidInitialized = true;
  }
  return mermaid;
}

export function MermaidDiagram({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderId = useId().replace(/:/g, "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const code = chart.trim();

    async function render() {
      if (!containerRef.current || !code) return;
      const mermaid = await ensureMermaidInit();
      mermaid.initialize({ theme: getMermaidTheme() });

      try {
        const { svg } = await mermaid.render(`mermaid-${renderId}`, code);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Falha ao renderizar diagrama");
        }
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [chart, renderId]);

  if (error) {
    return (
      <div className="mermaid-block">
        <p className="mb-2 text-xs font-medium text-destructive">Erro no diagrama Mermaid</p>
        <pre className="text-xs text-muted-foreground">{error}</pre>
        <pre className="mt-2 text-xs">{chart}</pre>
      </div>
    );
  }

  return <div ref={containerRef} className="mermaid-block flex justify-center" />;
}
