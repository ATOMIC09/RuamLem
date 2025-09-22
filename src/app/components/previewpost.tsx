import Image from "next/image";
import { IoMdPricetag } from "react-icons/io";
import { GoPaperclip } from "react-icons/go";

export default function PreviewPost() {
    return (
        <div className="w-full p-4 text-[#5e7593] border rounded-3xl border-[#405168] bg-white">
            {/* Author */}
            <div className="flex items-center mb-2">
                <Image
                    src="/anonym.jpg"
                    alt="Author"
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full mr-2"
                />
                {/* Username and Postdate */}
                <div className="flex-grow">
                    <div className="font-bold text-[#1c2a48]">John Doe</div>
                    <div className="text-sm text-[#7a8b99]">วันศุกร์ เวลา 13:40 น.</div>
                </div>
                {/* Post tags */}
                <div className="flex-shrink-0">
                    <span className="px-2 py-1 text-xs bg-[#e0e7f1] text-[#5e7593] rounded-full">
                        <IoMdPricetag className="inline-block mr-1" />
                        Software Engineering
                    </span>
                </div>
            </div>
            {/* Post content */}
            {/* Title */}
            <div className="mb-2">
                <h2 className="text-2xl font-semibold text-[#1c2a48]">สรุปมิดเทอมวิชา SoftEng</h2>
            </div>
            {/* PDF Attachments download button*/}
            <div className="">
                <button className="flex items-center px-4 py-2 bg-[#e0e7f1] text-[#5e7593] rounded-full hover:bg-[#d1d9e4] cursor-pointer">
                    <GoPaperclip className="mr-2" />
                    Midterm Note.pdf
                </button>
            </div>

        </div>
    );
}