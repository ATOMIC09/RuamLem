"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { IoMdPricetag, IoMdArrowBack, IoMdShare } from "react-icons/io";
import { MdImage, MdDescription } from "react-icons/md";
import { GoPaperclip } from "react-icons/go";
import { FaDownload } from "react-icons/fa";
import { useParams } from "next/navigation";
import * as postService from "@/services/post.service";
import { useAuth } from "@/app/hooks/use-auth";
import LoadingSpinner from "@/app/components/loading-spinner";

interface PostDetail extends postService.Post {
  attachments?: Array<{
    id: number;
    file_name: string;
    file_url: string;
    file_size: number;
  }>;
}

export default function PostDetailPage() {
  const params = useParams();
  const postId = params.id as string;
  const { isSignedIn } = useAuth();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<postService.Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Show notification helper
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000); // Auto-hide after 4 seconds
  };

  // Helper function to get the appropriate icon based on file type
  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    
    // Check if it's an image (either by extension or MIME type)
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'].includes(type)) {
      return <MdImage className="mr-2 group-hover:scale-110 transition-transform" size={20} />;
    } 
    // Check if it's a PDF
    else if (type === 'pdf' || type === 'application/pdf') {
      return <MdDescription className="mr-2 group-hover:scale-110 transition-transform" size={20} />;
    } 
    // Default to paperclip for other files
    else {
      return <GoPaperclip className="mr-2 group-hover:scale-110 transition-transform" size={20} />;
    }
  };

  useEffect(() => {
    fetchPostData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const fetchPostData = async () => {
    setIsLoading(true);
    setError("");
    
    try {
      // Fetch all posts to find the one with matching ID
      const postsResult = await postService.getPosts(100); // Get more posts to ensure we find it
      
      if (postsResult.error) {
        setError(postsResult.error);
        setIsLoading(false);
        return;
      }

      const foundPost = postsResult.posts?.find(p => String(p.id) === postId);
      
      if (!foundPost) {
        setError("ไม่พบโพสต์");
        setIsLoading(false);
        return;
      }

      setPost(foundPost as PostDetail);

      // Fetch comments
      const commentsResult = await postService.getComments(Number(postId));
      if (commentsResult.comments) {
        setComments(commentsResult.comments);
      }

      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      setIsLoading(false);
    }
  };

  const handleDownload = async (fileUrl: string) => {
    try {
      const result = await postService.getFileDownloadUrl(fileUrl);
      if (result.url) {
        window.open(result.url, "_blank");
      } else {
        showNotification('error', 'ไม่สามารถดาวน์โหลดไฟล์ได้');
      }
    } catch (error) {
      console.error("Download failed:", error);
      showNotification('error', 'ไม่สามารถดาวน์โหลดไฟล์ได้');
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !post) return;

    setIsSubmittingComment(true);
    const result = await postService.createComment({
      post_id: String(post.id),
      post_body: commentText,
    });

    if (result.error) {
      // Check if it's a JWT expiration error
      if (result.error.toLowerCase().includes('jwt') || result.error.toLowerCase().includes('expired')) {
        showNotification('error', 'เซสชันหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่');
        setTimeout(() => {
          window.location.href = "/signin";
        }, 1500);
      } else {
        showNotification('error', result.error);
      }
    } else {
      setCommentText("");
      showNotification('success', 'เพิ่มคอมเมนต์สำเร็จ');
      // Refresh comments
      await fetchPostData();
    }
    setIsSubmittingComment(false);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post?.title,
        text: post?.body,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      showNotification('success', 'ลิงก์ถูกคัดลอกแล้ว!');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="text-center">
          <LoadingSpinner size="lg" text="กำลังโหลดโพสต์..." />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">📄</div>
          <h1 className="text-2xl font-bold text-[#1c2a48] mb-2">ไม่พบโพสต์</h1>
          <p className="text-[#7a8b99] mb-6">{error || "โพสต์ที่คุณกำลังค้นหาอาจถูกลบหรือไม่มีอยู่"}</p>
          <Link
            href="/community"
            className="px-6 py-3 bg-[#405168] text-white rounded-3xl hover:bg-[#2d3a4c] transition-colors font-medium cursor-pointer"
          >
            กลับไปยังชุมชน
          </Link>
        </div>
      </div>
    );
  }

  const authorName = post.user_info 
    ? `${post.user_info.firstName} ${post.user_info.lastName}`
    : post.author 
    ? `${post.author.firstName} ${post.author.lastName}`
    : "Anonymous";

  const createdAt = new Date(post.created_at || post.createdAt || new Date()).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const category = post.tags && post.tags.length > 0 
    ? post.tags[0].name 
    : post.tag || "General";

  return (
    <div className="min-h-screen bg-[#f8f9fa] py-8">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-6 right-6 px-6 py-3 rounded-2xl shadow-lg text-white text-sm font-medium transition-all duration-300 z-50 ${
          notification.type === 'success' ? 'bg-green-500' : 
          notification.type === 'error' ? 'bg-red-500' : 
          'bg-blue-500'
        }`}>
          {notification.type === 'success' && '✓ '}
          {notification.type === 'error' && '✕ '}
          {notification.type === 'info' && 'ℹ '}
          {notification.message}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            href="/community"
            className="flex items-center gap-2 text-[#5e7593] hover:text-[#405168] transition-colors cursor-pointer"
          >
            <IoMdArrowBack />
            <span>กลับไปยังชุมชน</span>
          </Link>
        </div>

        {/* Post Container */}
        <div className="bg-white rounded-3xl shadow-sm border border-[#e0e7f1] p-8">
          {/* Post Header */}
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-[#f0f4f8]">
            <div className="flex items-center">
              <Image
                src="/anonym.jpg"
                alt={authorName}
                width={50}
                height={50}
                className="w-12 h-12 rounded-full mr-4"
              />
              <div>
                <div className="font-bold text-[#1c2a48] text-lg">{authorName}</div>
                <div className="text-sm text-[#7a8b99]">{createdAt}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="px-4 py-2 text-sm bg-[#f0f4f8] text-[#5e7593] rounded-full border border-[#e0e7f1]">
                <IoMdPricetag className="inline-block mr-2" />
                {category}
              </span>
            </div>
          </div>

          {/* Post Title */}
          <h1 className="text-3xl font-bold text-[#1c2a48] mb-6">{post.title}</h1>

          {/* Post Content */}
          <div className="prose max-w-none mb-8">
            <div className="text-[#1c2a48] leading-relaxed whitespace-pre-line text-base">
              {post.body}
            </div>
          </div>

          {/* Attachments */}
          {post.attachments && post.attachments.length > 0 && (
            <div className="mb-8 pt-6 border-t border-[#f0f4f8]">
              <h3 className="text-lg font-semibold text-[#1c2a48] mb-4">ไฟล์แนบ ({post.attachments.length})</h3>
              <div className="space-y-3">
                {post.attachments.map((file) => {
                  const fileExtension = (file.file_name || '').split('.').pop()?.toLowerCase() || '';
                  const fileSizeMB = (file.file_size / 1024 / 1024).toFixed(2);
                  
                  return (
                    <button
                      key={file.id}
                      onClick={() => handleDownload(file.file_url)}
                      className="w-full flex items-center justify-between p-4 bg-[#f8f9fa] rounded-2xl border border-[#e0e7f1] hover:bg-[#e0e7f1] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        {getFileIcon(fileExtension)}
                        <div className="flex-1 min-w-0 text-left">
                          <div className="font-medium text-[#1c2a48] truncate">{file.file_name}</div>
                          <div className="text-sm text-[#7a8b99]">{fileSizeMB} MB</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <FaDownload size={14} className="text-[#5e7593]" />
                        <span className="text-sm font-medium text-[#5e7593]">ดาวน์โหลด</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="pt-6 border-t border-[#f0f4f8]">
            <h3 className="text-lg font-semibold text-[#1c2a48] mb-4">ความเห็น ({comments.length})</h3>
            
            {/* Add Comment Form or Login Prompt */}
            {isSignedIn ? (
              <div className="mb-6 p-4 bg-[#f8f9fa] rounded-2xl border border-[#e0e7f1]">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="เพิ่มความเห็นของคุณ..."
                  className="w-full p-3 bg-white border border-[#e0e7f1] rounded-2xl text-[#1c2a48] placeholder-[#7a8b99] focus:outline-none focus:ring-2 focus:ring-[#5e7593] resize-none"
                  rows={3}
                />
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={handleAddComment}
                    disabled={!commentText.trim() || isSubmittingComment}
                    className="px-6 py-2 bg-[#405168] text-white rounded-2xl hover:bg-[#2d3a4c] transition-colors font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingComment ? "กำลังส่ง..." : "ส่งความเห็น"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-[#f0f4f8] rounded-2xl border border-[#e0e7f1] text-center">
                <p className="text-[#5e7593] mb-4">กรุณาเข้าสู่ระบบเพื่อแสดงความเห็น</p>
                <Link
                  href="/signin"
                  className="inline-block px-6 py-2 bg-[#405168] text-white rounded-2xl hover:bg-[#2d3a4c] transition-colors font-medium cursor-pointer"
                >
                  เข้าสู่ระบบ
                </Link>
              </div>
            )}

            {/* Comments List */}
            {comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map((comment) => {
                  const authorName = comment.user_info 
                    ? `${comment.user_info.firstName} ${comment.user_info.lastName}`
                    : comment.author
                    ? `${comment.author.firstName} ${comment.author.lastName}`
                    : "Anonymous";

                  const createdDate = new Date(comment.created_at || comment.createdAt || new Date()).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div key={comment.id} className="p-4 bg-[#f8f9fa] rounded-2xl border border-[#e0e7f1]">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-semibold text-[#1c2a48]">
                          {authorName}
                        </div>
                        <div className="text-xs text-[#7a8b99]">
                          {createdDate}
                        </div>
                      </div>
                      <p className="text-[#5e7593]">{comment.body}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-[#7a8b99] py-8">ยังไม่มีความเห็น เป็นคนแรกที่เพิ่มความเห็น!</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-[#f0f4f8] mt-6">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 bg-[#f0f4f8] text-[#5e7593] rounded-2xl hover:bg-[#e0e7f1] transition-colors cursor-pointer"
            >
              <IoMdShare />
              <span className="text-sm font-medium">แชร์</span>
            </button>
            
            <div className="text-sm text-[#7a8b99]">
              โพสต์ #{post.id}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}