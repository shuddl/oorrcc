import axios from 'axios';
import { ApiResponse } from '@fullstack/shared';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Transform responses to match ApiResponse type
api.interceptors.response.use(
  (response) => {
    const apiResponse: ApiResponse = {
      success: true,
      data: response.data.data
    };
    return apiResponse;
  },
  (error) => {
    const apiResponse: ApiResponse = {
      success: false,
      error: {
        code: error.response?.data?.error?.code || 'UNKNOWN_ERROR',
        message: error.response?.data?.error?.message || 'An unexpected error occurred',
        details: error.response?.data?.error?.details
      }
    };
    return Promise.reject(apiResponse);
  }
);

export default api;