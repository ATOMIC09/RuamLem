'use client';

import Image from "next/image";
import Link from "next/link";
import { IoMdPricetag } from "react-icons/io";
import { GoPaperclip } from "react-icons/go";
import { MdImage, MdDescription } from "react-icons/md";
import { PostPreview } from "../../types/post";
import { getFileDownloadUrl } from "../../services/post.service";

interface PreviewPostProps {
  post?: PostPreview;
}

export default function PreviewPost({ post }: PreviewPostProps) {
    
    // Helper function to get the appropriate icon based on file type
    const getFileIcon = (fileType: string) => {
        const type = fileType.toLowerCase();
        
        // Check if it's an image (either by extension or MIME type)
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'].includes(type)) {
            return <MdImage className="mr-2 group-hover:scale-110 transition-transform" />;
        } 
        // Check if it's a PDF
        else if (type === 'pdf' || type === 'application/pdf') {
            return <MdDescription className="mr-2 group-hover:scale-110 transition-transform" />;
        } 
        // Default to paperclip for other files
        else {
            return <GoPaperclip className="mr-2 group-hover:scale-110 transition-transform" />;
        }
    };
    
    // Default mock data if no post prop is provided
    const defaultPost: PostPreview = {
        id: "1",
        title: "สรุปมิดเทอมวิชา SoftEng",
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

    const handleDownload = async (e: React.MouseEvent, fileUrl: string | undefined) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!fileUrl) return;
        
        try {
            const { url, error } = await getFileDownloadUrl(fileUrl);
            if (url) {
                window.open(url, "_blank");
            } else {
                console.error('Download error:', error);
                alert('ไม่สามารถดาวน์โหลดไฟล์ได้');
            }
        } catch (error) {
            console.error('Download failed:', error);
            alert('ไม่สามารถดาวน์โหลดไฟล์ได้');
        }
    };

    return (
        <Link href={`/post/${postData.id}`}>
            <div className="w-full bg-white p-6 rounded-3xl shadow-sm border border-[#e0e7f1] text-[#5e7593] hover:shadow-md transition-shadow cursor-pointer">
            {/* Author */}
            <div className="flex items-center mb-4">
                {postData.author.avatar && (
                    <Image
                        src={postData.author.avatar}
                        alt="Author"
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full mr-3"
                    />
                )}
                {/* Username and Postdate */}
                <div className="flex-grow">
                    <div className="font-bold text-[#1c2a48]">{postData.author.name}</div>
                    <div className="text-sm text-[#7a8b99]">{postData.createdAt}</div>
                </div>
                {/* Post tags */}
                <div className="flex-shrink-0">
                    <span className="px-3 py-1 text-xs bg-[#f0f4f8] text-[#5e7593] rounded-full border border-[#e0e7f1]">
                        <IoMdPricetag className="inline-block mr-1" />
                        {postData.category}
                    </span>
                </div>
            </div>
            {/* Post content */}
            {/* Title */}
            <div className="mb-4">
                <h2 className="text-xl font-bold text-[#1c2a48] line-clamp-2">{postData.title}</h2>
            </div>
            
            {/* Description - 2-3 lines truncated */}
            {postData.description && (
                <div className="mb-4">
                    <p className="text-sm text-[#5e7593] line-clamp-3 mb-2">{postData.description}</p>
                    <Link href={`/post/${postData.id}`} className="text-sm text-[#405168] font-medium hover:text-[#2d3a4c] transition-colors">
                        อ่านเพิ่มเติม →
                    </Link>
                </div>
            )}
            
            {/* All Attachments download buttons */}
            {postData.attachments && postData.attachments.length > 0 && (
                <div className="pt-4 border-t border-[#f0f4f8] space-y-2">
                    {postData.attachments.map((attachment, index) => {
                        // Extract file type from file_name extension
                        const fileExtension = (attachment.file_name || '').split('.').pop()?.toLowerCase() || '';
                        
                        return (
                            <button
                                key={index}
                                onClick={(e) => handleDownload(e, attachment.file_url)}
                                className="w-full flex items-center px-4 py-2 bg-[#f8f9fa] text-[#5e7593] rounded-2xl hover:bg-[#e0e7f1] transition-colors border border-[#e0e7f1] group cursor-pointer"
                            >
                                {getFileIcon(fileExtension)}
                                <div className="flex flex-col items-start flex-1 min-w-0">
                                    <span className="text-sm font-medium truncate text-left">{attachment.file_name}</span>
                                    {attachment.file_size && (
                                        <span className="text-xs text-[#7a8b99]">{(attachment.file_size / 1024 / 1024).toFixed(2)} MB</span>
                                    )}
                                </div>
                                <span className="text-xs text-[#405168] ml-2 flex-shrink-0">📥</span>
                            </button>
                        );
                    })}
                </div>
            )}
            {/* Comment count */}
            {postData.commentCount !== undefined && (
                <div className="mt-3 text-xs text-[#7a8b99]">
                    💬 {postData.commentCount} ความเห็น
                </div>
            )}
        </div>
        </Link>
    );
}