"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IoMdEye, IoMdEyeOff, IoMdPerson } from "react-icons/io";
import { useAuth } from "../hooks/use-auth";

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

        // Helper function to determine if input is email
        const isEmail = (input: string) => {
            return input.includes('@') && input.includes('.');
        };

        // Mock authentication - replace with actual API call
        try {
            if (emailOrUsername && password) {
                // Simulate API call delay
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Mock successful login - in real app, this would be handled by your backend
                const userEmail = isEmail(emailOrUsername) ? emailOrUsername : `${emailOrUsername}@example.com`;
                
                signIn({
                    id: 1,
                    name: "John Doe", // In real app, this would come from your backend response
                    email: userEmail
                });
                
                router.push("/"); // Redirect to home page
            } else {
                setError("กรุณากรอกชื่อผู้ใช้หรืออีเมล และรหัสผ่าน");
            }
        } catch {
            setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDemoSignIn = () => {
        signIn({
            id: 1,
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
                <div className="bg-white rounded-3xl border border-[#405168] shadow-sm p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Error Message */}
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Email or Username Input */}
                        <div>
                            <label htmlFor="emailOrUsername" className="block text-sm font-medium text-[#1c2a48] mb-2">
                                ชื่อผู้ใช้ หรือ อีเมล
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    id="emailOrUsername"
                                    value={emailOrUsername}
                                    onChange={(e) => setEmailOrUsername(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 border border-[#405168] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5e7593] focus:border-transparent text-[#1c2a48]"
                                    placeholder="ชื่อผู้ใช้ หรือ your@email.com"
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
                                    className="w-full pl-4 pr-12 py-3 border border-[#405168] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5e7593] focus:border-transparent text-[#1c2a48]"
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
                            className="w-full px-6 py-3 bg-[#405168] text-white rounded-3xl hover:bg-[#2d3a4c] disabled:bg-[#7a8b99] disabled:cursor-not-allowed transition-colors font-medium cursor-pointer"
                        >
                            {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                        </button>

                        {/* Demo Sign In */}
                        <div className="pt-4 border-t border-[#e0e7f1] text-center">
                            <p className="text-sm text-[#7a8b99] mb-3">สำหรับการทดสอบ:</p>
                            <button
                                type="button"
                                onClick={handleDemoSignIn}
                                className="w-full px-4 py-2 text-sm bg-[#e0e7f1] text-[#5e7593] rounded-full hover:bg-[#d1d9e4] transition-colors cursor-pointer"
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