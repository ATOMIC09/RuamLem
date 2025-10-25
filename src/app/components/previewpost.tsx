'use client';

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { IoMdPricetag, IoMdHeart } from "react-icons/io";
import { GoPaperclip } from "react-icons/go";
import { MdImage, MdDescription } from "react-icons/md";
import { FaEye, FaDownload } from "react-icons/fa";
import { PostPreview } from "../../types/post";
import { getFileDownloadUrl } from "../../services/post.service";
import * as likeService from "@/services/like.service";
import * as analyticsService from "@/services/analytics.service";

interface PreviewPostProps {
    post?: PostPreview;
}

export default function PreviewPost({ post }: PreviewPostProps) {
    const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
    const [likeCount, setLikeCount] = useState(0);
    const [viewCount, setViewCount] = useState(0);
    const [fileDownloadCounts, setFileDownloadCounts] = useState<Record<number, number>>({});

    const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 4000);
    };

    const fetchLikeCount = useCallback(async () => {
        if (!post?.id) return;
        try {
            const result = await likeService.getPostLikeStatus(Number(post.id));
            if (result.data) {
                setLikeCount(result.data.likeCount);
            }
        } catch (err) {
            console.error('Failed to fetch like count:', err);
        }
    }, [post?.id]);

    const fetchViewCount = useCallback(async () => {
        if (!post?.id) return;
        try {
            const result = await analyticsService.getPostViewCount(post.id);
            if (result.viewCount !== undefined) {
                setViewCount(result.viewCount);
            }
        } catch (err) {
            console.error('Failed to fetch view count:', err);
        }
    }, [post?.id]);

    const fetchFileDownloadCounts = useCallback(async () => {
        if (!post?.attachments || post.attachments.length === 0) return;

        try {
            const fileIds = post.attachments
                .map(file => file.id)
                .filter((id): id is number => id !== undefined);

            if (fileIds.length === 0) return;

            const result = await analyticsService.getMultipleFileDownloads(fileIds);
            if (result.data) {
                const countsMap: Record<number, number> = {};
                result.data.forEach(item => {
                    countsMap[item.fileId] = item.downloadCount;
                });
                setFileDownloadCounts(countsMap);
            }
        } catch (err) {
            console.error('Failed to fetch file download counts:', err);
        }
    }, [post?.attachments]);

    // Fetch like count and view count when component mounts
    useEffect(() => {
        if (post?.id) {
            fetchLikeCount();
            fetchViewCount();
            fetchFileDownloadCounts();
        }
    }, [post?.id, fetchLikeCount, fetchViewCount, fetchFileDownloadCounts]);

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

    const handlePreview = async (e: React.MouseEvent, fileUrl: string | undefined) => {
        e.preventDefault();
        e.stopPropagation();

        if (!fileUrl) return;

        try {
            const { url, error } = await getFileDownloadUrl(fileUrl);
            if (url) {
                window.open(url, "_blank");
            } else {
                console.error('Preview error:', error);
                showNotification('error', 'ไม่สามารถเปิดไฟล์ได้');
            }
        } catch (error) {
            console.error('Preview failed:', error);
            showNotification('error', 'ไม่สามารถเปิดไฟล์ได้');
        }
    };

    const handleDownload = async (
        e: React.MouseEvent,
        fileUrl: string | undefined,
        fileName: string | undefined,
        fileId: number | undefined
    ) => {
        e.preventDefault();
        e.stopPropagation();

        if (!fileUrl) return;

        try {
            // Record download analytics before downloading (if fileId and postId are available)
            if (fileId && post?.id) {
                try {
                    await analyticsService.recordFileDownload(String(fileId), post.id);
                    // Refresh download counts after recording
                    fetchFileDownloadCounts();
                } catch (err) {
                    console.error('Failed to record download:', err);
                }
            }

            const { url, error } = await getFileDownloadUrl(fileUrl);
            if (url) {
                const response = await fetch(url);
                if (!response.ok) throw new Error('Network response was not ok');

                // Convert response to blob
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);

                // Create hidden anchor and trigger download
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = fileName || 'download';
                document.body.appendChild(link);
                link.click();
                link.remove();

                // Clean up
                window.URL.revokeObjectURL(blobUrl);
                showNotification('success', 'กำลังดาวน์โหลดไฟล์...');
            } else {
                console.error('Download error:', error);
                showNotification('error', 'ไม่สามารถดาวน์โหลดไฟล์ได้');
            }
        } catch (error) {
            console.error('Download failed:', error);
            showNotification('error', 'ไม่สามารถดาวน์โหลดไฟล์ได้');
        }
    };


    return (
        <>
            {/* Notification Toast */}
            {notification && (
                <div className={`fixed top-6 right-6 px-6 py-3 rounded-2xl shadow-lg text-white text-sm font-medium transition-all duration-300 z-50 ${notification.type === 'success' ? 'bg-green-500' :
                        notification.type === 'error' ? 'bg-red-500' :
                            'bg-blue-500'
                    }`}>
                    {notification.type === 'success' && '✓ '}
                    {notification.type === 'error' && '✕ '}
                    {notification.type === 'info' && 'ℹ '}
                    {notification.message}
                </div>
            )}

            <Link href={`/post/${postData.id}`} className="h-full block">
                <div className="h-full w-full bg-white p-6 rounded-3xl shadow-sm border border-[#e0e7f1] text-[#5e7593] hover:shadow-md transition-shadow cursor-pointer flex flex-col">
                    {/* Author */}
                    <div className="flex items-center mb-4">
                        <div className="w-10 h-10 rounded-full mr-3 overflow-hidden bg-gradient-to-br from-[#5e7593] to-[#405168] flex-shrink-0">
                            {postData.author.avatar ? (
                                <Image
                                    src={postData.author.avatar}
                                    alt={postData.author.name}
                                    width={40}
                                    height={40}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                                    {postData.author.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        {/* Username and Postdate */}
                        <div className="flex-grow min-w-0 mr-2">
                            <div className="font-bold text-[#1c2a48]">{postData.author.name}</div>
                            <div className="text-sm text-[#7a8b99]">{postData.createdAt}</div>
                        </div>
                        {/* Post tags */}
                        <div className="flex-shrink-0 max-w-[150px]">
                            <span className="px-3 py-1 text-xs bg-[#f0f4f8] text-[#5e7593] rounded-full border border-[#e0e7f1] inline-flex items-center max-w-full">
                                <IoMdPricetag className="mr-1 flex-shrink-0" />
                                <span className="truncate">{postData.category}</span>
                            </span>
                        </div>
                    </div>
                    {/* Post content - Flex grow to push stats to bottom */}
                    <div className="flex-grow flex flex-col">
                        {/* Title */}
                        <div className="mb-4">
                            <h2 className="text-xl font-bold text-[#1c2a48] line-clamp-2">{postData.title}</h2>
                        </div>

                        {/* Description - 2-3 lines truncated */}
                        {postData.description && (
                            <div className="mb-4">
                                <p className="text-sm text-[#5e7593] line-clamp-3 mb-2">{postData.description}</p>
                                <span className="text-sm text-[#405168] font-medium group-hover:text-[#2d3a4c] transition-colors">
                                    อ่านเพิ่มเติม →
                                </span>
                            </div>
                        )}

                        {/* All Attachments download buttons */}
                        {postData.attachments && postData.attachments.length > 0 && (
                            <div className="pt-4 border-t border-[#f0f4f8] space-y-2">
                                {postData.attachments.map((attachment, index) => {
                                    // Extract file type from file_name extension
                                    const fileExtension = (attachment.file_name || '').split('.').pop()?.toLowerCase() || '';
                                    const downloadCount = attachment.id ? (fileDownloadCounts[attachment.id] || 0) : 0;

                                    return (
                                        <div
                                            key={index}
                                            className="w-full flex items-center px-4 py-2 bg-[#f8f9fa] text-[#5e7593] rounded-2xl hover:bg-[#e0e7f1] transition-colors border border-[#e0e7f1] group"
                                        >
                                            <button
                                                onClick={(e) => handlePreview(e, attachment.file_url)}
                                                className="flex items-center flex-1 min-w-0 truncate cursor-pointer"
                                            >
                                                {getFileIcon(fileExtension)}
                                                <div className="flex flex-col items-start flex-1 min-w-0 truncate">
                                                    <span className="text-sm font-medium text-left">{attachment.file_name}</span>
                                                    <div className="flex items-center gap-2 text-xs text-[#7a8b99]">
                                                        {attachment.file_size && (
                                                            <>
                                                                <span>{(attachment.file_size / 1024 / 1024).toFixed(2)} MB</span>
                                                                <span>•</span>
                                                            </>
                                                        )}
                                                        <span>{downloadCount} ดาวน์โหลด</span>
                                                    </div>
                                                </div>
                                            </button>
                                            <button
                                                onClick={(e) => handleDownload(e, attachment.file_url, attachment.file_name, attachment.id)}
                                                className="ml-2 p-2 hover:bg-[#d0dae7] rounded-lg transition-colors cursor-pointer flex-shrink-0"
                                                title="ดาวน์โหลดไฟล์"
                                            >
                                                <FaDownload size={14} className="text-[#5e7593]" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Stats Bar - Likes, Views, Comments - Always at bottom */}
                        <div className="mt-auto pt-4 border-t border-[#f0f4f8] flex items-center gap-4 text-xs text-[#7a8b99]">
                            <div className="flex items-center gap-1">
                                <IoMdHeart className="text-red-400" />
                                <span>{likeCount} ไลค์</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <FaEye className="text-[#5e7593]" />
                                <span>{viewCount} ครั้ง</span>
                            </div>
                            {postData.commentCount !== undefined && (
                                <div className="flex items-center gap-1">
                                    <span>💬</span>
                                    <span>{postData.commentCount} ความเห็น</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Link>
        </>
    );
}