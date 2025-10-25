// API configuration and utilities
import axios, { AxiosInstance, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3030';

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  status?: number;
}

export class ApiError extends Error {
  status: number;
  
  constructor(message: string, status: number = 500) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 60000, // Increased to 60 seconds for file uploads
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const errorData = error.response?.data as Record<string, unknown> | undefined;
    const status = error.response?.status;
    const message = String(errorData?.message || '');

    // Check for JWT expiration (status 500 with "JWT has expired" message)
    if ((status === 401 || (status === 500 && message.includes('JWT'))) && typeof window !== 'undefined') {
      // Clear auth data from localStorage
      removeAuthToken();
      localStorage.removeItem('user');
    } else if (status === 401) {
      // Regular 401 error - just remove token
      removeAuthToken();
    }
    
    throw error;
  }
);

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    data?: unknown;
    headers?: Record<string, string>;
    params?: Record<string, unknown>;
    isFormData?: boolean;
  } = {}
): Promise<T> {
  const config: Record<string, unknown> = {
    method: options.method || 'GET',
    url: endpoint,
    headers: options.headers || {},
  };

  try {
    if (options.data) {
      config.data = options.data;
    }

    if (options.params) {
      config.params = options.params;
    }

    // Handle FormData specifically
    if (options.isFormData && options.data instanceof FormData) {
      (config.headers as Record<string, string>)['Content-Type'] = 'multipart/form-data';
      // console.log('📦 Sending FormData request to:', endpoint);
      // console.log('📦 FormData entries:');
      const formData = options.data as FormData;
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          // console.log(`   ${key}: ${value.name} (${(value.size / 1024).toFixed(2)} KB)`);
        } else {
          // console.log(`   ${key}: ${value}`);
        }
      }
    }

    const response: AxiosResponse<T> = await axiosInstance(config);
    
    // console.log('✅ API Response received:', {
    //   url: endpoint,
    //   status: response.status,
    //   statusText: response.statusText
    // });
    
    // Check if response contains an error status in the body (even if HTTP 200)
    const responseData = response.data as Record<string, unknown> | undefined;
    if (responseData?.status === 500 || responseData?.status === 401) {
      const message = String(responseData?.message || 'An error occurred');
      throw new ApiError(message, responseData.status as number);
    }
    
    return response.data;
  } catch (error) {
    console.error('🚨 API Request Failed:', {
      url: endpoint,
      method: config.method,
      error: error,
      isAxiosError: axios.isAxiosError(error),
      response: axios.isAxiosError(error) ? error.response : undefined,
      message: axios.isAxiosError(error) ? error.message : undefined
    });
    
    if (axios.isAxiosError(error)) {
      const errorData = error.response?.data as Record<string, unknown> | undefined;
      
      // Extract error message from various possible response formats
      let message = 'An error occurred';
      if (errorData?.message) {
        message = String(errorData.message);
      } else if (errorData?.error) {
        message = String(errorData.error);
      } else if (error.message) {
        message = error.message;
      }

      const statusCode = error.response?.status || 500;
      throw new ApiError(message, statusCode);
    }
    throw new ApiError(error instanceof Error ? error.message : 'Network error');
  }
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken');
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('authToken', token);
}

export function removeAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('authToken');
}

export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  if (!token) return {};
  
  return {
    'Authorization': `Bearer ${token}`
  };
}
