export const NOTIFICATION_CHANNELS = {
  in_app: "in_app",
  toast: "toast",
  email: "email",
  webhook: "webhook",
  push: "push",
  slack: "slack",
  whatsapp: "whatsapp",
} as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[keyof typeof NOTIFICATION_CHANNELS];

export interface NotificationPayload {
  title: string;
  body?: string;
  href?: string;
  severity?: "info" | "success" | "warning" | "error";
  meta?: Record<string, unknown>;
}

export interface NotificationMessage extends NotificationPayload {
  id: string;
  channel: NotificationChannel;
  userId?: string | null;
  createdAt: string;
  read?: boolean;
}

export type NotificationChannelHandler = (
  message: NotificationMessage,
) => void | Promise<void>;
