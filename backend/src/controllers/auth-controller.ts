import { validatePassword } from "../services/auth-service";
import { createAuthUser, signInWithPassword, signOutWithSession, forgetPassword, updatePassword, verifyResetToken} from "../repositories/auth-repo";


export async function signUpController(email:string, password:string, firstname:string, lastname:string) {
  try {
  
    if (!email || !password || !firstname || !lastname) {
      console.log(email, password, firstname, lastname);
      return { error: "Missing required fields" };
    }

    if (!validatePassword(password)) {
      return { error: "Password does not meet requirements" };
    }

    // hash password   
    // const hash = await hashPassword(password);
    // console.log(hash);

    const uuid:string = await createAuthUser(email, password, firstname, lastname);  //ไม่ต้อง hash  supabase auth hash ให้ละ       

    return { message: "SignUp success" };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function signInController(email:string, password:string) {
  return signInWithPassword(email, password);
}

export async function signOutController(token:string) {
  return signOutWithSession(token);
}

export async function forgetPasswordController(email:string) {
  return forgetPassword(email);
}

export async function resetPasswordController(token: string, newPassword: string) {
  try {
    if (!newPassword) {
      return { error: "New password is required" };
    }

    if (!validatePassword(newPassword)) {
      return { error: "Password does not meet requirements" };
    }

    return updatePassword(token, newPassword);
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function verifyResetTokenController(token: string) {
  return verifyResetToken(token);
}