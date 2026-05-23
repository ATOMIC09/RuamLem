import { supabase } from "../supabase";

export interface Profile {
  uuid: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  bio: string | null;
  user_role: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatarUrl?: string | null;
}

export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("uuid", userId)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Error fetching profile:", err);
    throw err;
  }
}

export async function getFullProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("uuid, first_name, last_name, avatar_url, bio, user_role, created_at, updated_at")
      .eq("uuid", userId)
      .single();

    if (error) throw error;

    return {
      uuid: data.uuid,
      firstName: data.first_name,
      lastName: data.last_name,
      avatarUrl: data.avatar_url,
      bio: data.bio,
      userRole: data.user_role,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    console.error("Error fetching full profile:", err);
    throw err;
  }
}

export async function updateProfile(userId: string, updateData: UpdateProfileData) {
  try {
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (updateData.firstName !== undefined) {
      updatePayload.first_name = updateData.firstName;
    }
    if (updateData.lastName !== undefined) {
      updatePayload.last_name = updateData.lastName;
    }
    if (updateData.bio !== undefined) {
      updatePayload.bio = updateData.bio;
    }
    if (updateData.avatarUrl !== undefined) {
      updatePayload.avatar_url = updateData.avatarUrl;
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("uuid", userId)
      .select()
      .single();

    if (error) throw error;

    return {
      uuid: data.uuid,
      firstName: data.first_name,
      lastName: data.last_name,
      avatarUrl: data.avatar_url,
      bio: data.bio,
      userRole: data.user_role,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    console.error("Error updating profile:", err);
    throw err;
  }
}

export async function uploadAvatarFile(userId: string, file: File) {
  try {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for avatar

    if (file.size > MAX_FILE_SIZE) {
      throw new Error("Avatar file size must be under 10MB");
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Only JPEG, PNG, WebP, and GIF images are allowed");
    }

    // Generate unique filename
    const timestamp = Date.now();
    const uniqueId = Math.random().toString(36).substr(2, 9);
    const fileExtension = file.type.split("/")[1];
    const fileName = `${userId}/${timestamp}_${uniqueId}.${fileExtension}`;

    console.log("📤 Uploading avatar:", fileName);

    // Upload to Supabase storage
    const { data, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (uploadError) {
      console.error("❌ Avatar upload error:", uploadError);
      throw uploadError;
    }

    console.log("✅ Avatar uploaded:", fileName);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const avatarUrl = urlData.publicUrl;

    // Update profile with new avatar URL
    const { data: profile, error: updateError } = await supabase
      .from("profiles")
      .update({ 
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq("uuid", userId)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Profile update error:", updateError);
      throw updateError;
    }

    console.log("✅ Profile updated with avatar URL");

    return {
      uuid: profile.uuid,
      firstName: profile.first_name,
      lastName: profile.last_name,
      avatarUrl: profile.avatar_url,
      bio: profile.bio,
      userRole: profile.user_role,
      updatedAt: profile.updated_at,
    };
  } catch (err) {
    console.error("Error uploading avatar:", err);
    throw err;
  }
}
