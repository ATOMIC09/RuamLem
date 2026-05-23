import crypto from "crypto";
import "dotenv/config";

// export async function hashPassword(password: string): Promise<string> {
//   /* argon2id algorithm */
//   return await Bun.password.hash(password);
// }

// export async function verifyPassword(password: string, hash: string): Promise<boolean> {
//   return await Bun.password.verify(password, hash);
// }

export function validatePassword(password: string): boolean {
  /* ความยาวขั้นต่ำ 8
     มีพิมพ์เล็ก หรือ พิมพ์ใหญ่อย่างน้อย 1
     เเละมีเลข
   */
  if (password.length < 8) return false;
  if (!/[A-Za-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  //   if (!/[!@#$%^&*]/.test(password)) return false;

  return true;
}

export function decryptRSA(encrypted: string): string {
  const RSA_PRIVATE_KEY:string = process.env.RSA_PRIVATE_KEY!.replace(/\\n/g, '\n');
  
  if (!RSA_PRIVATE_KEY) {
    throw new Error("RSA private key is not defined in env");
  }

  return crypto.privateDecrypt(
    {
      key: RSA_PRIVATE_KEY,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    },
    Buffer.from(encrypted, "base64")
  ).toString("utf-8");
}
