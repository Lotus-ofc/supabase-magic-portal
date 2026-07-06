import type {
  NotificationChannel,
  NotificationChannelHandler,
  NotificationMessage,
  NotificationPayload,
} from "../types/notifications";
import { NOTIFICATION_CHANNELS } from "../types/notifications";

let idCounter = 0;

function nextId() {
  idCounter += 1;
  return `notif-${Date.now()}-${idCounter}`;
}

/** Dispatcher multi-canal — apenas in_app ativo; demais preparados. */
export class NotificationDispatcher {
  private channels = new Map<NotificationChannel, NotificationChannelHandler>();
  private inAppStore: NotificationMessage[] = [];

  constructor() {
    this.registerChannel(NOTIFICATION_CHANNELS.in_app, (msg) => {
      this.inAppStore.unshift(msg);
      if (this.inAppStore.length > 100) this.inAppStore.pop();
    });
  }

  registerChannel(channel: NotificationChannel, handler: NotificationChannelHandler): void {
    this.channels.set(channel, handler);
  }

  async dispatch(
    channel: NotificationChannel,
    payload: NotificationPayload,
    opts?: { userId?: string | null },
  ): Promise<NotificationMessage | null> {
    const handler = this.channels.get(channel);
    if (!handler) {
      if (import.meta.env.DEV) {
        console.info(`[NotificationDispatcher] channel not wired: ${channel}`, payload);
      }
      return null;
    }

    const message: NotificationMessage = {
      ...payload,
      id: nextId(),
      channel,
      userId: opts?.userId ?? null,
      createdAt: new Date().toISOString(),
      read: false,
    };

    await handler(message);
    return message;
  }

  async dispatchMany(
    channels: NotificationChannel[],
    payload: NotificationPayload,
    opts?: { userId?: string | null },
  ): Promise<void> {
    await Promise.all(channels.map((ch) => this.dispatch(ch, payload, opts)));
  }

  getInAppNotifications(userId?: string | null, limit = 20): NotificationMessage[] {
    return this.inAppStore
      .filter((n) => !userId || n.userId === userId || n.userId == null)
      .slice(0, limit);
  }
}

export const notificationDispatcher = new NotificationDispatcher();
