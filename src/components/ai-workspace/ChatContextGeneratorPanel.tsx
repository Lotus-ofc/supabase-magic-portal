import { Copy, Download, FileJson, FileText, MessageSquare } from "lucide-react";
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
  exportChatContext,
  exportChatContextFilename,
  exportChatContextMimeType,
} from "@/lib/ai-workspace/export";

interface ChatContextGeneratorPanelProps {
  snapshot: AiWorkspaceSnapshot;
  onRegenerate: () => void;
  isRegenerating?: boolean;
}

export function ChatContextGeneratorPanel({
  snapshot,
  onRegenerate,
  isRegenerating,
}: ChatContextGeneratorPanelProps) {
  const chatContext = snapshot.chatContextMarkdown;

  async function handleCopyMarkdown() {
    await copyToClipboard(chatContext);
    toast.success("AI Chat Context copiado (Markdown)");
  }

  async function handleCopyText() {
    await copyToClipboard(exportChatContext(snapshot, "txt"));
    toast.success("AI Chat Context copiado (texto)");
  }

  function handleExport(format: "markdown" | "json" | "txt") {
    const content = exportChatContext(snapshot, format);
    downloadFile(content, exportChatContextFilename(format), exportChatContextMimeType(format));
    toast.success(`AI Chat Context exportado como ${format.toUpperCase()}`);
  }

  return (
    <div className="lotus-surface overflow-hidden">
      <div className="mb-0 border-b border-border/70 px-5 py-3">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Modelos conversacionais
        </p>
        <p className="text-sm text-muted-foreground">
          ChatGPT, Claude, Gemini, Perplexity — contexto em linguagem natural, não técnico.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-5 py-4">
        <Button
          onClick={onRegenerate}
          disabled={isRegenerating}
          variant="secondary"
          className="gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          Gerar AI Chat Context
        </Button>

        <Button variant="outline" size="sm" onClick={handleCopyMarkdown} className="gap-1.5">
          <Copy className="h-3.5 w-3.5" />
          Copiar Markdown
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

      <div className="max-h-[420px] overflow-auto bg-muted/10 p-5">
        <pre className="whitespace-pre-wrap font-mono text-[11.5px] leading-relaxed text-foreground/90">
          {chatContext}
        </pre>
      </div>
    </div>
  );
}
