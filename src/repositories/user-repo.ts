import { supabase } from "../supabase";

export enum Role {
  Admin = "admin",
  Member = "member",
  Guest = "guest",
}
export async function createAuthUser(email: string, password: string, firstName: string, lastName: string) {
  // console.log(email, password);
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: password
  });
  if (error) throw error;
  else {     // rollback ถ้าสมัครไม่สำเร็จ
    try {
      await createProfile(data.user.id, firstName, lastName);
      return data.user.id;
    } catch (err) {
      await supabase.auth.admin.deleteUser(data.user.id);
      throw err;
    }
  }
}

// สร้าง profile 
export async function createProfile(id: string, firstName: string, lastName: string) {
  const { error } = await supabase.from("profiles").insert({
    uuid: id,
    first_name: firstName,
    last_name: lastName,
    user_role: Role.Member,
  });
  if (error) throw error;
  return true;
}