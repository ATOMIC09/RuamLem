import { validatePassword } from "../services/auth-service";
import { createAuthUser,signInWithPassword} from "../repositories/user-repo";


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
  return signInWithPassword(email, password)
}
