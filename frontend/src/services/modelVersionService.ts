import api, { getApiBaseUrl, getModelVersionsPaginated as getModelVersionsPaginatedFromApi } from './api';
import { ModelVersion, ModelVersionDetail, ModelVersionCreate, ModelVersionUpdate, PaginatedModelVersions } from '../types';

const BASE_URL = '/model-versions';

/**
 * Get all model versions for a language pair
 */
export const getModelVersions = async (langPairId: number): Promise<ModelVersion[]> => {
  const response = await api.get(BASE_URL, { params: { lang_pair_id: langPairId, page: 1, size: 1000 } });
  return response.data.items; // Extract items from paginated response
};

/**
 * Get paginated model versions for a language pair
 */
export const getModelVersionsPaginated = async (langPairId: number, page?: number, size?: number): Promise<PaginatedModelVersions> => {
  return getModelVersionsPaginatedFromApi(langPairId, page, size);
};

/**
 * Get a specific model version by ID
 */
export const getModelVersion = async (versionId: number): Promise<ModelVersionDetail> => {
  const response = await api.get(`${BASE_URL}/${versionId}`);
  return response.data;
};

/**
 * Create a new model version with optional file upload
 */
export const createModelVersion = async (
  data: ModelVersionCreate, 
  modelFile?: File, 
  hparamsFile?: File,
  baseModelFile?: File,
  baseHparamsFile?: File
): Promise<ModelVersion> => {
  console.log('Creating model version with data:', data);
  console.log('Files:', { modelFile, hparamsFile, baseModelFile, baseHparamsFile });

  // Use FormData to send multipart request with files and form fields
  const formData = new FormData();
  
  // IMPORTANT: Add all fields individually - ensure numbers are correctly converted to strings
  // FastAPI expects specific form fields with their own names
  formData.append('lang_pair_id', String(data.lang_pair_id));
  formData.append('version_name', String(data.version_name));
  
  if (data.release_date) {
    formData.append('release_date', String(data.release_date));
  }
  
  if (data.description) {
    formData.append('description', String(data.description));
  }
  
  // Also add the entire object as JSON in the data field
  formData.append('data', JSON.stringify(data));
  
  // Add finetuned model files if provided
  if (modelFile) {
    formData.append('model_file', modelFile);
    console.log(`Adding model file: ${modelFile.name} (${modelFile.type}, ${modelFile.size} bytes)`);
  }
  
  if (hparamsFile) {
    formData.append('hparams_file', hparamsFile);
    console.log(`Adding hparams file: ${hparamsFile.name} (${hparamsFile.type}, ${hparamsFile.size} bytes)`);
  }
  
  // Add base model files if provided
  if (baseModelFile) {
    formData.append('base_model_file', baseModelFile);
    console.log(`Adding base model file: ${baseModelFile.name} (${baseModelFile.type}, ${baseModelFile.size} bytes)`);
  }
  
  if (baseHparamsFile) {
    formData.append('base_hparams_file', baseHparamsFile);
    console.log(`Adding base hparams file: ${baseHparamsFile.name} (${baseHparamsFile.type}, ${baseHparamsFile.size} bytes)`);
  }
  
  console.log('Form data entries:');
  Array.from(formData.entries()).forEach(([key, value]) => {
    if (value instanceof File) {
      console.log(`${key}: File - ${value.name}, ${value.type}, ${value.size} bytes`);
    } else {
      console.log(`${key}: ${value} (${typeof value})`);
    }
  });
  
  // Hoàn toàn sử dụng fetch API và bỏ axios
  try {
    // Get API base URL from configuration
    const apiBaseUrl = getApiBaseUrl();
    const url = `${apiBaseUrl}${BASE_URL}/`;
    
    console.log(`Sending FormData to ${url}`);
    
    // Get auth token
    const token = localStorage.getItem('token');
    
    // Use fetch API to send FormData
    const response = await fetch(url, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
      body: formData
    });
    
    console.log('Fetch response status:', response.status);
    
    if (!response.ok) {
      let errorText = '';
      try {
        const errorJson = await response.json();
        errorText = JSON.stringify(errorJson);
      } catch (e) {
        errorText = await response.text();
      }
      console.error('Error response from server:', errorText);
      throw new Error(`Server returned ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Success result:', result);
    return result;
  } catch (err: any) {
    console.error('Error creating model version:', err);
    throw err;
  }
};

/**
 * Update a model version with optional file upload
 */
export const updateModelVersion = async (
  versionId: number, 
  data: Partial<ModelVersionUpdate>, 
  modelFile?: File, 
  hparamsFile?: File,
  baseModelFile?: File,
  baseHparamsFile?: File
): Promise<ModelVersion> => {
  console.log('Updating model version with data:', data);
  console.log('Files:', { modelFile, hparamsFile, baseModelFile, baseHparamsFile });

  // Use FormData to send multipart request with files and form fields
  const formData = new FormData();
  
  // IMPORTANT: Add all fields individually - ensure numbers are correctly converted to strings
  if (data.version_name !== undefined) {
    formData.append('version_name', String(data.version_name));
  }
  
  if (data.release_date !== undefined) {
    formData.append('release_date', String(data.release_date));
  }
  
  if (data.description !== undefined) {
    formData.append('description', String(data.description));
  }
  
  if (data.lang_pair_id !== undefined) {
    formData.append('lang_pair_id', String(data.lang_pair_id));
  }
  
  // Also add the entire object as JSON in the data field
  formData.append('data', JSON.stringify(data));
  
  // Add finetuned model files if provided
  if (modelFile) {
    formData.append('model_file', modelFile);
    console.log(`Adding model file: ${modelFile.name} (${modelFile.type}, ${modelFile.size} bytes)`);
  }
  
  if (hparamsFile) {
    formData.append('hparams_file', hparamsFile);
    console.log(`Adding hparams file: ${hparamsFile.name} (${hparamsFile.type}, ${hparamsFile.size} bytes)`);
  }
  
  // Add base model files if provided
  if (baseModelFile) {
    formData.append('base_model_file', baseModelFile);
    console.log(`Adding base model file: ${baseModelFile.name} (${baseModelFile.type}, ${baseModelFile.size} bytes)`);
  }
  
  if (baseHparamsFile) {
    formData.append('base_hparams_file', baseHparamsFile);
    console.log(`Adding base hparams file: ${baseHparamsFile.name} (${baseHparamsFile.type}, ${baseHparamsFile.size} bytes)`);
  }
  
  console.log('Form data entries:');
  Array.from(formData.entries()).forEach(([key, value]) => {
    if (value instanceof File) {
      console.log(`${key}: File - ${value.name}, ${value.type}, ${value.size} bytes`);
    } else {
      console.log(`${key}: ${value} (${typeof value})`);
    }
  });
  
  // Hoàn toàn sử dụng fetch API và bỏ axios
  try {
    // Get API base URL from configuration
    const apiBaseUrl = getApiBaseUrl();
    const url = `${apiBaseUrl}${BASE_URL}/${versionId}`;
    
    console.log(`Sending FormData to ${url}`);
    
    // Get auth token
    const token = localStorage.getItem('token');
    
    // Use fetch API to send FormData
    const response = await fetch(url, {
      method: 'PUT',
      headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
      body: formData
    });
    
    console.log('Fetch response status:', response.status);
    
    if (!response.ok) {
      let errorText = '';
      try {
        const errorJson = await response.json();
        errorText = JSON.stringify(errorJson);
      } catch (e) {
        errorText = await response.text();
      }
      console.error('Error response from server:', errorText);
      throw new Error(`Server returned ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Success result:', result);
    return result;
  } catch (err: any) {
    console.error('Error updating model version:', err);
    throw err;
  }
};

/**
 * Delete a model version
 */
export const deleteModelVersion = async (versionId: number): Promise<ModelVersion> => {
  const response = await api.delete(`${BASE_URL}/${versionId}`);
  return response.data;
};

/**
 * Download a model file
 */
export const downloadModelFile = async (versionId: number, fileType: 'model' | 'hparams' | 'base_model' | 'base_hparams'): Promise<Blob> => {
  const response = await api.get(`${BASE_URL}/${versionId}/files/${fileType}`, {
    responseType: 'blob'
  });
  return response.data;
};

// Create a named export object to fix ESLint warning
const modelVersionService = {
  getModelVersions,
  getModelVersion,
  createModelVersion,
  updateModelVersion,
  deleteModelVersion,
  downloadModelFile
};

export default modelVersionService;