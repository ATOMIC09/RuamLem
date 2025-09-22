import { SlMagnifier } from "react-icons/sl";

export default function SearchBox() {
    return (
        <div className="w-full">
            <div className="flex w-full bg-[#ebeef0] rounded-4xl py-2 px-4 font-semibold items-center gap-2">
                <SlMagnifier size={20} className="text-[#405168]" />
                <input
                    type="text"
                    placeholder="ค้นหา..."
                    className="text-[#405168] w-full bg-transparent focus:outline-none"
                />
            </div>
            {/* Filter menu */}
            <div className="mt-2 text-sm text-[#5e7593] border rounded-3xl border-[#405168]">
                <div className="px-4 py-2">
                    รายวิชา
                </div>
                {/* Tag selection slider, hide slide bar */}
                <div className="overflow-x-auto whitespace-nowrap px-4 py-2">
                    {["คณิตศาสตร์", "ฟิสิกส์", "เคมี", "ชีวะ", "อังกฤษ", "สังคม", "ภาษาไทย", "อื่นๆ"].map((tag) => (
                        <button key={tag} className="inline-block bg-white text-[#405168] px-3 py-1 mr-2 mb-2 rounded-full border border-[#405168] hover:bg-[#d1d5db] cursor-pointer transition-colors">
                            {tag}
                        </button>
                    ))}
                </div>
                <div className="px-4 py-2">
                    วันที่
                </div>
                <div className="overflow-x-auto whitespace-nowrap px-4 py-2">
                    {["ล่าสุด", "วันนี้", "สัปดาห์นี้", "เดือนนี้", "ปีนี้"].map((tag) => (
                        <button key={tag} className="inline-block bg-white text-[#405168] px-3 py-1 mr-2 mb-2 rounded-full border border-[#405168] hover:bg-[#d1d5db] cursor-pointer transition-colors">
                            {tag}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}