"use client";

import Link from "next/link";
import { IoMdAdd, IoMdLock } from "react-icons/io";
import { useAuth } from "../hooks/use-auth";

interface PostButtonProps {
    variant?: 'primary' | 'secondary';
    className?: string;
    children: React.ReactNode;
}

export default function PostButton({ variant = 'primary', className = '', children }: PostButtonProps) {
    const { isSignedIn } = useAuth();

    const baseClasses = "flex items-center justify-center gap-2 px-8 py-4 rounded-3xl transition-colors text-lg font-medium";
    
    const variantClasses = {
        primary: "bg-[#405168] text-white hover:bg-[#2d3a4c]",
        secondary: "bg-white border-2 border-[#405168] text-[#405168] hover:bg-[#405168] hover:text-white"
    };

    // For disabled state, use a more visible style with dark background and light text
    const disabledClasses = "bg-[#6b7280] text-white cursor-not-allowed hover:bg-[#6b7280] border-2 border-[#6b7280]";

    if (isSignedIn) {
        return (
            <Link
                href="/post"
                className={`${baseClasses} ${className || variantClasses[variant]}`}
            >
                <IoMdAdd size={20} />
                {children}
            </Link>
        );
    }

    return (
        <div 
            className={`${baseClasses} ${disabledClasses}`}
            title="กรุณาเข้าสู่ระบบเพื่อสร้างโพสต์"
        >
            <IoMdLock size={20} />
            {children} (เข้าสู่ระบบ)
        </div>
    );
}