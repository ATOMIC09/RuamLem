"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/use-auth";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { isSignedIn, signIn } = useAuth();
    const router = useRouter();

    // Loading state
    if (isSignedIn === null) {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#405168]"></div>
                <p className="mt-4 text-[#7a8b99]">กำลังตรวจสอบการเข้าสู่ระบบ...</p>
            </div>
        );
    }

    // Not signed in - show sign in prompt
    if (!isSignedIn) {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center p-8">
                <div className="w-full max-w-md mx-auto p-8 text-center bg-white border rounded-3xl border-[#405168] shadow-sm">
                    <div className="text-6xl mb-6">🔒</div>
                    <h1 className="text-3xl font-bold text-[#1c2a48] mb-4">เข้าสู่ระบบเพื่อดำเนินการต่อ</h1>
                    <p className="text-[#7a8b99] mb-8">คุณจำเป็นต้องเข้าสู่ระบบก่อนที่จะสร้างโพสต์ใหม่</p>
                    
                    <div className="space-y-4">
                        <Link 
                            href="/signin"
                            className="block w-full px-6 py-3 bg-[#405168] text-white rounded-3xl hover:bg-[#2d3a4c] transition-colors font-medium"
                        >
                            เข้าสู่ระบบ
                        </Link>
                        
                        <Link 
                            href="/signup"
                            className="block w-full px-6 py-3 border border-[#405168] text-[#405168] rounded-3xl hover:bg-[#f8f9fa] transition-colors font-medium"
                        >
                            สร้างบัญชีใหม่
                        </Link>
                        
                        <button
                            onClick={() => router.back()}
                            className="w-full px-6 py-3 text-[#7a8b99] hover:text-[#405168] transition-colors cursor-pointer"
                        >
                            ย้อนกลับ
                        </button>
                    </div>

                    {/* Demo purposes - temporary sign in button */}
                    <div className="mt-8 pt-6 border-t border-[#e0e7f1]">
                        <p className="text-sm text-[#7a8b99] mb-4">สำหรับการทดสอบ:</p>
                        <button
                            onClick={() => {
                                signIn({
                                    id: 'demo-uuid-1234-5678-abcd-efgh',
                                    name: 'Demo User',
                                    email: 'demo@example.com',
                                    firstName: 'Demo',
                                    lastName: 'User'
                                }, 'demo-token-12345');
                            }}
                            className="px-4 py-2 text-sm bg-[#e0e7f1] text-[#5e7593] rounded-full hover:bg-[#d1d9e4] transition-colors cursor-pointer"
                        >
                            🧪 เข้าสู่ระบบทดสอบ
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Signed in - show protected content
    return <>{children}</>;
}