// Authentication types
export interface User {
  user_id: number;
  username: string;
  email: string;
  role: string;
  status: string; // 'active', 'pending', 'rejected'
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

// Language Pair types
export interface LanguagePair {
  lang_pair_id: number;
  source_language_code: string;
  target_language_code: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface LanguagePairCreate {
  source_language_code: string;
  target_language_code: string;
  description?: string;
}

export interface LanguagePairUpdate {
  description?: string;
}

// Model Version types
export interface ModelVersion {
  version_id: number;
  lang_pair_id: number;
  version_name: string;
  release_date: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  model_file_name?: string | null;
  hparams_file_name?: string | null;
  base_model_file_name?: string | null;
  base_hparams_file_name?: string | null;
}

export interface ModelVersionDetail extends ModelVersion {
  release_note?: ReleaseNote | null;
  training_results: TrainingResult[];
}

export interface ModelVersionCreate {
  lang_pair_id: number;
  version_name: string;
  release_date?: string;
  description?: string;
}

export interface ModelVersionUpdate {
  version_name?: string;
  release_date?: string;
  description?: string;
  lang_pair_id?: number;
}

// Testset types
export interface Testset {
  testset_id: number;
  lang_pair_id: number;
  testset_name: string;
  description: string | null;
  source_file_path: string | null;
  target_file_path: string | null;
  source_file_name: string | null;
  target_file_name: string | null;
  source_file_path_on_server: string | null;
  target_file_path_on_server: string | null;
  created_at: string;
  updated_at: string;
}

export interface TestsetCreate {
  lang_pair_id: number;
  testset_name: string;
  description?: string;
  source_file_path?: string;
  target_file_path?: string;
}

export interface TestsetUpdate {
  testset_name?: string;
  description?: string;
  source_file_path?: string;
  target_file_path?: string;
}

// Training Result types
export interface TrainingResult {
  result_id: number;
  version_id: number;
  testset_id: number;
  base_model_bleu: number | null;
  base_model_comet: number | null;
  finetuned_model_bleu: number | null;
  finetuned_model_comet: number | null;
  training_details_notes: string | null;
  created_at: string;
  updated_at: string;
  testset?: Testset;
}

export interface TrainingResultCreate {
  version_id: number;
  testset_id: number;
  base_model_bleu?: number;
  base_model_comet?: number;
  finetuned_model_bleu?: number;
  finetuned_model_comet?: number;
  training_details_notes?: string;
}

export interface TrainingResultUpdate {
  base_model_bleu?: number;
  base_model_comet?: number;
  finetuned_model_bleu?: number;
  finetuned_model_comet?: number;
  training_details_notes?: string;
}

// Release Notes types
export interface ReleaseNote {
  note_id: number;
  version_id: number;
  title: string | null;
  content: string | null;
  author_id: number | null;
  created_at: string;
  updated_at: string;
  author?: User;
}

export interface ReleaseNoteCreate {
  version_id: number;
  title?: string;
  content?: string;
}

export interface ReleaseNoteUpdate {
  title?: string;
  content?: string;
}

// Visualization types
export interface ComparisonDataPoint {
  metric: string;
  base_model: number | null;
  finetuned_model: number | null;
}

export interface ProgressDataPoint {
  version_name: string;
  release_date: string | null;
  score: number | null;
} 

// Pagination types
export interface PaginationInfo {
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface PaginatedTestsets extends PaginationInfo {
  items: Testset[];
}

export interface PaginatedModelVersions extends PaginationInfo {
  items: ModelVersion[];
}

// System and Storage types
export interface StorageItem {
  size_gb: number;
  file_count: number;
  display: string;
}

export interface StorageOverview {
  model_files: StorageItem;
  testsets: StorageItem;
  evaluation_logs: StorageItem;
  temporary_files: StorageItem;
  total: StorageItem;
}

export interface SystemStatusItem {
  status: string;
  message: string;
}

export interface SystemStatus {
  api_server: SystemStatusItem;
  database: SystemStatusItem;
  background_jobs: {
    active_evaluations: number;
    message: string;
  };
  storage_health: SystemStatusItem;
}

export interface ActiveEvaluations {
  active_count: number;
  completed_today: number;
  evaluation_directories: Array<{
    name: string;
    path: string;
    size_mb: number;
  }>;
  message: string;
}

// Export all evaluation types
export * from './evaluation'; 