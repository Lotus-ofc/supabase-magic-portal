export interface TikTokReportRowV1 {
  dimensions?: { campaign_name?: string; stat_time_day?: string };
  metrics?: { impressions?: string; spend?: string };
}

export interface TikTokReportResponseV1 {
  data?: {
    list?: TikTokReportRowV1[];
    page_info?: { page?: number; total_page?: number };
  };
  code?: number;
  message?: string;
}

export interface TikTokOAuthTokenResponseV1 {
  data?: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
}
