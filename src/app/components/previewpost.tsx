import Image from "next/image";
import { IoMdPricetag } from "react-icons/io";
import { GoPaperclip } from "react-icons/go";

export default function PreviewPost() {
    return (
        <div className="w-full bg-white p-6 rounded-3xl shadow-sm border border-[#e0e7f1] text-[#5e7593] hover:shadow-md transition-shadow cursor-pointer">
            {/* Author */}
            <div className="flex items-center mb-4">
                <Image
                    src="/anonym.jpg"
                    alt="Author"
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full mr-3"
                />
                {/* Username and Postdate */}
                <div className="flex-grow">
                    <div className="font-bold text-[#1c2a48]">John Doe</div>
                    <div className="text-sm text-[#7a8b99]">วันศุกร์ เวลา 13:40 น.</div>
                </div>
                {/* Post tags */}
                <div className="flex-shrink-0">
                    <span className="px-3 py-1 text-xs bg-[#f0f4f8] text-[#5e7593] rounded-full border border-[#e0e7f1]">
                        <IoMdPricetag className="inline-block mr-1" />
                        Software Engineering
                    </span>
                </div>
            </div>
            {/* Post content */}
            {/* Title */}
            <div className="mb-4">
                <h2 className="text-xl font-bold text-[#1c2a48] line-clamp-2">สรุปมิดเทอมวิชา SoftEng</h2>
            </div>
            {/* PDF Attachments download button*/}
            <div className="pt-2 border-t border-[#f0f4f8]">
                <button className="flex items-center px-4 py-2 bg-[#f8f9fa] text-[#5e7593] rounded-2xl hover:bg-[#e0e7f1] transition-colors w-full justify-center border border-[#e0e7f1] group cursor-pointer">
                    <GoPaperclip className="mr-2 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium truncate">Midterm Note.pdf</span>
                </button>
            </div>

        </div>
    );
}