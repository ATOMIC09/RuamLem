import { GiOpenBook } from "react-icons/gi";
import Link from "next/link";

export default function Navbar() {
    return (
        <nav className="w-full h-16 px-6 bg-white text-[#405168] flex items-center justify-center border-b-2 border-[#dee5ed]">
            {/* Logo */}
            <div className="flex items-center space-x-2">
                <GiOpenBook className="text-2xl sm:text-3xl" />
                <span className="font-semibold text-lg sm:text-2xl">RuamLem</span>
            </div>
            {/* Menu */}
            <div className="ml-auto space-x-6 hidden md:flex items-center">
                <Link href="/" className="hover:text-[#5e7593] transition-colors">HOME</Link>
                <Link href="/community" className="hover:text-[#5e7593] transition-colors">COMMUNITY</Link>
                {/* Sign in */}
                <Link href="#" className="px-4 py-1 border border-[#405168] rounded-4xl hover:bg-[#405168] hover:text-white transition-colors">SIGN IN</Link>
            </div>
        </nav>
    );
}