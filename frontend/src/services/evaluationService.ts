import api from './api';
import { EvaluationJobCreate, EvaluationJobStatus, EvaluationJob } from '../types';

const BASE_URL = '/evaluations';

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
 * Get list of evaluation jobs with optional filtering
 */
export const getEvaluationJobs = async (
  params: {
    version_id?: number;
    testset_id?: number;
    status?: string;
    skip?: number;
    limit?: number;
  } = {}
): Promise<EvaluationJob[]> => {
  const response = await api.get(BASE_URL, { params });
  return response.data;
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

// Create a named export object to fix ESLint warning
const evaluationService = {
  runEvaluation,
  getEvaluationStatus,
  getEvaluationJobs,
  translateText
};

export default evaluationService; 