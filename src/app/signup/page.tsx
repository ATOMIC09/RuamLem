"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IoMdEye, IoMdEyeOff, IoMdPerson, IoMdMail } from "react-icons/io";
import { useAuth } from "../hooks/use-auth";
import * as authService from "@/services/auth.service";
import { validatePassword } from "@/lib/crypto";

export default function SignUpPage() {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [acceptTerms, setAcceptTerms] = useState(false);
    
    const { signIn } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        // Basic validation
        if (!firstName.trim()) {
            setError("กรุณากรอกชื่อ");
            setIsLoading(false);
            return;
        }

        if (!lastName.trim()) {
            setError("กรุณากรอกนามสกุล");
            setIsLoading(false);
            return;
        }

        if (!email) {
            setError("กรุณากรอกอีเมล");
            setIsLoading(false);
            return;
        }

        // Validate password
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            setError(passwordValidation.message || "รหัสผ่านไม่ถูกต้อง");
            setIsLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError("รหัสผ่านไม่ตรงกัน");
            setIsLoading(false);
            return;
        }

        if (!acceptTerms) {
            setError("กรุณายอมรับเงื่อนไขการใช้งาน");
            setIsLoading(false);
            return;
        }

        // Call API
        try {
            const response = await authService.signUp({
                email,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                password,
            });

            if (response.error) {
                // Show the backend error message
                setError(response.message || response.error);
                setIsLoading(false);
                return;
            }

            if (response.user && response.token) {
                // Sign in the user
                signIn({
                    id: response.user.id,
                    name: `${response.user.firstName} ${response.user.lastName}`,
                    email: response.user.email,
                    firstName: response.user.firstName,
                    lastName: response.user.lastName,
                }, response.token);
                
                router.push("/"); // Redirect to home page
            } else {
                setError("การลงทะเบียนสำเร็จ แต่ไม่สามารถเข้าสู่ระบบได้");
            }
        } catch {
            setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#f8f9fa] to-white flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-[#1c2a48] mb-2">สร้างบัญชีใหม่</h1>
                    <p className="text-[#7a8b99]">เริ่มต้นแชร์ความรู้กับเพื่อน ๆ</p>
                </div>

                {/* Sign Up Form */}
                <div className="bg-white rounded-3xl border border-[#e0e7f1] shadow-sm p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Error Message */}
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        {/* First Name Input */}
                        <div>
                            <label htmlFor="firstName" className="block text-sm font-medium text-[#1c2a48] mb-2">
                                ชื่อ
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    id="firstName"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 border border-[#e0e7f1] rounded-3xl focus:outline-none focus:ring-2 focus:ring-[#5e7593] focus:border-transparent text-[#1c2a48] shadow-sm hover:shadow-md transition-shadow"
                                    placeholder="ชื่อ"
                                    required
                                />
                                <IoMdPerson className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#7a8b99]" size={20} />
                            </div>
                        </div>

                        {/* Last Name Input */}
                        <div>
                            <label htmlFor="lastName" className="block text-sm font-medium text-[#1c2a48] mb-2">
                                นามสกุล
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    id="lastName"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 border border-[#e0e7f1] rounded-3xl focus:outline-none focus:ring-2 focus:ring-[#5e7593] focus:border-transparent text-[#1c2a48] shadow-sm hover:shadow-md transition-shadow"
                                    placeholder="นามสกุล"
                                    required
                                />
                                <IoMdPerson className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#7a8b99]" size={20} />
                            </div>
                        </div>

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

                        {/* Password Input */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-[#1c2a48] mb-2">
                                รหัสผ่าน
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-4 pr-12 py-3 border border-[#e0e7f1] rounded-3xl focus:outline-none focus:ring-2 focus:ring-[#5e7593] focus:border-transparent text-[#1c2a48] shadow-sm hover:shadow-md transition-shadow"
                                    placeholder="อย่างน้อย 8 ตัวอักษร (ต้องมีตัวอักษรและตัวเลข)"
                                    required
                                    minLength={8}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#7a8b99] hover:text-[#405168] transition-colors cursor-pointer"
                                >
                                    {showPassword ? <IoMdEyeOff size={20} /> : <IoMdEye size={20} />}
                                </button>
                            </div>
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
                                    className="w-full pl-4 pr-12 py-3 border border-[#e0e7f1] rounded-3xl focus:outline-none focus:ring-2 focus:ring-[#5e7593] focus:border-transparent text-[#1c2a48] shadow-sm hover:shadow-md transition-shadow"
                                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#7a8b99] hover:text-[#405168] transition-colors cursor-pointer"
                                >
                                    {showConfirmPassword ? <IoMdEyeOff size={20} /> : <IoMdEye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Terms and Conditions */}
                        <div className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                id="terms"
                                checked={acceptTerms}
                                onChange={(e) => setAcceptTerms(e.target.checked)}
                                className="mt-1 w-4 h-4 text-[#405168] bg-gray-100 border-[#e0e7f1] rounded focus:ring-[#5e7593] focus:ring-2 cursor-pointer"
                                required
                            />
                            <label htmlFor="terms" className="text-sm text-[#7a8b99]">
                                ฉันยอมรับ{" "}
                                <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#405168] hover:text-[#5e7593] underline">
                                    เงื่อนไขการใช้งาน
                                </Link>{" "}
                            </label>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full px-6 py-3 bg-[#405168] text-white rounded-3xl hover:bg-[#2d3a4c] disabled:bg-[#7a8b99] disabled:cursor-not-allowed transition-colors font-medium cursor-pointer shadow-sm hover:shadow-md"
                        >
                            {isLoading ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"}
                        </button>
                    </form>
                </div>

                {/* Sign In Link */}
                <div className="text-center mt-6">
                    <p className="text-[#7a8b99]">
                        มีบัญชีอยู่แล้ว?{" "}
                        <Link href="/signin" className="text-[#405168] hover:text-[#5e7593] font-medium transition-colors">
                            เข้าสู่ระบบ
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}