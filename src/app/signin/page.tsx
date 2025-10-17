"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IoMdEye, IoMdEyeOff, IoMdPerson } from "react-icons/io";
import { useAuth } from "../hooks/use-auth";
import * as authService from "@/services/auth.service";

export default function SignInPage() {
    const [emailOrUsername, setEmailOrUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    
    const { signIn } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        // Validation
        if (!emailOrUsername || !password) {
            setError("กรุณากรอกอีเมลและรหัสผ่าน");
            setIsLoading(false);
            return;
        }

        // Call API
        try {
            const response = await authService.signIn({
                email: emailOrUsername, // The backend expects email
                password,
            });

            if (response.error) {
                // Show the backend error message (e.g., "Invalid login credentials")
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
                setError("การเข้าสู่ระบบล้มเหลว");
            }
        } catch {
            setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDemoSignIn = () => {
        signIn({
            id: "demo-user-id",
            name: "John Doe",
            email: "john@example.com"
        });
        router.push("/");
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#f8f9fa] to-white flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-[#1c2a48] mb-2">เข้าสู่ระบบ</h1>
                    <p className="text-[#7a8b99]">ยินดีต้อนรับกลับมา!</p>
                </div>

                {/* Sign In Form */}
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
                            <label htmlFor="emailOrUsername" className="block text-sm font-medium text-[#1c2a48] mb-2">
                                อีเมล
                            </label>
                            <div className="relative">
                                <input
                                    type="email"
                                    id="emailOrUsername"
                                    value={emailOrUsername}
                                    onChange={(e) => setEmailOrUsername(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 border border-[#e0e7f1] rounded-3xl focus:outline-none focus:ring-2 focus:ring-[#5e7593] focus:border-transparent text-[#1c2a48] shadow-sm hover:shadow-md transition-shadow"
                                    placeholder="your@email.com"
                                    required
                                />
                                <IoMdPerson className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#7a8b99]" size={20} />
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
                                    placeholder="••••••••"
                                    required
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

                        {/* Forgot Password */}
                        <div className="text-right">
                            <Link href="/forgot-password" className="text-sm text-[#5e7593] hover:text-[#405168] transition-colors">
                                ลืมรหัสผ่าน?
                            </Link>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full px-6 py-3 bg-[#405168] text-white rounded-3xl hover:bg-[#2d3a4c] disabled:bg-[#7a8b99] disabled:cursor-not-allowed transition-colors font-medium cursor-pointer shadow-sm hover:shadow-md"
                        >
                            {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                        </button>

                        {/* Demo Sign In */}
                        <div className="pt-4 border-t border-[#e0e7f1] text-center">
                            <p className="text-sm text-[#7a8b99] mb-3">สำหรับการทดสอบ:</p>
                            <button
                                type="button"
                                onClick={handleDemoSignIn}
                                className="w-full px-4 py-2 text-sm bg-[#f0f4f8] text-[#5e7593] rounded-3xl hover:bg-[#e0e7f1] hover:shadow-md transition-all cursor-pointer border border-[#e0e7f1] shadow-sm"
                            >
                                🧪 เข้าสู่ระบบทดสอบ
                            </button>
                        </div>
                    </form>
                </div>

                {/* Sign Up Link */}
                <div className="text-center mt-6">
                    <p className="text-[#7a8b99]">
                        ยังไม่มีบัญชี?{" "}
                        <Link href="/signup" className="text-[#405168] hover:text-[#5e7593] font-medium transition-colors">
                            สร้างบัญชีใหม่
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}