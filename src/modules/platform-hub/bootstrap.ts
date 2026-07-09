import { createMetricPipelineStack } from "@/modules/platform-hub/metric-pipeline/create-metric-pipeline-stack";
import { createRuntimeStack } from "@/modules/platform-hub/runtime/create-runtime-stack";
import { createObservabilityStack } from "@/modules/platform-hub/observability/create-observability-stack";
import type { MetricWriterPort } from "@/modules/platform-hub/metric-pipeline/ports";
import type { WriterMode } from "@/modules/platform-hub/metric-pipeline/writers/writer-config";

export type { CreateObservabilityStackOptions } from "@/modules/platform-hub/observability/create-observability-stack";
export type { WriterMode } from "@/modules/platform-hub/metric-pipeline/writers/writer-config";

export interface CreatePlatformHubStackOptions {
  retryMaxAttempts?: number;
  pipeline?: ReturnType<typeof createMetricPipelineStack>;
  observability?: ReturnType<typeof createObservabilityStack>;
  /** Writers explícitos — dual-run: [memoryWriter, supabaseWriter] */
  writers?: readonly MetricWriterPort[];
  /** memory | supabase | both — default memory */
  writerMode?: WriterMode;
  /** Override da env PLATFORM_HUB_SUPABASE_WRITER */
  supabaseWriterEnabled?: boolean;
}

/**
 * Composition root — Runtime + Pipeline + Health + Observability.
 * Passive Production: writerMode 'both' + PLATFORM_HUB_SUPABASE_WRITER=true em prod.
 */
export function createPlatformHubStack(options: CreatePlatformHubStackOptions = {}) {
  const pipelineStack =
    options.pipeline ??
    createMetricPipelineStack({
      writers: options.writers,
      writerMode: options.writerMode,
      supabaseWriterEnabled: options.supabaseWriterEnabled,
    });

  const observabilityStack = options.observability ?? createObservabilityStack();

  const runtimeStack = createRuntimeStack({
    retryMaxAttempts: options.retryMaxAttempts,
    eventEmitter: observabilityStack.eventBus,
    observability: observabilityStack.observability,
    syncRunRepository: observabilityStack.syncRunRepository,
  });

  return {
    ...runtimeStack,
    ...pipelineStack,
    ...observabilityStack,
  };
}

export { createObservabilityStack } from "@/modules/platform-hub/observability/create-observability-stack";
