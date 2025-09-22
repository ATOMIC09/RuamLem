import Image from "next/image";
import Link from "next/link";
import { IoMdPricetag } from "react-icons/io";
import { GoPaperclip } from "react-icons/go";
import { PostPreview } from "../../types/post";

interface PostboxProps {
  post?: PostPreview & { content?: string };
}

export default function Postbox({ post }: PostboxProps) {
    // Default mock data if no post prop is provided
    const defaultPost = {
        id: "1",
        title: "สรุปมิดเทอมวิชา SoftEng",
        content: "ฉันไม่แน่ใจว่าขาดอะไรอีกบ้าง แต่คิดว่าน่าจะครบแล้วนะ",
        author: {
            name: "John Doe",
            avatar: "/anonym.jpg"
        },
        createdAt: "วันศุกร์ เวลา 13:40 น.",
        category: "Software Engineering",
        attachments: [
            {
                name: "Midterm Note.pdf",
                size: "2.5 MB",
                type: "pdf"
            }
        ]
    };

    const postData = post || defaultPost;

    return (
        <Link href={`/post/${postData.id}`}>
            <div className="w-full bg-white p-6 rounded-3xl shadow-sm border border-[#e0e7f1] text-[#5e7593] hover:shadow-md transition-shadow cursor-pointer">
            {/* Author */}
            <div className="flex items-center mb-4">
                <Image
                    src={postData.author.avatar}
                    alt="Author"
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full mr-3"
                />
                {/* Username and Postdate */}
                <div>
                    <div className="font-bold text-[#1c2a48]">{postData.author.name}</div>
                    <div className="text-sm text-[#7a8b99]">{postData.createdAt}</div>
                </div>
                {/* Post tags */}
                <div className="ml-auto">
                    <span className="px-3 py-1 text-xs bg-[#f0f4f8] text-[#5e7593] rounded-full border border-[#e0e7f1]">
                        <IoMdPricetag className="inline-block mr-1" />
                        {postData.category}
                    </span>
                </div>
            </div>
            {/* Post content */}
            {/* Title */}
            <div className="mb-3">
                <h2 className="text-xl font-bold text-[#1c2a48]">{postData.title}</h2>
            </div>
            {/* Description */}
            {postData.content && (
                <div className="mb-4 text-[#7a8b99] leading-relaxed">
                    {postData.content}
                </div>
            )}
            {/* PDF Attachments download button*/}
            {postData.attachments && postData.attachments.length > 0 && (
                <div className="pt-2 border-t border-[#f0f4f8]">
                    <div className="flex items-center px-4 py-2 bg-[#f8f9fa] text-[#5e7593] rounded-2xl hover:bg-[#e0e7f1] transition-colors cursor-pointer border border-[#e0e7f1]">
                        <GoPaperclip className="mr-2" />
                        <span className="text-sm font-medium">{postData.attachments[0].name}</span>
                    </div>
                </div>
            )}
        </div>
        </Link>
    );
}