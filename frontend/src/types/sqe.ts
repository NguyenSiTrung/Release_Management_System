export interface SQEResult {
  sqe_result_id: number;
  version_id: number;
  average_score: number;
  total_test_cases: number;
  test_cases_changed: boolean;
  change_percentage: number;
  has_one_point_case: boolean;
  tested_by_user_id?: number;
  tested_by_username?: string;
  model_version_name?: string;
  language_pair_name?: string;
  test_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SQEResultSummary {
  sqe_result_id: number;
  version_id: number;
  model_version_name: string;
  language_pair_name: string;
  average_score: number;
  total_test_cases: number;
  test_cases_changed: boolean;
  change_percentage: number;
  has_one_point_case: boolean;
  test_date?: string;
  created_at: string;
}

export interface SQEResultCreate {
  version_id: number;
  average_score: number;
  total_test_cases: number;
  test_cases_changed?: boolean;
  change_percentage?: number;
  has_one_point_case?: boolean;
  test_date?: string;
  notes?: string;
}

export interface SQEResultUpdate {
  average_score?: number;
  total_test_cases?: number;
  test_cases_changed?: boolean;
  change_percentage?: number;
  has_one_point_case?: boolean;
  test_date?: string;
  notes?: string;
}

export interface PaginatedSQEResults {
  items: SQEResultSummary[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface SQELanguagePairTrend {
  version_name: string;
  release_date?: string;
  average_score: number;
  total_test_cases: number;
  test_cases_changed: boolean;
  change_percentage: number;
}

export interface SQECrossComparison {
  language_pair_id: number;
  language_pair_name: string;
  latest_score?: number;
  latest_test_cases?: number;
  score_trend?: string;
  has_critical_issues: boolean;
}

export interface SQEOverallStats {
  average_score: number;
  total_results: number;
  critical_cases: number;
  average_test_cases: number;
}

export interface SQEScoreDistribution {
  ranges: Array<{
    range: string;
    count: number;
  }>;
  total: number;
}

export interface SQEAnalytics {
  overall_stats: SQEOverallStats;
  score_distribution: SQEScoreDistribution;
  cross_comparison: SQECrossComparison[];
} 