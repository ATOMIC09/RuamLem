import { supabase } from "../supabase";

export enum Role {
  Admin = "admin",
  Member = "member",
  Guest = "guest",
}

export async function createAuthUser(email: string, password: string, firstName: string, lastName: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error("Failed to create user");

    const userId = data.user.id;

    try {
      await createProfile(userId, firstName, lastName);
      return userId;
    } catch (profileError) {

      await supabase.auth.admin.deleteUser(userId);
      throw profileError;
    }
  } catch (err) {
    console.error("Error creating auth user:", err);
    throw err;
  }
}



// export async function createAuthUser(email: string, password: string, firstName: string, lastName: string) {
//   // console.log(email, password);
//   const { data, error } = await supabase.auth.signUp({
//     email,
//     password: password,
//     // email_confirm: true
//   });

//   if (error) throw error;
//   else {     // rollback ถ้าสมัครไม่สำเร็จ
//     try {
//       await createProfile(data.user.id, firstName, lastName);
//       return data.user.id;
//     } catch (err) {
//       await supabase.auth.admin.deleteUser(data.user.id);
//       throw err;
//     }
//   }
// }

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
export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, message: error.message };
  }

  const { data: profile_data, error: profile_error } = await supabase
    .from("profiles")
    .select("*")
    .eq("uuid", data.user.id)
    .single();

  if (profile_error) {
    return { success: false, message: profile_error.message };
  }


  return {
    success: true,
    uuid: data.user.id,
    firstName: profile_data.first_name,
    lastName: profile_data.last_name,
    userRole: profile_data.user_role,
    session: data.session,
  };
}