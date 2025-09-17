import { validatePassword } from "../services/auth-service";
import { createAuthUser} from "../repositories/user-repo";

export async function signupController(email:string, password:string, firstname:string, lastname:string) {
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

    return { message: "Signup success" };
  } catch (err: any) {
    return { error: err.message };
  }
}
