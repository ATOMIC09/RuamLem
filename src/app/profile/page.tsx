"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "../hooks/use-auth";
import LoadingSpinner from "../components/loading-spinner";
import Link from "next/link";
import { IoMdArrowBack, IoMdLogOut, IoMdMail, IoMdPerson, IoMdCreate } from "react-icons/io";
import * as profileService from "@/services/profile.service";

export default function ProfilePage() {
  const router = useRouter();
  const { isSignedIn, user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSigned, setIsSigned] = useState(false);
  const [profileData, setProfileData] = useState<profileService.UserProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    firstName: '',
    lastName: '',
    bio: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Redirect to home if not signed in
  useEffect(() => {
    if (isSignedIn === null) {
      // Still loading
      return;
    }
    if (!isSignedIn) {
      router.push("/");
    } else {
      setIsSigned(true);
      fetchProfile();
    }
  }, [isSignedIn, router]);

  // Fetch profile data from backend
  const fetchProfile = async () => {
    try {
      const result = await profileService.getProfile();
      if (result.error) {
        setErrorMessage(result.error);
        setIsLoading(false);
        return;
      }
      if (result.profile) {
        setProfileData(result.profile);
        setEditedData({
          firstName: result.profile.firstName,
          lastName: result.profile.lastName,
          bio: result.profile.bio || '',
        });
      }
    } catch {
      setErrorMessage('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = await profileService.updateProfile({
        firstName: editedData.firstName,
        lastName: editedData.lastName,
        bio: editedData.bio,
      });

      if (result.error) {
        setErrorMessage(result.error);
      } else if (result.profile) {
        setProfileData(result.profile);
        setSuccessMessage(result.message || 'อัปเดตโปรไฟล์สำเร็จ');
        setIsEditing(false);
        
        // Update localStorage with new user data
        const updatedUser = {
          ...user,
          firstName: result.profile.firstName,
          lastName: result.profile.lastName,
          name: `${result.profile.firstName} ${result.profile.lastName}`,
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Trigger auth state change event for navbar to update
        window.dispatchEvent(new Event('auth-state-changed'));
        
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch {
      setErrorMessage('เกิดข้อผิดพลาดขณะบันทึก');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = await profileService.uploadAvatar(file);
      if (result.error) {
        setErrorMessage(result.error);
      } else if (result.profile) {
        setProfileData(result.profile);
        setSuccessMessage(result.message || 'อัปโหลดรูปโปรไฟล์สำเร็จ');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch {
      setErrorMessage('เกิดข้อผิดพลาดขณะอัปโหลด');
    } finally {
      setIsUploadingAvatar(false);
      // Reset input
      if (e.target) e.target.value = '';
    }
  };

  const handleSignOut = async () => {
    signOut();
    router.push("/");
  };

  if (isLoading || !isSigned || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f5f7fb] to-[#eef1f8]">
        <LoadingSpinner size="lg" text="กำลังโหลดข้อมูลโปรไฟล์..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f7fb] to-[#eef1f8] py-8">
      <div className="container max-w-2xl mx-auto px-4">
        {/* Back Button */}
        <Link
          href="/"
          className="flex items-center space-x-2 text-[#405168] hover:text-[#5e7593] transition-colors mb-6"
        >
          <IoMdArrowBack size={20} />
          <span className="text-sm font-medium">กลับไปหน้าหลัก</span>
        </Link>

        {/* Messages */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-2xl">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-2xl">
            {errorMessage}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-3xl border border-[#dee5ed] shadow-lg overflow-hidden">
          {/* Header Background */}
          <div className="h-32 bg-gradient-to-r from-[#405168] to-[#5e7593] relative">
            <div className="absolute bottom-0 left-0 right-0 flex justify-center">
              <div className="w-28 h-28 bg-white rounded-full border-4 border-[#f5f7fb] flex items-center justify-center shadow-lg transform translate-y-1/2 relative group">
                {profileData?.avatarUrl ? (
                  <Image
                    src={profileData.avatarUrl}
                    alt="User avatar"
                    fill
                    className="rounded-full object-cover"
                  />
                ) : (
                  <IoMdPerson className="text-5xl text-[#405168]" />
                )}

                {/* Avatar Upload Button */}
                <label className="absolute bottom-0 right-0 bg-[#405168] text-white p-2 rounded-full cursor-pointer hover:bg-[#2d3a4c] transition-all shadow-md opacity-0 group-hover:opacity-100">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleAvatarChange}
                    disabled={isUploadingAvatar}
                    className="hidden"
                  />
                  <IoMdCreate className="text-lg" />
                </label>
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="px-8 pt-24 pb-8">
            {/* User Name */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-[#1c2a48] mb-2">
                {profileData?.firstName || user?.firstName} {profileData?.lastName || user?.lastName}
              </h1>
              <p className="text-[#7a8b99] text-sm">โปรไฟล์ผู้ใช้</p>
            </div>

            {/* User Information */}
            <div className="space-y-6 mb-8">
              {/* Email */}
              <div className="flex items-center space-x-4 p-4 bg-[#f8f9fa] rounded-2xl">
                <IoMdMail className="text-2xl text-[#405168] flex-shrink-0" />
                <div>
                  <p className="text-xs text-[#7a8b99] mb-1">อีเมล</p>
                  <p className="text-[#1c2a48] font-medium break-all">{user?.email}</p>
                </div>
              </div>

              {/* User ID */}
              <div className="flex items-center space-x-4 p-4 bg-[#f8f9fa] rounded-2xl">
                <IoMdPerson className="text-2xl text-[#405168] flex-shrink-0" />
                <div>
                  <p className="text-xs text-[#7a8b99] mb-1">รหัสผู้ใช้</p>
                  <p className="text-[#1c2a48] font-medium font-mono text-sm break-all">{user?.id}</p>
                </div>
              </div>

              {/* First Name */}
              <div className="p-4 bg-[#f8f9fa] rounded-2xl">
                <label className="text-xs text-[#7a8b99] font-medium mb-2 block">
                  ชื่อจริง
                </label>
                <input
                  type="text"
                  value={editedData.firstName}
                  onChange={(e) => setEditedData({ ...editedData, firstName: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 bg-white border border-[#dee5ed] rounded-lg text-[#1c2a48] text-sm disabled:bg-[#f8f9fa] disabled:cursor-not-allowed"
                />
              </div>

              {/* Last Name */}
              <div className="p-4 bg-[#f8f9fa] rounded-2xl">
                <label className="text-xs text-[#7a8b99] font-medium mb-2 block">
                  นามสกุล
                </label>
                <input
                  type="text"
                  value={editedData.lastName}
                  onChange={(e) => setEditedData({ ...editedData, lastName: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 bg-white border border-[#dee5ed] rounded-lg text-[#1c2a48] text-sm disabled:bg-[#f8f9fa] disabled:cursor-not-allowed"
                />
              </div>

              {/* Bio */}
              <div className="p-4 bg-[#f8f9fa] rounded-2xl">
                <label className="text-xs text-[#7a8b99] font-medium mb-2 block">
                  ประวัติสั้น
                </label>
                <textarea
                  value={editedData.bio}
                  onChange={(e) => setEditedData({ ...editedData, bio: e.target.value })}
                  disabled={!isEditing}
                  placeholder="บอกเล่าเกี่ยวกับตัวคุณ..."
                  className="w-full px-4 py-2 bg-white border border-[#dee5ed] rounded-lg text-[#1c2a48] text-sm disabled:bg-[#f8f9fa] disabled:cursor-not-allowed resize-none"
                  rows={3}
                />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[#dee5ed] my-8"></div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex-1 px-6 py-3 border border-[#405168] text-[#405168] rounded-3xl hover:bg-[#e8f0f7] transition-all font-medium shadow-sm bg-white"
                  >
                    แก้ไขโปรไฟล์
                  </button>
                  <Link
                    href="/community"
                    className="flex-1 px-6 py-3 border border-[#e0e7f1] text-[#405168] rounded-3xl hover:bg-[#f8f9fa] hover:shadow-md transition-all font-medium text-center shadow-sm bg-white"
                  >
                    ดูชุมชน
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-3xl transition-colors font-medium shadow-sm"
                  >
                    <IoMdLogOut size={20} />
                    <span>ออกจากระบบ</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-3xl transition-colors font-medium shadow-sm"
                  >
                    {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditedData({
                        firstName: profileData?.firstName || user?.firstName || '',
                        lastName: profileData?.lastName || user?.lastName || '',
                        bio: profileData?.bio || '',
                      });
                    }}
                    className="flex-1 px-6 py-3 border border-[#e0e7f1] text-[#405168] rounded-3xl hover:bg-[#f8f9fa] transition-all font-medium shadow-sm bg-white"
                  >
                    ยกเลิก
                  </button>
                </>
              )}
            </div>

            {/* Info Section */}
            <div className="p-4 bg-[#e8f0f7] rounded-2xl border border-[#d1dce9]">
              <p className="text-sm text-[#5e7593]">
                💡 <span className="font-medium">เคล็ดลับ:</span> คลิกที่ไอคอนกล้องบนรูปโปรไฟล์เพื่ออัปโหลดรูปใหม่ คลิก &quot;แก้ไขโปรไฟล์&quot; เพื่อแก้ไขชื่อและประวัติสั้น
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
