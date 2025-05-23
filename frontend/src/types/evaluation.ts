export enum EvaluationStatus {
  PENDING = "PENDING",
  PREPARING_SETUP = "PREPARING_SETUP",
  PREPARING_ENGINE = "PREPARING_ENGINE",
  RUNNING_ENGINE = "RUNNING_ENGINE",
  CALCULATING_METRICS = "CALCULATING_METRICS",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED"
}

export interface EvaluationResultData {
  bleu_score: number;
  comet_score: number;
  output_file_generated_path: string | null;
  added_to_details: boolean;
  base_model_result?: {
    bleu_score: number;
    comet_score: number;
    output_file_path?: string;
  };
}

export interface EvaluationJobStatus {
  job_id: number;
  status: EvaluationStatus;
  progress_percentage: number;
  requested_at: string;
  completed_at?: string;
  result?: EvaluationResultData;
  error_message?: string;
  log_message?: string;
  detail?: string;
  mode_type?: string;
  sub_mode_type?: string;
  custom_params?: string;
  evaluation_model_type?: 'base' | 'finetuned' | 'both';
}

export interface EvaluationJobCreate {
  version_id: number;
  testset_id: number;
  auto_add_to_details: boolean;
  mode_type?: string;
  sub_mode_type?: string;
  custom_params?: string;
  evaluation_model_type?: 'base' | 'finetuned' | 'both';
}

export interface EvaluationJob {
  job_id: number;
  version_id: number;
  testset_id: number;
  requested_by_user_id?: number;
  status: EvaluationStatus;
  bleu_score?: number;
  comet_score?: number;
  base_model_bleu_score?: number;
  base_model_comet_score?: number;
  base_model_output_file_path?: string;
  output_file_path?: string;
  log_message?: string;
  auto_add_to_details_requested: boolean;
  details_added_successfully?: boolean;
  requested_at: string;
  processing_started_at?: string;
  completed_at?: string;
  model_version_name?: string;
  testset_name?: string;
  requested_by_username?: string;
  mode_type?: string;
  sub_mode_type?: string;
  custom_params?: string;
  evaluation_model_type?: 'base' | 'finetuned' | 'both';
} 