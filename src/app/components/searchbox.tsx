import { SlMagnifier } from "react-icons/sl";

export default function SearchBox() {
    return (
        <div className="w-full">
            <div className="flex w-full bg-white rounded-3xl py-3 px-4 font-medium items-center gap-3 shadow-sm border border-[#e0e7f1] hover:shadow-md transition-shadow">
                <SlMagnifier size={20} className="text-[#5e7593]" />
                <input
                    type="text"
                    placeholder="ค้นหาโพสต์, วิชา, หรือคำสำคัญ..."
                    className="text-[#1c2a48] w-full bg-transparent focus:outline-none placeholder-[#7a8b99]"
                />
            </div>
            {/* Filter menu */}
            <div className="mt-4 bg-white rounded-3xl border border-[#e0e7f1] shadow-sm">
                <div className="px-6 py-3 border-b border-[#f0f4f8]">
                    <span className="text-sm font-semibold text-[#1c2a48]">รายวิชา</span>
                </div>
                {/* Tag selection slider, hide slide bar */}
                <div className="overflow-x-auto whitespace-nowrap px-6 py-3 scrollbar-hide">
                    {["คณิตศาสตร์", "ฟิสิกส์", "เคมี", "ชีวะ", "อังกฤษ", "สังคม", "ภาษาไทย", "อื่นๆ"].map((tag) => (
                        <button key={tag} className="inline-block bg-[#f0f4f8] text-[#5e7593] px-4 py-2 mr-3 mb-2 rounded-full border border-[#e0e7f1] hover:bg-[#e0e7f1] hover:shadow-sm cursor-pointer transition-all font-medium">
                            {tag}
                        </button>
                    ))}
                </div>
                <div className="px-6 py-3 border-b border-t border-[#f0f4f8]">
                    <span className="text-sm font-semibold text-[#1c2a48]">วันที่</span>
                </div>
                <div className="overflow-x-auto whitespace-nowrap px-6 py-3 scrollbar-hide">
                    {["ล่าสุด", "วันนี้", "สัปดาห์นี้", "เดือนนี้", "ปีนี้"].map((tag) => (
                        <button key={tag} className="inline-block bg-[#f0f4f8] text-[#5e7593] px-4 py-2 mr-3 mb-2 rounded-full border border-[#e0e7f1] hover:bg-[#e0e7f1] hover:shadow-sm cursor-pointer transition-all font-medium">
                            {tag}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}