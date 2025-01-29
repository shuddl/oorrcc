
import axios from 'axios';
import { useAuth } from '../lib/auth';
import { ApiResponse } from '@fullstack/shared';
import AIService from './ai/AIService'; // Import AI service

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.response.use(
  (response) => {
    const apiResponse: ApiResponse = {
      success: true,
      data: response.data.data
    };
    return apiResponse;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await useAuth.getState().refreshSession(); // Attempt to refresh token
        const newToken = useAuth.getState().token;
        if (newToken) {
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return api(originalRequest); // Retry original request
        }
      } catch (refreshError) {
        useAuth.getState().clearAuth(); // Clear auth if refresh fails
        AIService.handleAuthenticationFailure(refreshError); // Let AI handle the failure
        return Promise.reject(refreshError);
      }
    }

    const apiResponse: ApiResponse = {
      success: false,
      error: {
        code: error.response?.data?.error?.code || 'UNKNOWN_ERROR',
        message: error.response?.data?.error?.message || 'An unexpected error occurred',
        details: error.response?.data?.error?.details
      }
    };
    
    AIService.handleApiError(apiResponse); // Let AI handle the API error

    return Promise.reject(apiResponse);
  }
);

export default api;