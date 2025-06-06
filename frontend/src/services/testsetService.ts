import * as api from './api';
import apiClient from './api';
import { Testset } from '../types';

/**
 * Get testsets for a language pair
 */
export const getTestsets = async (langPairId: number): Promise<Testset[]> => {
  const response = await api.getTestsets(langPairId, 1, 1000); // Get up to 1000 testsets
  return response.items; // Extract items from paginated response
};

const BASE_URL = '/testsets';

/**
 * Get the content of the reference target file for comparison viewing
 */
export const getReferenceFileContent = async (testsetId: number): Promise<string> => {
  const response = await apiClient.get(`${BASE_URL}/${testsetId}/reference-content`);
  return response.data.content;
};

const testsetService = {
  getReferenceFileContent
};

export default testsetService; 