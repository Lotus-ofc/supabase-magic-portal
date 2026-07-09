export interface MetaGraphPagingV1 {
  cursors?: { before?: string; after?: string };
  next?: string;
}

export interface MetaInsightRowV1 {
  campaign_name?: string;
  campaign_id?: string;
  date_start: string;
  date_stop: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  spend?: string;
}

export interface MetaInsightsResponseV1 {
  data: MetaInsightRowV1[];
  paging?: MetaGraphPagingV1;
}

export interface MetaOAuthTokenResponseV1 {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

export interface MetaDebugTokenResponseV1 {
  data: {
    is_valid: boolean;
    expires_at?: number;
    scopes?: string[];
    error?: { message: string };
  };
}
