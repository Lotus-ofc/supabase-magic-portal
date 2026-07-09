export interface YouTubeAnalyticsRowV1 {
  dimensions?: string[];
  metrics?: number[];
}

export interface YouTubeAnalyticsResponseV1 {
  rows?: YouTubeAnalyticsRowV1[];
  nextPageToken?: string;
}
