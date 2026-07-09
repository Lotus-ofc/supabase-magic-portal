import type { MetricWriterPort } from "../../ports/metric-writer.port";
import { InMemoryBaseMetricasWriter } from "./in-memory-base-metricas.writer";
import { resolveWriterMode, type WriterMode } from "./writer-config";

export interface CreateMetricWriterRegistryOptions {
  mode?: WriterMode;
  writers?: readonly MetricWriterPort[];
  supabaseWriter?: MetricWriterPort;
  memoryWriter?: InMemoryBaseMetricasWriter;
}

export interface MetricWriterRegistry {
  writers: readonly MetricWriterPort[];
  memoryWriter: InMemoryBaseMetricasWriter;
}

/** Writer registry — memory, supabase ou dual-run. */
export function createMetricWriterRegistry(
  options: CreateMetricWriterRegistryOptions = {},
): MetricWriterRegistry {
  const memoryWriter = options.memoryWriter ?? new InMemoryBaseMetricasWriter();

  if (options.writers && options.writers.length > 0) {
    return { writers: [...options.writers], memoryWriter };
  }

  const mode = resolveWriterMode(options.mode);
  const writers: MetricWriterPort[] = [];

  if (mode === "memory" || mode === "both") {
    writers.push(memoryWriter);
  }

  if ((mode === "supabase" || mode === "both") && options.supabaseWriter) {
    writers.push(options.supabaseWriter);
  }

  return { writers, memoryWriter };
}
