export interface ModelVersion {
    version_id: number;
    lang_pair_id: number;
    version_name: string;
    release_date?: string;
    description?: string;
    created_at: string;
    updated_at: string;
    model_file_name?: string;
    hparams_file_name?: string;
    base_model_file_name?: string;
    base_hparams_file_name?: string;
} 