import api from './api';
import { EvaluationJobCreate, EvaluationJobStatus, EvaluationJob } from '../types';

const BASE_URL = '/evaluations';

// Pagination response interface
export interface PaginatedEvaluationJobs {
  items: EvaluationJob[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// Delete request interfaces
export interface BulkDeleteRequest {
  job_ids: number[];
}

export interface DateRangeDeleteRequest {
  start_date: string;
  end_date: string;
  version_id?: number;
  status?: string;
}

export interface DeleteResponse {
  deleted_count: number;
  message: string;
  failed_deletions?: Array<{ job_id: number; error: string }>;
}

/**
 * Start an evaluation job for a model version
 */
export const runEvaluation = async (data: EvaluationJobCreate): Promise<EvaluationJobStatus> => {
  const response = await api.post(`${BASE_URL}/run`, data);
  return response.data;
};

/**
 * Get the status of an evaluation job
 */
export const getEvaluationStatus = async (jobId: number): Promise<EvaluationJobStatus> => {
  const response = await api.get(`${BASE_URL}/status/${jobId}`);
  return response.data;
};

/**
 * Get list of evaluation jobs with pagination
 */
export const getEvaluationJobs = async (
  params: {
    version_id?: number;
    testset_id?: number;
    status?: string;
    page?: number;
    size?: number;
  } = {}
): Promise<PaginatedEvaluationJobs> => {
  const response = await api.get(BASE_URL, { params });
  return response.data;
};

/**
 * Get list of evaluation jobs without pagination (legacy)
 */
export const getEvaluationJobsLegacy = async (
  params: {
    version_id?: number;
    testset_id?: number;
    status?: string;
    skip?: number;
    limit?: number;
  } = {}
): Promise<EvaluationJob[]> => {
  // Convert pagination to legacy format
  const page = params.skip ? Math.floor(params.skip / (params.limit || 10)) + 1 : 1;
  const size = params.limit || 100;
  
  const paginatedResponse = await getEvaluationJobs({
    version_id: params.version_id,
    testset_id: params.testset_id,
    status: params.status,
    page,
    size
  });
  
  return paginatedResponse.items;
};

/**
 * Translate text directly using a model version
 */
export const translateText = async (
  data: {
    version_id: number;
    source_text: string;
    model_type?: string;
    mode_type?: string;
    sub_mode_type?: string;
    custom_params?: string;
  }
): Promise<{ translated_text: string; status: string }> => {
  const response = await api.post(`${BASE_URL}/translate`, data);
  return response.data;
};

/**
 * Download output file for an evaluation job
 */
export const downloadOutputFile = async (jobId: number, modelType: string = 'finetuned'): Promise<Blob> => {
  const response = await api.get(`${BASE_URL}/${jobId}/download-output-file`, {
    params: { model_type: modelType },
    responseType: 'blob'
  });
  return response.data;
};

/**
 * Get output content for an evaluation job
 */
export const getOutputContent = async (jobId: number, modelType: string = 'finetuned'): Promise<string> => {
  const response = await api.get(`${BASE_URL}/${jobId}/output-content`, {
    params: { model_type: modelType }
  });
  return response.data.content;
};

/**
 * Bulk delete evaluation jobs (admin only)
 */
export const bulkDeleteJobs = async (request: BulkDeleteRequest): Promise<DeleteResponse> => {
  const response = await api.post(`${BASE_URL}/bulk-delete`, request);
  return response.data;
};

/**
 * Delete evaluation jobs by date range (admin only)
 */
export const dateRangeDeleteJobs = async (request: DateRangeDeleteRequest): Promise<DeleteResponse> => {
  const response = await api.post(`${BASE_URL}/date-range-delete`, request);
  return response.data;
};

// Create a named export object to fix ESLint warning
const evaluationService = {
  runEvaluation,
  getEvaluationStatus,
  getEvaluationJobs,
  getEvaluationJobsLegacy,
  translateText,
  downloadOutputFile,
  getOutputContent,
  bulkDeleteJobs,
  dateRangeDeleteJobs
};

export default evaluationService; 