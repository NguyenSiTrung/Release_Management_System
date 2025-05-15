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
  ProgressDataPoint
} from '../types';

// Function to get API base URL
const getApiBaseUrl = () => {
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
const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
export const getModelVersions = async (langPairId: number): Promise<ModelVersion[]> => {
  const response = await api.get<ModelVersion[]>('/model-versions', {
    params: { lang_pair_id: langPairId }
  });
  return response.data;
};

export const getModelVersion = async (id: number): Promise<ModelVersion> => {
  const response = await api.get<ModelVersion>(`/model-versions/${id}`);
  return response.data;
};

export const createModelVersion = async (data: ModelVersionCreate): Promise<ModelVersion> => {
  const response = await api.post<ModelVersion>('/model-versions', data);
  return response.data;
};

export const updateModelVersion = async (id: number, data: ModelVersionUpdate): Promise<ModelVersion> => {
  const response = await api.put<ModelVersion>(`/model-versions/${id}`, data);
  return response.data;
};

export const deleteModelVersion = async (id: number): Promise<boolean> => {
  const response = await api.delete<boolean>(`/model-versions/${id}`);
  return response.data;
};

// Testset APIs
export const getTestsets = async (langPairId?: number): Promise<Testset[]> => {
  const params: Record<string, any> = {};
  if (langPairId) params.lang_pair_id = langPairId;

  const response = await api.get<Testset[]>('/testsets', { params });
  return response.data;
};

export const getTestset = async (id: number): Promise<Testset> => {
  const response = await api.get<Testset>(`/testsets/${id}`);
  return response.data;
};

export const createTestset = async (data: TestsetCreate): Promise<Testset> => {
  const response = await api.post<Testset>('/testsets', data);
  return response.data;
};

export const updateTestset = async (id: number, data: TestsetUpdate): Promise<Testset> => {
  const response = await api.put<Testset>(`/testsets/${id}`, data);
  return response.data;
};

export const deleteTestset = async (id: number): Promise<boolean> => {
  const response = await api.delete<boolean>(`/testsets/${id}`);
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