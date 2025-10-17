// RSA Encryption utilities for client-side

/**
 * Encrypts data using RSA public key with PKCS1_OAEP padding (SHA-1)
 * This matches the Python implementation using pycryptodome's PKCS1_OAEP
 * and the backend's Node.js crypto.privateDecrypt with RSA_PKCS1_OAEP_PADDING
 */
export async function encryptRSA(data: string): Promise<string> {
  const publicKey = process.env.NEXT_PUBLIC_RSA_PUBLIC_KEY;
  
  if (!publicKey) {
    console.warn('RSA public key not found in environment variables. Using plain text for development.');
    // For development without RSA setup, return base64 encoded data
    return btoa(data);
  }

  // Check if we're in a browser environment (Web Crypto API)
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return encryptRSABrowser(data, publicKey);
  }
  
  // This shouldn't happen in Next.js client-side, but keep as fallback
  console.warn('Falling back to base64 encoding');
  return btoa(data);
}

/**
 * Browser-compatible RSA encryption using Web Crypto API
 * Uses SHA-1 to match backend's default PKCS1_OAEP padding
 */
async function encryptRSABrowser(data: string, publicKey: string): Promise<string> {
  try {
    // Clean up the PEM format
    const pemContents = publicKey
      .replace('-----BEGIN PUBLIC KEY-----', '')
      .replace('-----END PUBLIC KEY-----', '')
      .replace(/\s/g, '')
      .replace(/\n/g, '');
    
    // Convert base64 to binary
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    // Import the public key with SHA-1 (default for PKCS1_OAEP in Node.js and Python)
    const cryptoKey = await window.crypto.subtle.importKey(
      'spki',
      binaryDer,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-1',
      },
      true,
      ['encrypt']
    );

    // Encrypt the data
    const encodedData = new TextEncoder().encode(data);
    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP',
      },
      cryptoKey,
      encodedData
    );

    // Convert to base64 (matching Python's base64.b64encode)
    const encryptedArray = new Uint8Array(encryptedData);
    const binaryString = String.fromCharCode(...encryptedArray);
    return btoa(binaryString);
  } catch (error) {
    console.error('RSA encryption error:', error);
    
    // SHA-1 might not be supported in some browsers, try SHA-256
    try {
      console.log('Trying SHA-256 as fallback...');
      const pemContents = publicKey
        .replace('-----BEGIN PUBLIC KEY-----', '')
        .replace('-----END PUBLIC KEY-----', '')
        .replace(/\s/g, '')
        .replace(/\n/g, '');
      
      const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
      
      const cryptoKey = await window.crypto.subtle.importKey(
        'spki',
        binaryDer,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        true,
        ['encrypt']
      );

      const encodedData = new TextEncoder().encode(data);
      const encryptedData = await window.crypto.subtle.encrypt(
        {
          name: 'RSA-OAEP',
        },
        cryptoKey,
        encodedData
      );

      const encryptedArray = new Uint8Array(encryptedData);
      const binaryString = String.fromCharCode(...encryptedArray);
      const result = btoa(binaryString);
      
      console.warn('⚠️ Using SHA-256. Backend must support this by adding: oaepHash: "sha256"');
      return result;
    } catch (sha256Error) {
      console.error('SHA-256 encryption also failed:', sha256Error);
      console.warn('⚠️ Falling back to base64 encoding (NOT SECURE - for development only)');
      return btoa(data);
    }
  }
}

/**
 * Validates password according to backend requirements
 * - Minimum 8 characters
 * - At least one letter (uppercase or lowercase)
 * - At least one number
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' };
  }
  
  if (!/[A-Za-z]/.test(password)) {
    return { valid: false, message: 'รหัสผ่านต้องมีตัวอักษร A-Z หรือ a-z อย่างน้อย 1 ตัว' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'รหัสผ่านต้องมีตัวเลข 0-9 อย่างน้อย 1 ตัว' };
  }
  
  return { valid: true };
}
