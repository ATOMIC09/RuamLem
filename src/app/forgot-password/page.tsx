"use client";

import { useState } from "react";
import Link from "next/link";
import { IoMdMail, IoMdArrowBack } from "react-icons/io";
import { FaCheckCircle } from "react-icons/fa";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isEmailSent, setIsEmailSent] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        // Basic email validation
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            setError("กรุณากรอกอีเมลที่ถูกต้อง");
            setIsLoading(false);
            return;
        }

        // Mock API call - replace with actual password reset logic
        try {
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Mock successful email sent
            setIsEmailSent(true);
        } catch {
            setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendEmail = async () => {
        setIsLoading(true);
        setError("");

        try {
            // Simulate resend API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            // You could show a toast or temporary message here
        } catch {
            setError("ไม่สามารถส่งอีเมลได้ กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsLoading(false);
        }
    };

    if (isEmailSent) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#f8f9fa] to-white flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    {/* Success Message */}
                    <div className="bg-white rounded-3xl border border-[#e0e7f1] shadow-sm p-8 text-center">
                        <div className="mb-6">
                            <FaCheckCircle className="text-5xl text-green-500 mx-auto mb-4" />
                            <h1 className="text-2xl font-bold text-[#1c2a48] mb-2">ส่งอีเมลแล้ว</h1>
                            <p className="text-[#7a8b99] leading-relaxed">
                                เราได้ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปยัง
                            </p>
                            <p className="font-medium text-[#1c2a48] mt-2">{email}</p>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-[#f0f4f8] rounded-2xl border border-[#e0e7f1]">
                                <p className="text-sm text-[#5e7593] leading-relaxed">
                                    📧 โปรดตรวจสอบกล่องจดหมายและโฟลเดอร์สแปมของคุณ
                                    <br />
                                    ⏰ ลิงก์จะหมดอายุใน 15 นาที
                                </p>
                            </div>

                            <button
                                onClick={handleResendEmail}
                                disabled={isLoading}
                                className="w-full px-6 py-3 bg-[#f0f4f8] text-[#5e7593] rounded-3xl hover:bg-[#e0e7f1] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium cursor-pointer border border-[#e0e7f1] shadow-sm"
                            >
                                {isLoading ? "กำลังส่ง..." : "ส่งอีเมลอีกครั้ง"}
                            </button>

                            <Link
                                href="/signin"
                                className="block w-full px-6 py-3 bg-[#405168] text-white rounded-3xl hover:bg-[#2d3a4c] transition-colors font-medium text-center shadow-sm hover:shadow-md"
                            >
                                กลับไปเข้าสู่ระบบ
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#f8f9fa] to-white flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                {/* Back Button */}
                <div className="mb-6">
                    <Link
                        href="/signin"
                        className="flex items-center gap-2 text-[#5e7593] hover:text-[#405168] transition-colors"
                    >
                        <IoMdArrowBack />
                        <span>กลับไปเข้าสู่ระบบ</span>
                    </Link>
                </div>

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-[#1c2a48] mb-2">ลืมรหัสผ่าน?</h1>
                    <p className="text-[#7a8b99] leading-relaxed">
                        กรอกอีเมลที่ใช้สมัครสมาชิก
                        <br />
                        เราจะส่งลิงก์สำหรับรีเซ็ตรหัสผ่านให้คุณ
                    </p>
                </div>

                {/* Forgot Password Form */}
                <div className="bg-white rounded-3xl border border-[#e0e7f1] shadow-sm p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Error Message */}
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Email Input */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-[#1c2a48] mb-2">
                                อีเมล
                            </label>
                            <div className="relative">
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 border border-[#e0e7f1] rounded-3xl focus:outline-none focus:ring-2 focus:ring-[#5e7593] focus:border-transparent text-[#1c2a48] shadow-sm hover:shadow-md transition-shadow"
                                    placeholder="your@email.com"
                                    required
                                />
                                <IoMdMail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#7a8b99]" size={20} />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full px-6 py-3 bg-[#405168] text-white rounded-3xl hover:bg-[#2d3a4c] disabled:bg-[#7a8b99] disabled:cursor-not-allowed transition-colors font-medium cursor-pointer shadow-sm hover:shadow-md"
                        >
                            {isLoading ? "กำลังส่ง..." : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
                        </button>

                        {/* Help Text */}
                        <div className="text-center">
                            <p className="text-sm text-[#7a8b99]">
                                จำรหัสผ่านได้แล้ว?{" "}
                                <Link href="/signin" className="text-[#405168] hover:text-[#5e7593] font-medium transition-colors">
                                    เข้าสู่ระบบ
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>

                {/* Additional Help */}
                <div className="mt-6 text-center">
                    <div className="p-4 bg-white rounded-2xl border border-[#e0e7f1] shadow-sm">
                        <p className="text-sm text-[#7a8b99] mb-2">
                            <strong className="text-[#1c2a48]">ต้องการความช่วยเหลือ?</strong>
                        </p>
                        <p className="text-sm text-[#7a8b99]">
                            หากคุณไม่ได้รับอีเมล หรือมีปัญหาอื่น ๆ
                            <br />
                            กรุณาติดต่อทีมสนับสนุนของเรา
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}