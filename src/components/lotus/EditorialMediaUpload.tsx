import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Upload, Trash2, Loader2 } from "lucide-react";
import { deletePostMedia, listPostMedia, uploadPostMedia } from "@/lib/editorial.functions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MediaAsset } from "@/lib/media-preview";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function EditorialMediaUpload({
  postId,
  onUploaded,
}: {
  postId: string;
  onUploaded?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const uploadFn = useServerFn(uploadPostMedia);
  const deleteFn = useServerFn(deletePostMedia);
  const listFn = useServerFn(listPostMedia);
  const [uploading, setUploading] = useState(false);

  const mediaQ = useQuery({
    queryKey: ["post-media", postId],
    queryFn: () => listFn({ data: { postId } }),
    enabled: !!postId,
  });

  const media = (mediaQ.data?.media ?? []) as MediaAsset[];

  const deleteMut = useMutation({
    mutationFn: (mediaId: string) => deleteFn({ data: { mediaId, postId } }),
    onSuccess: () => {
      toast.success("Arquivo removido.");
      qc.invalidateQueries({ queryKey: ["post-media", postId] });
      qc.invalidateQueries({ queryKey: ["approval-post", postId] });
      qc.invalidateQueries({ queryKey: ["editorial", "post", postId] });
      onUploaded?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const base64 = await fileToBase64(file);
        await uploadFn({
          data: {
            postId,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            base64,
          },
        });
      }
      toast.success(files.length > 1 ? `${files.length} arquivos enviados.` : "Arquivo enviado.");
      qc.invalidateQueries({ queryKey: ["post-media", postId] });
      qc.invalidateQueries({ queryKey: ["approval-post", postId] });
      qc.invalidateQueries({ queryKey: ["editorial", "post", postId] });
      onUploaded?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="grid gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Enviar mídia (imagem ou vídeo)
      </Button>
      <p className="text-[10.5px] text-muted-foreground">
        Vários arquivos viram carrossel automaticamente. A mídia enviada é a fonte oficial do
        preview — não use URL de capa.
      </p>

      {media.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {media.map((m, i) => (
            <li
              key={m.id}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 p-2"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                {m.kind === "video" ? (
                  m.posterUrl ? (
                    <img src={m.posterUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px]">▶</div>
                  )
                ) : (
                  <img src={m.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium">
                  {m.kind === "video" ? "Vídeo" : "Imagem"} #{i + 1}
                </p>
                <p className="text-[10px] text-muted-foreground capitalize">{m.kind}</p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn("h-8 w-8 shrink-0 text-destructive")}
                disabled={deleteMut.isPending}
                onClick={() => deleteMut.mutate(m.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
