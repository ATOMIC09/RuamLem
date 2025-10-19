"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/use-auth";
import LoadingSpinner from "../components/loading-spinner";
import Link from "next/link";
import { IoMdArrowBack, IoMdLogOut, IoMdMail, IoMdPerson } from "react-icons/io";

export default function ProfilePage() {
  const router = useRouter();
  const { isSignedIn, user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSigned, setIsSigned] = useState(false);

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
      setIsLoading(false);
    }
  }, [isSignedIn, router]);

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

        {/* Profile Card */}
        <div className="bg-white rounded-3xl border border-[#dee5ed] shadow-lg overflow-hidden">
          {/* Header Background */}
          <div className="h-32 bg-gradient-to-r from-[#405168] to-[#5e7593] relative">
            <div className="absolute bottom-0 left-0 right-0 flex justify-center">
              <div className="w-28 h-28 bg-white rounded-full border-4 border-[#f5f7fb] flex items-center justify-center shadow-lg transform translate-y-1/2">
                <IoMdPerson className="text-5xl text-[#405168]" />
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="px-8 pt-24 pb-8">
            {/* User Name */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-[#1c2a48] mb-2">
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-[#7a8b99] text-sm">โปรไฟล์ผู้ใช้</p>
            </div>

            {/* User Information */}
            <div className="space-y-6 mb-8">
              {/* Email */}
              <div className="flex items-center space-x-4 p-4 bg-[#f8f9fa] rounded-2xl hover:bg-[#f0f2f7] transition-colors">
                <IoMdMail className="text-2xl text-[#405168] flex-shrink-0" />
                <div>
                  <p className="text-xs text-[#7a8b99] mb-1">อีเมล</p>
                  <p className="text-[#1c2a48] font-medium break-all">{user.email}</p>
                </div>
              </div>

              {/* User ID */}
              <div className="flex items-center space-x-4 p-4 bg-[#f8f9fa] rounded-2xl hover:bg-[#f0f2f7] transition-colors">
                <IoMdPerson className="text-2xl text-[#405168] flex-shrink-0" />
                <div>
                  <p className="text-xs text-[#7a8b99] mb-1">รหัสผู้ใช้</p>
                  <p className="text-[#1c2a48] font-medium font-mono text-sm break-all">{user.id}</p>
                </div>
              </div>

              {/* First Name */}
              <div className="p-4 bg-[#f8f9fa] rounded-2xl">
                <label className="text-xs text-[#7a8b99] font-medium mb-2 block">
                  ชื่อจริง
                </label>
                <input
                  type="text"
                  value={user.firstName}
                  disabled
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
                  value={user.lastName}
                  disabled
                  className="w-full px-4 py-2 bg-white border border-[#dee5ed] rounded-lg text-[#1c2a48] text-sm disabled:bg-[#f8f9fa] disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[#dee5ed] my-8"></div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
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
            </div>

            {/* Info Section */}
            <div className="mt-8 p-4 bg-[#e8f0f7] rounded-2xl border border-[#d1dce9]">
              <p className="text-sm text-[#5e7593]">
                💡 <span className="font-medium">เคล็ดลับ:</span> ข้อมูลโปรไฟล์ของคุณเชื่อมต่อกับบัญชีของคุณ คุณสามารถแก้ไขข้อมูลได้ใน
                <a
                  href="#"
                  className="text-[#405168] font-medium hover:underline ml-1"
                >
                  การตั้งค่าบัญชี
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
