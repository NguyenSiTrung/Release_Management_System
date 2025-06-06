import axios from 'axios';
import { 
  LoginCredentials, 
  AuthResponse,
  User,
  LanguagePair,
  LanguagePairCreate,
  LanguagePairUpdate,
  ModelVersion,
  ModelVersionCreate,
  ModelVersionUpdate,
  Testset,
  TestsetCreate,
  TestsetUpdate,
  TrainingResult,
  TrainingResultCreate,
  TrainingResultUpdate,
  ReleaseNote,
  ReleaseNoteCreate,
  ReleaseNoteUpdate,
  ComparisonDataPoint,
  ProgressDataPoint,
  PaginatedTestsets,
  PaginatedModelVersions,
  StorageOverview,
  SystemStatus,
  ActiveEvaluations
} from '../types';
import { getToken } from './auth';

// Function to get API base URL
export const getApiBaseUrl = () => {
  // Use environment variable if available
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // In development environment
  if (process.env.NODE_ENV === 'development') {
    // Use the same origin if accessing from another device
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:8000/api/v1`;
    }
    // Use localhost when developing locally
    return 'http://localhost:8000/api/v1';
  }
  
  // In production, use relative path
  return '/api/v1';
};

// Create axios instance
export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add detailed logging for development
if (process.env.NODE_ENV === 'development') {
  api.interceptors.request.use(request => {
    console.log('🚀 API Request:', request.method?.toUpperCase(), request.url);
    console.log('Request data:', request.data);
    console.log('Request headers:', request.headers);
    return request;
  });
  
  api.interceptors.response.use(
    response => {
      console.log('✅ API Response:', response.status, response.config.url);
      return response;
    },
    error => {
      console.log('❌ API Error:', error.response?.status, error.config?.url);
      console.log('Error details:', error.response?.data);
      return Promise.reject(error);
    }
  );
}

// Add request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Check if we're sending FormData - if so, remove the default Content-Type
    // so browser can set the correct multipart boundary
    if (config.data instanceof FormData) {
      console.log('FormData detected - removing Content-Type to allow browser to set multipart boundary');
      delete config.headers['Content-Type'];
      
      // Log all FormData fields for debugging
      const formData = config.data as FormData;
      console.log('FormData contents:');
      for (const pair of Array.from(formData.entries())) {
        const [key, value] = pair;
        console.log(`- ${key}: ${value instanceof File ? `File: ${value.name} (${value.type})` : value}`);
      }
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Create a separate function for redirecting on 401, so it can be called from anywhere
export const handleTokenExpiration = () => {
  // Clear token from localStorage
  localStorage.removeItem('token');
  
  // Redirect to login page with expired=true parameter
  if (window.location.pathname !== '/login') {
    window.location.href = '/login?expired=true';
  }
};

// Add response interceptor to handle error objects better
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle unauthorized errors (expired token)
    if (error.response && error.response.status === 401) {
      console.log('Unauthorized request detected - token may be expired');
      handleTokenExpiration();
    }
    
    // Handle validation error objects that might cause rendering issues
    if (error.response?.data && typeof error.response.data === 'object') {
      console.error('API Error:', error.response.data);
      
      // If we have a validation error object with type, loc, msg properties
      if (error.response.data.type && error.response.data.loc) {
        // Create a new error object with a string detail field
        const errorMsg = error.response.data.msg || 'Validation error';
        error.response.data = {
          detail: `Validation error: ${errorMsg}`
        };
      } 
      // Handle any other objects that don't have a 'detail' field
      else if (!error.response.data.detail) {
        try {
          // Convert any non-detail object to a string representation
          error.response.data = {
            detail: `API Error: ${JSON.stringify(error.response.data)}`
          };
        } catch (e) {
          error.response.data = {
            detail: 'An unknown API error occurred'
          };
        }
      }
    }
    return Promise.reject(error);
  }
);

// Authentication APIs
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  // Create FormData object - FastAPI's OAuth2PasswordRequestForm expects form data, not JSON
  const formData = new FormData();
  formData.append('username', credentials.username);
  formData.append('password', credentials.password);
  
  // Create custom headers for form data
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const response = await api.post<AuthResponse>('/auth/login', 
    // Convert FormData to URLSearchParams for proper encoding
    new URLSearchParams(formData as any).toString(), 
    { headers }
  );
  return response.data;
};

export const register = async (userData: { username: string; email: string; password: string }): Promise<User> => {
  const response = await api.post<User>('/auth/register', userData);
  return response.data;
};

// Language Pair APIs
export const getLanguagePairs = async (
  sourceCode?: string,
  targetCode?: string,
  skip?: number,
  limit?: number
): Promise<LanguagePair[]> => {
  const params: Record<string, any> = {};
  if (sourceCode) params.source_code = sourceCode;
  if (targetCode) params.target_code = targetCode;
  if (skip !== undefined) params.skip = skip;
  if (limit !== undefined) params.limit = limit;

  const response = await api.get<LanguagePair[]>('/language-pairs', { params });
  return response.data;
};

export const getLanguagePair = async (id: number): Promise<LanguagePair> => {
  const response = await api.get<LanguagePair>(`/language-pairs/${id}`);
  return response.data;
};

export const createLanguagePair = async (data: LanguagePairCreate): Promise<LanguagePair> => {
  const response = await api.post<LanguagePair>('/language-pairs', data);
  return response.data;
};

export const updateLanguagePair = async (id: number, data: LanguagePairUpdate): Promise<LanguagePair> => {
  const response = await api.put<LanguagePair>(`/language-pairs/${id}`, data);
  return response.data;
};

export const deleteLanguagePair = async (id: number): Promise<boolean> => {
  const response = await api.delete<boolean>(`/language-pairs/${id}`);
  return response.data;
};

// Model Version APIs
export const getModelVersions = async (langPairId: number, page?: number, size?: number): Promise<PaginatedModelVersions> => {
  const params: Record<string, any> = { 
    lang_pair_id: langPairId
  };
  if (page !== undefined) params.page = page;
  if (size !== undefined) params.size = size;
  
  const response = await api.get<PaginatedModelVersions>('/model-versions/', { params });
  return response.data;
};

export const getModelVersionsPaginated = async (langPairId: number, page?: number, size?: number): Promise<PaginatedModelVersions> => {
  const params: Record<string, any> = { 
    lang_pair_id: langPairId
  };
  if (page !== undefined) params.page = page;
  if (size !== undefined) params.size = size;
  
  const response = await api.get<PaginatedModelVersions>('/model-versions/', { params });
  return response.data;
};

export const getModelVersion = async (id: number): Promise<ModelVersion> => {
  const response = await api.get<ModelVersion>(`/model-versions/${id}/`);
  return response.data;
};

export const createModelVersion = async (data: ModelVersionCreate): Promise<ModelVersion> => {
  const response = await api.post<ModelVersion>('/model-versions/', data);
  return response.data;
};

export const updateModelVersion = async (id: number, data: ModelVersionUpdate): Promise<ModelVersion> => {
  const response = await api.put<ModelVersion>(`/model-versions/${id}/`, data);
  return response.data;
};

export const deleteModelVersion = async (id: number): Promise<boolean> => {
  const response = await api.delete<boolean>(`/model-versions/${id}/`);
  return response.data;
};

// Testset APIs
export const getTestsets = async (langPairId?: number, page?: number, size?: number): Promise<PaginatedTestsets> => {
  const params: Record<string, any> = {};
  if (langPairId) params.lang_pair_id = langPairId;
  if (page !== undefined) params.page = page;
  if (size !== undefined) params.size = size;
  
  const response = await api.get<PaginatedTestsets>('/testsets/', { params });
  return response.data;
};

export const getTestsetsPaginated = async (langPairId?: number, page?: number, size?: number): Promise<PaginatedTestsets> => {
  const params: Record<string, any> = {};
  if (langPairId) params.lang_pair_id = langPairId;
  if (page !== undefined) params.page = page;
  if (size !== undefined) params.size = size;
  
  const response = await api.get<PaginatedTestsets>('/testsets/', { params });
  return response.data;
};

export const getTestset = async (id: number): Promise<Testset> => {
  const response = await api.get<Testset>(`/testsets/${id}/`);
  return response.data;
};

export const createTestset = async (data: TestsetCreate, sourceFile?: File, targetFile?: File): Promise<Testset> => {
  // Use FormData for file uploads
  const formData = new FormData();
  
  // Add the form data as JSON string
  formData.append('data', JSON.stringify(data));
  
  // Add individual fields for compatibility
  formData.append('testset_name', data.testset_name);
  formData.append('lang_pair_id', String(data.lang_pair_id));
  
  if (data.description) {
    formData.append('description', data.description);
  }
  
  // Add files if provided
  if (sourceFile) {
    formData.append('source_file', sourceFile);
  }
  
  if (targetFile) {
    formData.append('target_file', targetFile);
  }
  
  const response = await api.post<Testset>('/testsets', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  
  return response.data;
};

export const updateTestset = async (
  id: number,
  data: TestsetUpdate,
  sourceFile?: File,
  targetFile?: File
): Promise<Testset> => {
  // Use FormData for file uploads
  const formData = new FormData();
  
  // Add the form data as JSON string
  formData.append('data', JSON.stringify(data));
  
  // Add individual fields for compatibility
  if (data.testset_name !== undefined) {
    formData.append('testset_name', data.testset_name);
  }
  
  if (data.description !== undefined) {
    formData.append('description', data.description);
  }
  
  // Add files if provided
  if (sourceFile) {
    formData.append('source_file', sourceFile);
  }
  
  if (targetFile) {
    formData.append('target_file', targetFile);
  }
  
  const response = await api.put<Testset>(`/testsets/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  
  return response.data;
};

export const deleteTestset = async (id: number): Promise<boolean> => {
  const response = await api.delete<boolean>(`/testsets/${id}`);
  return response.data;
};

export const downloadTestsetFile = async (testsetId: number, fileType: 'source' | 'target'): Promise<Blob> => {
  const response = await api.get(`/testsets/${testsetId}/files/${fileType}`, {
    responseType: 'blob'
  });
  return response.data;
};

export const getTestsetFileContent = async (testsetId: number, fileType: 'source' | 'target'): Promise<{
  content: string;
  filename: string;
  file_type: string;
  lines_count: number;
  size_bytes: number;
}> => {
  const response = await api.get(`/testsets/${testsetId}/content/${fileType}`);
  return response.data;
};

export const updateTestsetFileContent = async (
  testsetId: number, 
  fileType: 'source' | 'target', 
  content: string
): Promise<{
  success: boolean;
  message: string;
  filename: string;
  file_type: string;
  lines_count: number;
  size_bytes: number;
}> => {
  const response = await api.put(`/testsets/${testsetId}/content/${fileType}`, { content });
  return response.data;
};

// Training Result APIs
export const getTrainingResults = async (versionId: number): Promise<TrainingResult[]> => {
  const response = await api.get<TrainingResult[]>(`/training-results/${versionId}`);
  return response.data;
};

export const createTrainingResult = async (versionId: number, data: TrainingResultCreate): Promise<TrainingResult> => {
  const response = await api.post<TrainingResult>(`/training-results/${versionId}`, data);
  return response.data;
};

export const updateTrainingResult = async (id: number, data: TrainingResultUpdate): Promise<TrainingResult> => {
  const response = await api.put<TrainingResult>(`/training-results/${id}`, data);
  return response.data;
};

export const deleteTrainingResult = async (id: number): Promise<boolean> => {
  const response = await api.delete<boolean>(`/training-results/${id}`);
  return response.data;
};

// Release Notes APIs
export const getReleaseNote = async (versionId: number): Promise<ReleaseNote | null> => {
  try {
    const response = await api.get<ReleaseNote>(`/release-notes/${versionId}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

export const createReleaseNote = async (versionId: number, data: ReleaseNoteCreate): Promise<ReleaseNote> => {
  const response = await api.post<ReleaseNote>(`/release-notes/${versionId}`, data);
  return response.data;
};

export const updateReleaseNote = async (versionId: number, data: ReleaseNoteUpdate): Promise<ReleaseNote> => {
  const response = await api.put<ReleaseNote>(`/release-notes/${versionId}`, data);
  return response.data;
};

// Visualization APIs
export const getComparisonData = async (
  versionId: number,
  testsetId?: number
): Promise<ComparisonDataPoint[]> => {
  const params: Record<string, any> = { version_id: versionId };
  if (testsetId) params.testset_id = testsetId;

  const response = await api.get<ComparisonDataPoint[]>('/visualizations/comparison', { params });
  return response.data;
};

export const getTestsetComparison = async (
  versionId: number,
  metric: 'bleu' | 'comet'
): Promise<any> => {
  const params: Record<string, any> = { 
    version_id: versionId,
    metric: metric
  };

  const response = await api.get<any>('/visualizations/testset-comparison', { params });
  return response.data;
};

export const getProgressData = async (
  langPairId: number,
  metric: 'bleu' | 'comet',
  testsetId?: number,
  startDate?: string,
  endDate?: string
): Promise<ProgressDataPoint[]> => {
  const params: Record<string, any> = {
    lang_pair_id: langPairId,
    metric
  };
  if (testsetId) params.testset_id = testsetId;
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;

  const response = await api.get<ProgressDataPoint[]>('/visualizations/progress', { params });
  return response.data;
};

// User management APIs (for admin)
export const getUsers = async (): Promise<User[]> => {
  const response = await api.get<User[]>('/users');
  return response.data;
};

export const getPendingUsers = async (): Promise<User[]> => {
  const response = await api.get<User[]>('/users/pending');
  return response.data;
};

export const approveUser = async (userId: number, approve: boolean): Promise<User> => {
  const response = await api.post<User>(`/users/approve/${userId}`, {
    user_id: userId,
    status: approve ? 'approved' : 'rejected'
  });
  return response.data;
};

export const updateUser = async (id: number, data: { role: string }): Promise<User> => {
  const response = await api.put<User>(`/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id: number): Promise<boolean> => {
  const response = await api.delete<boolean>(`/users/${id}`);
  return response.data;
};

// Export function
export const exportModelVersions = async (langPairId: number, format: 'excel' | 'markdown'): Promise<Blob> => {
  const response = await api.get(`/model-versions/export/${langPairId}`, {
    params: { format },
    responseType: 'blob'
  });
  return response.data;
};

// System and Storage APIs
export const getStorageOverview = async (): Promise<StorageOverview> => {
  const response = await api.get<StorageOverview>('/system/storage/overview');
  return response.data;
};

export const getSystemStatus = async (): Promise<SystemStatus> => {
  const response = await api.get<SystemStatus>('/system/system/status');
  return response.data;
};

export const getActiveEvaluations = async (): Promise<ActiveEvaluations> => {
  const response = await api.get<ActiveEvaluations>('/system/evaluations/active');
  return response.data;
};

// Export object with HTTP methods for compatibility
const apiMethods = {
  get: api.get.bind(api),
  post: api.post.bind(api),
  put: api.put.bind(api),
  delete: api.delete.bind(api)
};

export default apiMethods; 