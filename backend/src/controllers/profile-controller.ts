import { 
  getProfileByUserId, 
  getFullProfile,
  updateProfile,
  uploadAvatarFile 
} from "../repositories/profile-repo";

export async function getProfileController(userId: string) {
  try {
    if (!userId) {
      return { error: "User ID is required" };
    }

    const profile = await getFullProfile(userId);
    return { success: true, profile };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function updateProfileController(userId: string, data: {
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatarUrl?: string;
}) {
  try {
    if (!userId) {
      return { error: "User ID is required" };
    }

    const result = await updateProfile(userId, data);
    return { success: true, message: "Profile updated successfully", profile: result };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function uploadAvatarFileController(userId: string, file: File) {
  try {
    if (!userId) {
      return { error: "User ID is required" };
    }

    if (!file) {
      return { error: "File is required" };
    }

    const result = await uploadAvatarFile(userId, file);
    return { success: true, message: "Avatar uploaded successfully", profile: result };
  } catch (err: any) {
    return { error: err.message };
  }
}
