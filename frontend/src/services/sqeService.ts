import { api } from './api';
import {
  SQEResult,
  SQEResultCreate,
  SQEResultUpdate,
  PaginatedSQEResults,
  SQELanguagePairTrend,
  SQECrossComparison,
  SQEAnalytics
} from '../types/sqe';

// Core CRUD operations
export const getSQEResults = async (
  page: number = 1,
  size: number = 10,
  languagePairId?: number,
  scoreMin?: number,
  scoreMax?: number,
  hasOnePointCase?: boolean
): Promise<PaginatedSQEResults> => {
  const params = new URLSearchParams({
    page: page.toString(),
    size: size.toString(),
  });

  if (languagePairId) params.append('language_pair_id', languagePairId.toString());
  if (scoreMin !== undefined) params.append('score_min', scoreMin.toString());
  if (scoreMax !== undefined) params.append('score_max', scoreMax.toString());
  if (hasOnePointCase !== undefined) params.append('has_one_point_case', hasOnePointCase.toString());

  const response = await api.get(`/sqe-results?${params}`);
  return response.data;
};

export const getSQEResult = async (sqeResultId: number): Promise<SQEResult> => {
  const response = await api.get(`/sqe-results/${sqeResultId}`);
  return response.data;
};

export const getSQEResultByVersion = async (versionId: number): Promise<SQEResult | null> => {
  try {
    const response = await api.get(`/sqe-results/version/${versionId}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

export const createSQEResult = async (data: SQEResultCreate): Promise<SQEResult> => {
  const response = await api.post(`/sqe-results`, data);
  return response.data;
};

export const updateSQEResult = async (
  sqeResultId: number,
  data: SQEResultUpdate
): Promise<SQEResult> => {
  const response = await api.put(`/sqe-results/${sqeResultId}`, data);
  return response.data;
};

export const deleteSQEResult = async (sqeResultId: number): Promise<void> => {
  await api.delete(`/sqe-results/${sqeResultId}`);
};

// Analytics operations
export const getLanguagePairTrends = async (
  languagePairId: number
): Promise<{ trends: SQELanguagePairTrend[] }> => {
  const response = await api.get(
    `/sqe-results/analytics/language-pair/${languagePairId}`
  );
  return response.data;
};

export const getCrossComparison = async (): Promise<{ comparison: SQECrossComparison[] }> => {
  const response = await api.get(`/sqe-results/analytics/comparison`);
  return response.data;
};

export const getOverallAnalytics = async (languagePairId?: number): Promise<SQEAnalytics> => {
  const params = languagePairId ? `?language_pair_id=${languagePairId}` : '';
  const response = await api.get(`/sqe-results/analytics/overall${params}`);
  return response.data;
};

// New function for filtered score distribution
export const getScoreDistribution = async (languagePairId?: number): Promise<{ ranges: Array<{ range: string; count: number; }>; total: number; }> => {
  const params = languagePairId ? `?language_pair_id=${languagePairId}` : '';
  const response = await api.get(`/sqe-results/analytics/distribution${params}`);
  return response.data;
};

// Helper functions
export const getScoreTrendIcon = (trend?: string): string => {
  switch (trend) {
    case 'up': return '📈';
    case 'down': return '📉';
    default: return '➡️';
  }
};

export const getScoreColor = (score: number): string => {
  if (score >= 2.5) return '#4caf50'; // Green - Pass
  if (score >= 2.0) return '#ff9800'; // Orange - Warning
  return '#f44336'; // Red - Fail
};

export const formatScoreChange = (changePercentage: number): string => {
  if (changePercentage === 0) return 'No change';
  const sign = changePercentage > 0 ? '+' : '';
  return `${sign}${changePercentage.toFixed(1)}%`;
}; 