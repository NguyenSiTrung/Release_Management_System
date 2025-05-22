import * as api from './api';
import { Testset } from '../types';

/**
 * Get testsets for a language pair
 */
export const getTestsets = async (langPairId: number): Promise<Testset[]> => {
  const response = await api.getTestsets(langPairId);
  return response;
}; 