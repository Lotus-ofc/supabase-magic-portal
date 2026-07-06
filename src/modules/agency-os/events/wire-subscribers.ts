import { cacheManager } from "@/modules/core/cache/cache-manager";
import { eventBus } from "@/modules/core/event-bus/event-bus";
import { notificationDispatcher } from "@/modules/core/notifications/notification-dispatcher";
import { NOTIFICATION_CHANNELS } from "@/modules/core/types/notifications";
import { DOMAIN_EVENTS } from "@/modules/core/types/domain-events";

/** Reações cross-cutting ao Agency OS — sem acoplamento entre módulos. */
export function wireAgencyOsEventSubscribers(): void {
  eventBus.on(DOMAIN_EVENTS.LEAD_CONVERTED, async (event) => {
    cacheManager.invalidatePrefix("agency-os");
    await notificationDispatcher.dispatch(NOTIFICATION_CHANNELS.in_app, {
      title: "Lead convertido em cliente",
      body: `Cliente #${event.payload.cadastroClienteId ?? ""}`,
      href: event.payload.cadastroClienteId
        ? `/admin/central/clientes/${event.payload.cadastroClienteId}`
        : "/admin/central?section=pipeline",
      severity: "success",
    });
  });

  eventBus.on(DOMAIN_EVENTS.TASK_COMPLETED, async () => {
    cacheManager.invalidatePrefix("agency-os");
  });

  eventBus.on(DOMAIN_EVENTS.PROJECT_COMPLETED, async (event) => {
    cacheManager.invalidatePrefix("agency-os");
    await notificationDispatcher.dispatch(NOTIFICATION_CHANNELS.in_app, {
      title: "Projeto finalizado",
      body: String(event.payload.projectId ?? ""),
      severity: "success",
    });
  });

  eventBus.on(DOMAIN_EVENTS.NOTE_CREATED, async () => {
    cacheManager.invalidatePrefix("agency-os");
  });
}
