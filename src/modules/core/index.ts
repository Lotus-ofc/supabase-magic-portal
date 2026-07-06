// Client-safe exports
export * from "./types";
export { eventBus, EventBus } from "./event-bus/event-bus";
export { commandBus, CommandBus } from "./commands/command-bus";
export { cacheManager, CacheManager } from "./cache/cache-manager";
export { realtimeManager, RealtimeManager } from "./realtime/realtime-manager";
export {
  notificationDispatcher,
  NotificationDispatcher,
} from "./notifications/notification-dispatcher";
export {
  permissionEngine,
  permissionContextFromAdmin,
  PermissionEngine,
} from "./permissions/permission-engine";
export { featureFlagService, FeatureFlagService } from "./feature-flags/feature-flag-service";
export { auditLogger, AuditLogger } from "./audit/audit-logger";
export { backgroundJobRunner, BackgroundJobRunner } from "./jobs/background-job-runner";
export { createSnapshotBuilder, SnapshotBuilder } from "./snapshot/snapshot-builder";
export { configRegistry } from "./registry/config-registry";
export { widgetRegistry } from "./registry/widget-registry";
export { searchEngine } from "./search/search-engine";
export { mergeSearchResults } from "./search/merge-results";
export {
  DashboardGrid,
  resolveDashboard,
  resolveDashboardWidgets,
} from "./dashboard/dashboard-engine";
export { osKeys } from "./query-keys";
