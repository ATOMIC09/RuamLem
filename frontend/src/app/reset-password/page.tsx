"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IoMdLock, IoMdEye, IoMdEyeOff } from "react-icons/io";
import { FaCheckCircle } from "react-icons/fa";
import * as authService from "@/services/auth.service";
import { validatePassword } from "@/lib/crypto";

export default function ResetPasswordPage() {
    const router = useRouter();

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState("");
    const [isValidatingToken, setIsValidatingToken] = useState(true);
    const [isTokenValid, setIsTokenValid] = useState(false);
    const [accessToken, setAccessToken] = useState<string | null>(null);

    // Check for Supabase URL fragments (hash parameters)
    useEffect(() => {
        const checkUrlFragments = () => {
            // Check for hash parameters (Supabase redirects with #access_token or #error)
            const hash = window.location.hash.substring(1); // Remove the # symbol
            const params = new URLSearchParams(hash);
            
            // Check for error in hash
            const hashError = params.get('error');
            const errorDescription = params.get('error_description');
            
            if (hashError) {
                let errorMessage = 'ลิงก์หมดอายุหรือไม่ถูกต้อง';
                
                if (errorDescription) {
                    const decodedError = decodeURIComponent(errorDescription.replace(/\+/g, ' '));
                    if (decodedError.includes('expired')) {
                        errorMessage = 'ลิงก์หมดอายุแล้ว กรุณาขอรีเซ็ตรหัสผ่านใหม่';
                    } else if (decodedError.includes('invalid')) {
                        errorMessage = 'ลิงก์ไม่ถูกต้อง กรุณาคลิกลิงก์จากอีเมลอีกครั้ง';
                    } else {
                        errorMessage = decodedError;
                    }
                }
                
                setError(errorMessage);
                setIsTokenValid(false);
                setIsValidatingToken(false);
                return;
            }
            
            // Check for access_token in hash (Supabase success redirect)
            const hashAccessToken = params.get('access_token');
            
            if (hashAccessToken) {
                setAccessToken(hashAccessToken);
                setIsTokenValid(true);
                setIsValidatingToken(false);
                return;
            }
            
            // No token found
            setError("ไม่พบรหัสยืนยัน กรุณาคลิกลิงก์จากอีเมลอีกครั้ง");
            setIsTokenValid(false);
            setIsValidatingToken(false);
        };

        checkUrlFragments();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        // Validate password
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.valid) {
            setError(passwordValidation.message || "รหัสผ่านไม่ถูกต้อง");
            setIsLoading(false);
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("รหัสผ่านไม่ตรงกัน");
            setIsLoading(false);
            return;
        }

        if (!accessToken) {
            setError("ไม่พบรหัสยืนยัน");
            setIsLoading(false);
            return;
        }

        // Call API with the access token from Supabase
        try {
            const response = await authService.resetPassword(accessToken, newPassword);

            if (response.error) {
                setError(response.message || response.error);
                setIsLoading(false);
                return;
            }

            setIsSuccess(true);
            
            // Redirect to signin after 3 seconds
            setTimeout(() => {
                router.push("/signin");
            }, 3000);
        } catch {
            setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsLoading(false);
        }
    };

    // Loading state while validating token
    if (isValidatingToken) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#f8f9fa] to-white flex items-center justify-center p-6">
                <div className="w-full max-w-md text-center">
                    <div className="bg-white rounded-3xl border border-[#e0e7f1] shadow-sm p-8">
                        <div className="w-12 h-12 border-4 border-[#405168] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-[#7a8b99]">กำลังตรวจสอบลิงก์...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Invalid token state
    if (!isTokenValid) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#f8f9fa] to-white flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-3xl border border-[#e0e7f1] shadow-sm p-8 text-center">
                        <div className="text-5xl mb-4">❌</div>
                        <h1 className="text-2xl font-bold text-[#1c2a48] mb-4">ลิงก์ไม่ถูกต้อง</h1>
                        <p className="text-[#7a8b99] mb-6">{error}</p>
                        <div className="space-y-3">
                            <Link
                                href="/forgot-password"
                                className="block w-full px-6 py-3 bg-[#405168] text-white rounded-3xl hover:bg-[#2d3a4c] transition-colors font-medium text-center shadow-sm hover:shadow-md"
                            >
                                ขอรีเซ็ตรหัสผ่านใหม่
                            </Link>
                            <Link
                                href="/signin"
                                className="block w-full px-6 py-3 bg-[#f0f4f8] text-[#5e7593] rounded-3xl hover:bg-[#e0e7f1] transition-colors font-medium text-center border border-[#e0e7f1]"
                            >
                                กลับไปเข้าสู่ระบบ
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Success state
    if (isSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#f8f9fa] to-white flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-3xl border border-[#e0e7f1] shadow-sm p-8 text-center">
                        <FaCheckCircle className="text-5xl text-green-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-[#1c2a48] mb-2">เปลี่ยนรหัสผ่านสำเร็จ!</h1>
                        <p className="text-[#7a8b99] mb-6">คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้แล้ว</p>
                        <div className="text-sm text-[#7a8b99]">
                            กำลังนำคุณไปยังหน้าเข้าสู่ระบบ...
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#f8f9fa] to-white flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-[#1c2a48] mb-2">ตั้งรหัสผ่านใหม่</h1>
                    <p className="text-[#7a8b99] leading-relaxed">
                        กรุณากรอกรหัสผ่านใหม่ของคุณ
                    </p>
                </div>

                {/* Reset Password Form */}
                <div className="bg-white rounded-3xl border border-[#e0e7f1] shadow-sm p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Error Message */}
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        {/* New Password Input */}
                        <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-[#1c2a48] mb-2">
                                รหัสผ่านใหม่
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="newPassword"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="กรอกรหัสผ่านใหม่"
                                    required
                                    className="w-full px-4 py-3 pl-12 pr-12 border border-[#e0e7f1] rounded-3xl focus:outline-none focus:ring-2 focus:ring-[#405168] focus:border-transparent transition-all"
                                />
                                <IoMdLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#7a8b99] text-xl" />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#7a8b99] hover:text-[#405168] transition-colors cursor-pointer"
                                >
                                    {showPassword ? <IoMdEyeOff className="text-xl" /> : <IoMdEye className="text-xl" />}
                                </button>
                            </div>
                            <p className="mt-2 text-xs text-[#7a8b99]">
                                รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวอักษรและตัวเลข
                            </p>
                        </div>

                        {/* Confirm Password Input */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#1c2a48] mb-2">
                                ยืนยันรหัสผ่าน
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    id="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                                    required
                                    className="w-full px-4 py-3 pl-12 pr-12 border border-[#e0e7f1] rounded-3xl focus:outline-none focus:ring-2 focus:ring-[#405168] focus:border-transparent transition-all"
                                />
                                <IoMdLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#7a8b99] text-xl" />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#7a8b99] hover:text-[#405168] transition-colors cursor-pointer"
                                >
                                    {showConfirmPassword ? <IoMdEyeOff className="text-xl" /> : <IoMdEye className="text-xl" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full px-6 py-3 bg-[#405168] text-white rounded-3xl hover:bg-[#2d3a4c] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium cursor-pointer shadow-sm"
                        >
                            {isLoading ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
                        </button>

                        {/* Back to Sign In */}
                        <div className="text-center">
                            <Link
                                href="/signin"
                                className="text-sm text-[#5e7593] hover:text-[#405168] transition-colors"
                            >
                                กลับไปเข้าสู่ระบบ
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
