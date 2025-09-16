import { SlMagnifier } from "react-icons/sl";
import { LuListFilter } from "react-icons/lu";

export default function SearchBox() {
    return (
        <div className="w-full max-w-md">
            <div className="flex w-full bg-[#ebeef0] rounded-4xl py-2 px-4 font-semibold items-center gap-2">
                <SlMagnifier size={20} className="text-[#405168]" />
                <input
                    type="text"
                    placeholder="ค้นหา..."
                    className="text-[#405168] w-full bg-transparent focus:outline-none"
                />
                {/* Filter */}
                <button className="p-0.5 bg-white rounded-lg hover:bg-[#d1d5db] border-2 border-[#405168] cursor-pointer transition-colors">
                    <LuListFilter size={20} className="text-[#405168]" />
                </button>
            </div>
        </div>
    );
}