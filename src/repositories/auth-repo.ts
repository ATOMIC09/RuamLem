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
      options: {
        emailRedirectTo: 'http://localhost:3000/confirm-email'
      }
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


  
    // console.log(profile_data)
  if (profile_error) {
    return { success: false, message: profile_error.message };
  }
  return {
    success: true,
    uuid: data.user.id,
    firstName: profile_data.first_name,
    lastName: profile_data.last_name,
    avatarUrl: profile_data.avatar_url,
    bio: profile_data.bio,
    userRole: profile_data.user_role,
    session: data.session,
  };
}

export async function signOutWithSession(token:string) {
  const { error } = await supabase.auth.admin.signOut(token);
  if(!error){
    return {success:true};
  }
  else{
    return {
      success:false,
      error:error
    };
  }
}


export async function forgetPassword(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:3000/reset-password", 
    });

    if (error) throw error;

    return {
      status: 200,
      message: "ส่งอีเมลรีเซ็ตรหัสผ่านแล้ว กรุณาตรวจสอบกล่องจดหมายของคุณ",
    };
  } catch (err: any) {
    return {
      status: 500,
      message: err.message,
    };
  }
}

export async function updatePassword(token: string, newPassword: string) {
  try {
    // Set the session using the token from the reset link
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: token, // In recovery flow, both tokens are the same
    });

    if (sessionError) throw sessionError;

    // Update the password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) throw updateError;

    return {
      status: 200,
      message: "รหัสผ่านถูกอัปเดตเรียบร้อยแล้ว",
    };
  } catch (err: any) {
    return {
      status: 500,
      message: err.message,
    };
  }
}

export async function verifyResetToken(token: string) {
  try {
    // Verify the token by setting the session
    const { data, error } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: token,
    });

    if (error || !data.user) throw error || new Error("No user found");

    // Get user profile information
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("uuid", data.user.id)
      .single();

    return {
      status: 200,
      message: "Token is valid",
      user: {
        id: data.user.id,
        email: data.user.email,
        firstName: profile?.first_name || null,
        lastName: profile?.last_name || null,
        userRole: profile?.user_role || null
      },
    };
  } catch (err: any) {
    return {
      status: 400,
      message: "Invalid or expired token",
    };
  }
}

