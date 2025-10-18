// Authentication service

import { apiRequest, setAuthToken, removeAuthToken } from '@/lib/api';
import { encryptRSA } from '@/lib/crypto';

export interface SignUpData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface SignInData {
  email: string;
  password: string;
}

// Backend response format (actual response from Supabase)
interface BackendAuthResponse {
  success?: boolean;
  uuid?: string;
  firstName?: string;
  lastName?: string;
  userRole?: string;
  session?: {
    access_token: string;
    token_type: string;
    expires_in: number;
    expires_at: number;
    refresh_token: string;
    user: {
      id: string;
      email: string;
      [key: string]: unknown;
    };
  };
  error?: string;
  message?: string;
}

// Frontend format
export interface AuthResponse {
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  token?: string;
  error?: string;
  message?: string;
}

// Transform backend response to frontend format
function transformAuthResponse(backendResponse: BackendAuthResponse): AuthResponse {
  // Handle explicit error responses
  if (backendResponse.error) {
    return {
      error: backendResponse.error,
      message: backendResponse.message,
    };
  }

  // Handle failure responses (success: false)
  if (backendResponse.success === false) {
    return {
      error: backendResponse.message || 'Authentication failed',
      message: backendResponse.message,
    };
  }

  // Handle success responses with session
  if (backendResponse.success && backendResponse.session) {
    return {
      user: {
        id: backendResponse.uuid || backendResponse.session.user.id,
        email: backendResponse.session.user.email,
        firstName: backendResponse.firstName || '',
        lastName: backendResponse.lastName || '',
      },
      token: backendResponse.session.access_token,
    };
  }

  return {
    error: 'Invalid response format',
  };
}

export async function signUp(data: SignUpData): Promise<AuthResponse> {
  try {
    // Prepare data for encryption
    const payload = JSON.stringify({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      password: data.password,
    });

    // Encrypt the payload
    const encryptedData = await encryptRSA(payload);

    // Send to backend
    const signUpResponse = await apiRequest<{ message?: string; error?: string }>('/auth/signUp', {
      method: 'POST',
      data: { data: encryptedData },
    });

    // Check for signup errors
    if (signUpResponse.error) {
      let errorMessage = signUpResponse.error;
      
      // Handle database constraint errors with user-friendly messages
      if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
        errorMessage = 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น';
      } else if (errorMessage.includes('User already registered')) {
        errorMessage = 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น';
      }
      
      return {
        error: errorMessage,
        message: errorMessage,
      };
    }

    // If signup successful, return success without auto-signin
    // User needs to confirm email first
    if (signUpResponse.message) {
      return {
        message: 'ลงทะเบียนสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชีของคุณ',
      };
    }

    return {
      error: 'Invalid response format',
    };
  } catch (error) {
    let errorMessage = 'การลงทะเบียนล้มเหลว';
    
    if (error instanceof Error) {
      // Handle database constraint errors
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        errorMessage = 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น';
      } else {
        errorMessage = error.message;
      }
    }
    
    return {
      error: errorMessage,
    };
  }
}

export async function signIn(data: SignInData): Promise<AuthResponse> {
  try {
    // Prepare data for encryption
    const payload = JSON.stringify({
      email: data.email,
      password: data.password,
    });

    // Encrypt the payload
    const encryptedData = await encryptRSA(payload);

    // Send to backend
    const backendResponse = await apiRequest<BackendAuthResponse>('/auth/signIn', {
      method: 'POST',
      data: { data: encryptedData },
    });

    // Transform response to frontend format
    const response = transformAuthResponse(backendResponse);

    // Store token if provided
    if (response.token) {
      setAuthToken(response.token);
    }

    return response;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'การเข้าสู่ระบบล้มเหลว',
    };
  }
}

export async function signOut(): Promise<void> {
  try {
    await apiRequest('/auth/signOut', {
      method: 'POST',
    });
  } catch (error) {
    console.error('Sign out error:', error);
  } finally {
    removeAuthToken();
  }
}

export async function forgotPassword(email: string): Promise<{ message?: string; error?: string }> {
  try {
    const response = await apiRequest<{ message?: string; error?: string }>('/auth/forget', {
      method: 'POST',
      data: { email },
    });

    return response;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'การส่งอีเมลรีเซ็ตรหัสผ่านล้มเหลว',
    };
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message?: string; error?: string }> {
  try {
    const response = await apiRequest<{ message?: string; error?: string }>('/auth/reset-password', {
      method: 'POST',
      data: { token, newPassword },
    });

    return response;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'การรีเซ็ตรหัสผ่านล้มเหลว',
    };
  }
}

export async function verifyResetToken(token: string): Promise<{ valid?: boolean; error?: string }> {
  try {
    const response = await apiRequest<{ valid?: boolean; error?: string }>('/auth/verify-reset-token', {
      method: 'POST',
      data: { token },
    });

    return response;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'การตรวจสอบโทเค็นล้มเหลว',
    };
  }
}
