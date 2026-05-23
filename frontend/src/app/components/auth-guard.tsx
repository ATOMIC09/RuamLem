"use client";

import { useAuth } from "../hooks/use-auth";

interface AuthGuardProps {
  children: React.ReactNode;
  required?: boolean; // If true, requires authentication. Default is true
}

export default function AuthGuard({ children, required = true }: AuthGuardProps) {
    const { isSignedIn, signIn } = useAuth();

    // Loading state
    if (isSignedIn === null) {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#405168]"></div>
                <p className="mt-4 text-[#7a8b99]">กำลังตรวจสอบการเข้าสู่ระบบ...</p>
            </div>
        );
    }

    // If auth is not required, show content regardless of auth state
    if (!required) {
        return <>{children}</>;
    }

    // Not signed in and auth is required - show sign in prompt
    if (!isSignedIn && required) {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center p-8">
                <div className="w-full max-w-2xl mx-auto">
                    {/* Hero Section */}
                    <div className="text-center mb-12">
                        <div className="text-8xl mb-6">🔒</div>
                        <h1 className="text-4xl font-bold text-[#1c2a48] mb-3">เข้าสู่ระบบเพื่อดำเนินการต่อ</h1>
                        <p className="text-lg text-[#7a8b99]">คุณจำเป็นต้องเข้าสู่ระบบก่อนที่จะสร้างโพสต์ใหม่</p>

                    </div>
                </div>
            </div>
        );
    }

    // Signed in - show protected content
    return <>{children}</>;
}