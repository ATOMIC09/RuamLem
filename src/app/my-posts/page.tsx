"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/use-auth";
import { IoMdArrowBack, IoMdClose, IoMdTrash, IoMdCreate } from "react-icons/io";
import { MdAttachFile } from "react-icons/md";
import Link from "next/link";
import LoadingSpinner from "../components/loading-spinner";
import * as postService from "@/services/post.service";

interface Post {
  id: number;
  title: string;
  body: string;
  tag?: string;
  user_info?: {
    firstName: string;
    lastName: string;
  };
  created_at?: string;
  createdAt?: string;
  attachments?: Array<{
    id: number;
    file_name: string;
    file_url: string;
    file_size: number;
  }>;
  comment_count?: number;
}

export default function MyPostsPage() {
  const router = useRouter();
  const { isSignedIn, user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [postToDelete, setPostToDelete] = useState<number | null>(null);

  // Redirect to home if not signed in
  useEffect(() => {
    if (isSignedIn === null) {
      return;
    }
    if (!isSignedIn) {
      router.push("/");
    } else {
      fetchMyPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // Fetch user's posts
  const fetchMyPosts = async () => {
    try {
      setIsLoading(true);
      const result = await postService.getPosts(100); // Get more posts to find user's
      
      if (result.error) {
        // Check for JWT expiration
        if (result.error.includes('JWT') || result.error.includes('expired')) {
          setShowSignInPrompt(true);
          setError("");
        } else {
          setError(result.error);
        }
        return;
      }

      if (result.posts) {
        // Filter posts that belong to the current user
        const myPosts = result.posts.filter(
          post => post.user_info?.firstName === user?.firstName
        );
        setPosts(myPosts);
      }
    } catch {
      setError("ไม่สามารถโหลดโพสต์ของคุณได้");
    } finally {
      setIsLoading(false);
    }
  };

  // Show notification helper
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDeletePost = async (postId: number) => {
    setPostToDelete(postId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!postToDelete) return;
    
    // TODO: Implement delete functionality when backend is ready
    showNotification('info', 'ฟีเจอร์การลบโพสต์ยังไม่พร้อมใช้งาน');
    setShowDeleteConfirm(false);
    setPostToDelete(null);
  };

  const handleDownloadAttachment = async (e: React.MouseEvent, fileUrl: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const { url, error } = await postService.getFileDownloadUrl(fileUrl);
      if (url) {
        window.open(url, "_blank");
        showNotification('success', 'กำลังดาวน์โหลดไฟล์...');
      } else {
        console.error('Download error:', error);
        showNotification('error', 'ไม่สามารถดาวน์โหลดไฟล์ได้');
      }
    } catch (error) {
      console.error('ไม่สามารถดาวน์โหลดไฟล์ได้:', error);
      showNotification('error', 'ไม่สามารถดาวน์โหลดไฟล์ได้');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f5f7fb] to-[#eef1f8]">
        <LoadingSpinner size="lg" text="กำลังโหลดโพสต์ของคุณ..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f7fb] to-[#eef1f8] py-8">
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

      <div className="container max-w-4xl mx-auto px-4">
        {/* Back Button */}
        <Link
          href="/"
          className="flex items-center space-x-2 text-[#405168] hover:text-[#5e7593] transition-colors mb-6"
        >
          <IoMdArrowBack size={20} />
          <span className="text-sm font-medium">กลับไปหน้าหลัก</span>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#1c2a48] mb-2">โพสต์ของฉัน</h1>
          <p className="text-[#7a8b99]">จัดการและดูโพสต์ที่คุณสร้าง</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-2xl">
            {error}
          </div>
        )}

        {/* Posts List */}
        {posts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#dee5ed] shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-2xl font-bold text-[#1c2a48] mb-2">ยังไม่มีโพสต์</h2>
            <p className="text-[#7a8b99] mb-6">คุณยังไม่ได้สร้างโพสต์ใด ๆ</p>
            <Link
              href="/post"
              className="inline-block px-6 py-3 bg-[#405168] text-white rounded-3xl hover:bg-[#2d3a4c] transition-colors font-medium"
            >
              สร้างโพสต์ใหม่
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-3xl border border-[#dee5ed] shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-[#1c2a48] mb-2 hover:text-[#5e7593] transition-colors cursor-pointer">
                      <Link href={`/post/${post.id}`}>{post.title}</Link>
                    </h2>
                    <p className="text-[#7a8b99] line-clamp-2 mb-3">{post.body}</p>
                    
                    {/* Post Meta */}
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      {post.tag && (
                        <span className="px-3 py-1 bg-[#e0e7f1] text-[#5e7593] rounded-full">
                          #{post.tag}
                        </span>
                      )}
                      <span className="text-[#7a8b99] flex items-center gap-1">
                        <MdAttachFile size={16} />
                        {post.attachments?.length || 0} ไฟล์
                      </span>
                      <span className="text-[#7a8b99]">
                        {post.comment_count || 0} ความเห็น
                      </span>
                      <span className="text-[#7a8b99]">
                        {post.created_at || post.createdAt
                          ? new Date(post.created_at || post.createdAt || "").toLocaleString("th-TH")
                          : ""}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 ml-4">
                    <Link
                      href={`/my-posts/${post.id}/edit`}
                      className="p-2 text-[#405168] hover:bg-[#f0f4f8] rounded-lg transition-colors"
                      title="แก้ไขโพสต์"
                    >
                      <IoMdCreate size={20} />
                    </Link>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="ลบโพสต์"
                    >
                      <IoMdTrash size={20} />
                    </button>
                  </div>
                </div>

                {/* Attachments Preview */}
                {post.attachments && post.attachments.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[#dee5ed]">
                    <p className="text-xs text-[#7a8b99] mb-2">ไฟล์ที่แนบ:</p>
                    <div className="flex flex-wrap gap-2">
                      {post.attachments.slice(0, 3).map((attachment) => (
                        <button
                          key={attachment.id}
                          onClick={(e) => handleDownloadAttachment(e, attachment.file_url)}
                          className="inline-flex items-center px-3 py-1 bg-[#f8f9fa] text-[#5e7593] rounded-lg text-xs hover:bg-[#e0e7f1] transition-colors cursor-pointer"
                        >
                          <MdAttachFile size={14} className="mr-1" />
                          {attachment.file_name.substring(0, 20)}...
                        </button>
                      ))}
                      {post.attachments.length > 3 && (
                        <span className="inline-flex items-center px-3 py-1 text-xs text-[#7a8b99]">
                          +{post.attachments.length - 3} ไฟล์อื่น
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black opacity-50" 
            onClick={() => {
              setShowDeleteConfirm(false);
              setPostToDelete(null);
            }}
          ></div>
          <div className="relative bg-white rounded-3xl border border-[#e0e7f1] shadow-xl max-w-md w-full p-8">
            <button
              onClick={() => {
                setShowDeleteConfirm(false);
                setPostToDelete(null);
              }}
              className="absolute top-4 right-4 p-2 text-[#7a8b99] hover:text-[#405168] transition-colors cursor-pointer"
            >
              <IoMdClose size={20} />
            </button>

            <div className="text-center">
              <div className="text-5xl mb-4">🗑️</div>
              <h2 className="text-2xl font-bold text-[#1c2a48] mb-4">ลบโพสต์</h2>
              <p className="text-[#7a8b99] mb-6">คุณแน่ใจหรือว่าต้องการลบโพสต์นี้? การดำเนินการนี้ไม่สามารถยกเลิกได้</p>

              <div className="space-y-3">
                <button
                  onClick={confirmDelete}
                  className="w-full px-6 py-3 bg-red-500 text-white rounded-3xl hover:bg-red-600 transition-colors font-medium cursor-pointer"
                >
                  ยืนยันการลบ
                </button>

                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setPostToDelete(null);
                  }}
                  className="w-full px-6 py-3 border border-[#e0e7f1] text-[#405168] rounded-3xl hover:bg-[#f8f9fa] hover:shadow-md transition-all font-medium shadow-sm bg-white cursor-pointer"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sign In Required Modal */}
      {showSignInPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black opacity-50" onClick={() => setShowSignInPrompt(false)}></div>
          <div className="relative bg-white rounded-3xl border border-[#e0e7f1] shadow-xl max-w-md w-full p-8">
            <button
              onClick={() => setShowSignInPrompt(false)}
              className="absolute top-4 right-4 p-2 text-[#7a8b99] hover:text-[#405168] transition-colors cursor-pointer"
            >
              <IoMdClose size={20} />
            </button>

            <div className="text-center">
              <div className="text-4xl mb-4">⏱️</div>
              <h2 className="text-2xl font-bold text-[#1c2a48] mb-4">เซสชันหมดอายุแล้ว</h2>
              <p className="text-[#7a8b99] mb-6">กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ</p>

              <div className="space-y-4">
                <Link
                  href="/signin"
                  className="block w-full px-6 py-3 bg-[#405168] text-white rounded-3xl hover:bg-[#2d3a4c] transition-colors font-medium"
                  onClick={() => setShowSignInPrompt(false)}
                >
                  เข้าสู่ระบบ
                </Link>

                <button
                  onClick={() => setShowSignInPrompt(false)}
                  className="w-full px-6 py-3 border border-[#e0e7f1] text-[#405168] rounded-3xl hover:bg-[#f8f9fa] hover:shadow-md transition-all font-medium shadow-sm bg-white"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
