import { GiOpenBook } from "react-icons/gi";

export default function Navbar() {
    return (
        <nav className="w-full h-16 px-6 bg-white text-[#405168] flex items-center justify-center border-b-2 border-[#dee5ed]">
            {/* Logo */}
            <div className="flex items-center space-x-2">
                <GiOpenBook className="text-2xl sm:text-3xl" />
                <span className="font-semibold text-lg sm:text-2xl">RuamLem</span>
            </div>
            {/* Menu */}
            <div className="ml-auto mr-8 space-x-6 hidden md:flex items-center">
                <a href="#" className="hover:text-[#5e7593] transition-colors">HOME</a>
                <a href="#" className="hover:text-[#5e7593] transition-colors">COMMUNITY</a>
                {/* Sign in */}
                <a href="#" className="px-4 py-1 border-2 border-[#405168] rounded-4xl hover:bg-[#405168] hover:text-white transition-colors">SIGN IN</a>
            </div>
        </nav>
    );
}