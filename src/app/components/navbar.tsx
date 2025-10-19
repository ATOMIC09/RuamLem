"use client";

import { GiOpenBook } from "react-icons/gi";
import { IoMdMenu, IoMdClose, IoMdPerson, IoMdLogOut } from "react-icons/io";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../hooks/use-auth";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import * as profileService from "@/services/profile.service";

export default function Navbar() {
    const { isSignedIn, user, signOut, signIn } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showSignInModal, setShowSignInModal] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);
    const pathname = usePathname();
    const [, setForceUpdate] = useState(0);

    // Fetch avatar when user changes
    useEffect(() => {
        if (isSignedIn && user) {
            fetchUserAvatar();
        } else {
            setAvatarUrl(null);
        }
    }, [isSignedIn, user]);

    // Fetch profile to get avatar
    const fetchUserAvatar = async () => {
        setIsLoadingAvatar(true);
        try {
            const result = await profileService.getProfile();
            if (result.profile?.avatarUrl) {
                setAvatarUrl(result.profile.avatarUrl);
            }
        } catch {
            // Silent fail - will show default icon
        } finally {
            setIsLoadingAvatar(false);
        }
    };

    // Close mobile menu and force auth check when route changes
    useEffect(() => {
        setIsMobileMenuOpen(false);
        // Force a re-render to check auth state after navigation
        setForceUpdate(prev => prev + 1);
    }, [pathname]);

    // Handle demo sign in
    const handleDemoSignIn = () => {
        signIn(
            {
                id: 'demo-uuid-1234-5678-abcd-efgh',
                name: 'Demo User',
                email: 'demo@example.com',
                firstName: 'Demo',
                lastName: 'User'
            }, 'demo-token-12345'
        );
        setShowSignInModal(false);
    };

    // Handle sign out
    const handleSignOut = () => {
        signOut();
        setIsMobileMenuOpen(false);
    };

    return (
        <>
            <nav className="w-full h-16 px-6 bg-white text-[#405168] flex items-center justify-between border-b-2 border-[#dee5ed] sticky top-0 z-50">
                {/* Logo */}
                <Link href="/" className="flex items-center space-x-2 hover:text-[#5e7593] transition-colors">
                    <GiOpenBook className="text-2xl sm:text-3xl" />
                    <span className="font-semibold text-lg sm:text-2xl">RuamLem</span>
                </Link>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center space-x-6">
                    <Link href="/" className={`hover:text-[#5e7593] transition-colors text-base ${pathname === '/' ? 'font-bold text-[#1c2a48]' : 'font-medium'
                        }`}>
                        หน้าหลัก
                    </Link>
                    <Link href="/community" className={`hover:text-[#5e7593] transition-colors text-base ${pathname === '/community' ? 'font-bold text-[#1c2a48]' : 'font-medium'
                        }`}>
                        ชุมชน
                    </Link>

                    {/* Authentication Section */}
                    {isSignedIn === null ? (
                        // Loading state
                        <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-[#405168] border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm text-[#7a8b99]">กำลังโหลด...</span>
                        </div>
                    ) : isSignedIn ? (
                        // Signed in state - User Profile Card
                        <div className="relative group">
                            <button className="flex items-center space-x-3 px-4 py-2 bg-gradient-to-r from-[#405168] to-[#5e7593] text-white rounded-full hover:shadow-lg transition-all">
                                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center overflow-hidden relative">
                                    {avatarUrl ? (
                                        <Image
                                            src={avatarUrl}
                                            alt="User avatar"
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <IoMdPerson size={18} />
                                    )}
                                </div>
                                <span className="font-medium text-sm">{user?.firstName}</span>
                            </button>

                            {/* Dropdown Menu */}
                            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#dee5ed] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                {/* User Info Section */}
                                <div className="p-4 border-b border-[#dee5ed]">
                                    <div className="flex items-center space-x-3 mb-3">
                                        <div className="w-12 h-12 bg-gradient-to-br from-[#405168] to-[#5e7593] rounded-full flex items-center justify-center text-white overflow-hidden relative">
                                            {avatarUrl ? (
                                                <Image
                                                    src={avatarUrl}
                                                    alt="User avatar"
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <IoMdPerson size={24} />
                                            )}
                                        </div>
                                        <div className="truncate">
                                            <p className="font-semibold text-[#1c2a48]">{user?.name}</p>
                                            <p className="text-xs text-[#7a8b99]">{user?.email}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Section */}
                                <div className="p-3 space-y-2">
                                    <Link
                                        href="/profile"
                                        className="flex items-center space-x-3 px-4 py-3 text-[#405168] hover:bg-[#f8f9fa] rounded-xl transition-colors group/item"
                                    >
                                        <IoMdPerson size={18} className="text-[#5e7593]" />
                                        <span className="font-medium text-sm">โปรไฟล์ของฉัน</span>
                                    </Link>

                                    <button
                                        onClick={handleSignOut}
                                        className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                                    >
                                        <IoMdLogOut size={18} />
                                        <span className="font-medium text-sm">ออกจากระบบ</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Not signed in state
                        <button
                            onClick={() => setShowSignInModal(true)}
                            className="px-4 py-2 border border-[#e0e7f1] rounded-3xl hover:bg-[#f8f9fa] hover:shadow-md transition-all text-base font-medium cursor-pointer shadow-sm bg-white text-[#405168]"
                        >
                            เข้าสู่ระบบ
                        </button>
                    )}
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden p-2"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <IoMdClose size={24} /> : <IoMdMenu size={24} />}
                </button>
            </nav>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <div className="fixed inset-0 bg-black opacity-50" onClick={() => setIsMobileMenuOpen(false)}></div>
                    <div className="fixed top-16 left-0 right-0 bg-white border-b-2 border-[#dee5ed] shadow-lg">
                        <div className="px-6 py-4 space-y-4">
                            <Link
                                href="/"
                                className={`block py-2 text-[#405168] hover:text-[#5e7593] transition-colors text-base ${pathname === '/' ? 'font-bold' : 'font-medium'
                                    }`}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                หน้าหลัก
                            </Link>
                            <Link
                                href="/community"
                                className={`block py-2 text-[#405168] hover:text-[#5e7593] transition-colors text-base ${pathname === '/community' ? 'font-bold' : 'font-medium'
                                    }`}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                ชุมชน
                            </Link>

                            <div className="pt-4 border-t border-[#dee5ed]">
                                {isSignedIn === null ? (
                                    <div className="flex items-center space-x-2 py-2">
                                        <div className="w-4 h-4 border-2 border-[#405168] border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-sm text-[#7a8b99]">กำลังโหลด...</span>
                                    </div>
                                ) : isSignedIn ? (
                                    <div className="space-y-3">
                                        {/* User Info Card */}
                                        <div className="bg-gradient-to-r from-[#405168] to-[#5e7593] text-white p-4 rounded-2xl mb-3">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center overflow-hidden relative">
                                                    {avatarUrl ? (
                                                        <Image
                                                            src={avatarUrl}
                                                            alt="User avatar"
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <IoMdPerson size={24} />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-semibold">{user?.name}</p>
                                                    <p className="text-xs text-gray-200">{user?.email}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <Link
                                            href="/profile"
                                            className="flex items-center space-x-2 w-full px-4 py-3 border border-[#e0e7f1] text-[#405168] rounded-xl hover:bg-[#f8f9fa] transition-all font-medium shadow-sm bg-white"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            <IoMdPerson size={18} />
                                            <span>โปรไฟล์ของฉัน</span>
                                        </Link>
                                        <button
                                            onClick={handleSignOut}
                                            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors font-medium shadow-sm"
                                        >
                                            <IoMdLogOut size={18} />
                                            <span>ออกจากระบบ</span>
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setShowSignInModal(true);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className="w-full px-4 py-2 border border-[#e0e7f1] rounded-3xl hover:bg-[#f8f9fa] hover:shadow-md transition-all text-base font-medium shadow-sm bg-white text-[#405168]"
                                    >
                                        เข้าสู่ระบบ
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sign In Modal */}
            {showSignInModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black opacity-50" onClick={() => setShowSignInModal(false)}></div>
                    <div className="relative bg-white rounded-3xl border border-[#e0e7f1] shadow-xl max-w-md w-full p-8">
                        <button
                            onClick={() => setShowSignInModal(false)}
                            className="absolute top-4 right-4 p-2 text-[#7a8b99] hover:text-[#405168] transition-colors cursor-pointer"
                        >
                            <IoMdClose size={20} />
                        </button>

                        <div className="text-center">
                            <div className="text-4xl mb-4">🔐</div>
                            <h2 className="text-2xl font-bold text-[#1c2a48] mb-4">เข้าสู่ระบบ</h2>
                            <p className="text-[#7a8b99] mb-6">เข้าสู่ระบบเพื่อเริ่มแชร์ความรู้</p>

                            <div className="space-y-4">
                                <Link
                                    href="/signin"
                                    className="block w-full px-6 py-3 bg-[#405168] text-white rounded-3xl hover:bg-[#2d3a4c] transition-colors font-medium"
                                    onClick={() => setShowSignInModal(false)}
                                >
                                    เข้าสู่ระบบ
                                </Link>

                                <Link
                                    href="/signup"
                                    className="block w-full px-6 py-3 border border-[#e0e7f1] text-[#405168] rounded-3xl hover:bg-[#f8f9fa] hover:shadow-md transition-all font-medium shadow-sm bg-white"
                                    onClick={() => setShowSignInModal(false)}
                                >
                                    สร้างบัญชีใหม่
                                </Link>

                                {/* Demo Sign In */}
                                <div className="pt-4 border-t border-[#e0e7f1]">
                                    <p className="text-sm text-[#7a8b99] mb-3">สำหรับการทดสอบ:</p>
                                    <button
                                        onClick={handleDemoSignIn}
                                        className="w-full px-4 py-2 text-sm bg-[#e0e7f1] text-[#5e7593] rounded-full hover:bg-[#d1d9e4] transition-colors cursor-pointer"
                                    >
                                        🧪 เข้าสู่ระบบทดสอบ
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}