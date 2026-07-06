import { useState } from "react";
import { Copy, Download, FileJson, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { AiWorkspaceSnapshot } from "@/lib/ai-workspace/types";
import {
  copyToClipboard,
  downloadFile,
  exportFilename,
  exportMimeType,
  exportSnapshot,
} from "@/lib/ai-workspace/export";
import { generateContextPrompt, markdownToPlainText } from "@/lib/ai-workspace/prompt-generator";

interface PromptGeneratorPanelProps {
  snapshot: AiWorkspaceSnapshot;
  prompt: string;
  onRegenerate: () => void;
  isRegenerating?: boolean;
}

export function PromptGeneratorPanel({
  snapshot,
  prompt,
  onRegenerate,
  isRegenerating,
}: PromptGeneratorPanelProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopyMarkdown() {
    await copyToClipboard(prompt);
    setCopied(true);
    toast.success("Context Pack copiado (Markdown)");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCopyText() {
    await copyToClipboard(markdownToPlainText(prompt));
    toast.success("Context Pack copiado (texto)");
  }

  function handleExport(format: "markdown" | "json" | "txt") {
    const content = exportSnapshot(snapshot, format);
    downloadFile(content, exportFilename(format), exportMimeType(format));
    toast.success(`Exportado como ${format.toUpperCase()}`);
  }

  return (
    <div className="lotus-surface overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-5 py-4">
        <Button onClick={onRegenerate} disabled={isRegenerating} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Gerar Contexto para IA
        </Button>

        <Button variant="outline" size="sm" onClick={handleCopyMarkdown} className="gap-1.5">
          <Copy className="h-3.5 w-3.5" />
          {copied ? "Copiado!" : "Copiar Markdown"}
        </Button>

        <Button variant="outline" size="sm" onClick={handleCopyText} className="gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          Copiar Texto
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => handleExport("markdown")}>
              Exportar Markdown (.md)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("json")}>
              <FileJson className="mr-2 h-4 w-4" />
              Exportar JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("txt")}>Exportar TXT</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="max-h-[420px] overflow-auto bg-muted/20 p-5">
        <pre className="whitespace-pre-wrap font-mono text-[11.5px] leading-relaxed text-foreground/90">
          {prompt || generateContextPrompt(snapshot)}
        </pre>
      </div>
    </div>
  );
}
