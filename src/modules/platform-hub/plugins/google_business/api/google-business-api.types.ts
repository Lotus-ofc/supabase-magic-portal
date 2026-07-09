export interface GoogleBusinessDailyMetricV1 {
  date?: { year?: number; month?: number; day?: number };
  value?: string;
}

export interface GoogleBusinessMetricSeriesV1 {
  dailyMetric?: string;
  dailyValues?: GoogleBusinessDailyMetricV1[];
}

export interface GoogleBusinessMetricsResponseV1 {
  multiDailyMetricTimeSeries?: Array<{
    dailyMetricTimeSeries?: GoogleBusinessMetricSeriesV1[];
  }>;
}
