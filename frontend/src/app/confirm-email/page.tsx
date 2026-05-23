"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";

export default function ConfirmEmailPage() {
    const router = useRouter();
    const [isVerifying, setIsVerifying] = useState(true);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const verifyEmail = () => {
            // Check for hash parameters from Supabase redirect
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            
            // Check for error in hash
            const hashError = params.get('error');
            const errorDescription = params.get('error_description');
            
            if (hashError) {
                let errorMessage = 'การยืนยันอีเมลล้มเหลว';
                
                if (errorDescription) {
                    const decodedError = decodeURIComponent(errorDescription.replace(/\+/g, ' '));
                    if (decodedError.includes('expired')) {
                        errorMessage = 'ลิงก์ยืนยันหมดอายุแล้ว กรุณาลงทะเบียนใหม่';
                    } else if (decodedError.includes('invalid')) {
                        errorMessage = 'ลิงก์ยืนยันไม่ถูกต้อง';
                    } else {
                        errorMessage = decodedError;
                    }
                }
                
                setError(errorMessage);
                setIsVerifying(false);
                return;
            }
            
            // Check for access_token (success)
            const accessToken = params.get('access_token');
            const type = params.get('type');
            
            if (accessToken && type === 'signup') {
                // Email confirmed successfully
                setIsSuccess(true);
                setIsVerifying(false);
                
                // Auto-redirect to signin after 3 seconds
                setTimeout(() => {
                    router.push('/signin');
                }, 3000);
                return;
            }
            
            // No token found - might be direct access
            setError('ไม่พบข้อมูลการยืนยัน กรุณาคลิกลิงก์จากอีเมลอีกครั้ง');
            setIsVerifying(false);
        };

        verifyEmail();
    }, [router]);

    // Loading state
    if (isVerifying) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#f8f9fa] to-white flex items-center justify-center p-6">
                <div className="w-full max-w-md text-center">
                    <div className="bg-white rounded-3xl border border-[#e0e7f1] shadow-sm p-8">
                        <div className="w-12 h-12 border-4 border-[#405168] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <h1 className="text-xl font-bold text-[#1c2a48] mb-2">กำลังยืนยันอีเมล...</h1>
                        <p className="text-[#7a8b99] text-sm">กรุณารอสักครู่</p>
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
                        <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-[#1c2a48] mb-3">ยืนยันอีเมลสำเร็จ!</h1>
                        <p className="text-[#7a8b99] mb-6 leading-relaxed">
                            บัญชีของคุณได้รับการยืนยันแล้ว
                            <br />
                            คุณสามารถเข้าสู่ระบบได้แล้วตอนนี้
                        </p>

                        <div className="space-y-3">
                            <div className="p-4 bg-[#f0f4f8] rounded-2xl border border-[#e0e7f1]">
                                <p className="text-sm text-[#5e7593]">
                                    กำลังนำคุณไปยังหน้าเข้าสู่ระบบ...
                                </p>
                            </div>

                            <Link
                                href="/signin"
                                className="block w-full px-6 py-3 bg-[#405168] text-white rounded-3xl hover:bg-[#2d3a4c] transition-colors font-medium text-center shadow-sm hover:shadow-md"
                            >
                                เข้าสู่ระบบเลย
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#f8f9fa] to-white flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-3xl border border-[#e0e7f1] shadow-sm p-8 text-center">
                    <FaTimesCircle className="text-6xl text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-[#1c2a48] mb-3">เกิดข้อผิดพลาด</h1>
                    <p className="text-[#7a8b99] mb-6 leading-relaxed">
                        {error}
                    </p>

                    <div className="space-y-3">
                        <Link
                            href="/signup"
                            className="block w-full px-6 py-3 bg-[#405168] text-white rounded-3xl hover:bg-[#2d3a4c] transition-colors font-medium text-center shadow-sm hover:shadow-md"
                        >
                            ลงทะเบียนใหม่
                        </Link>
                        <Link
                            href="/signin"
                            className="block w-full px-6 py-3 bg-[#f0f4f8] text-[#5e7593] rounded-3xl hover:bg-[#e0e7f1] transition-colors font-medium text-center border border-[#e0e7f1]"
                        >
                            กลับไปหน้าเข้าสู่ระบบ
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
