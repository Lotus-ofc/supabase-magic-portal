export interface Ga4ReportRowV1 {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
}

export interface Ga4RunReportResponseV1 {
  rows?: Ga4ReportRowV1[];
  nextPageToken?: string;
}
