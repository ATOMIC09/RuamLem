"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/app/hooks/use-auth";
import { IoMdArrowBack, IoMdClose } from "react-icons/io";
import Link from "next/link";
import LoadingSpinner from "@/app/components/loading-spinner";
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

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  const { isSignedIn, user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState("");

  // Redirect to home if not signed in
  useEffect(() => {
    if (isSignedIn === null) {
      return;
    }
    if (!isSignedIn) {
      router.push("/");
    } else {
      fetchPost();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // Fetch post data
  const fetchPost = async () => {
    try {
      setIsLoading(true);
      const result = await postService.getPosts(100);

      if (result.error) {
        if (result.error.includes('JWT') || result.error.includes('expired')) {
          setShowSignInPrompt(true);
          setError("");
        } else {
          setError(result.error);
        }
        return;
      }

      if (result.posts) {
        const foundPost = result.posts.find((p) => p.id === parseInt(postId));
        if (foundPost) {
          // Check if user owns this post
          if (foundPost.user_info?.firstName === user?.firstName) {
            setPost(foundPost);
            setTitle(foundPost.title);
            setBody(foundPost.body);
            setTag(foundPost.tag || "");
          } else {
            setError("คุณไม่มีสิทธิ์แก้ไขโพสต์นี้");
          }
        } else {
          setError("ไม่พบโพสต์ที่ต้องการ");
        }
      }
    } catch {
      setError("ไม่สามารถโหลดโพสต์ได้");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!title.trim() || !body.trim()) {
      setError("กรุณากรอกหัวข้อและเนื้อหา");
      return;
    }

    setIsSaving(true);
    try {
      // TODO: Implement update functionality when backend is ready
      // For now, just show success and go back
      alert("ฟีเจอร์การแก้ไขโพสต์ยังไม่พร้อมใช้งาน");
      setIsSaving(false);
    } catch {
      setError("ไม่สามารถบันทึกการเปลี่ยนแปลงได้");
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f5f7fb] to-[#eef1f8]">
        <LoadingSpinner size="lg" text="กำลังโหลดโพสต์..." />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f5f7fb] to-[#eef1f8] py-8">
        <div className="container max-w-4xl mx-auto px-4">
          <Link
            href="/my-posts"
            className="flex items-center space-x-2 text-[#405168] hover:text-[#5e7593] transition-colors mb-6"
          >
            <IoMdArrowBack size={20} />
            <span className="text-sm font-medium">กลับไปยังโพสต์ของฉัน</span>
          </Link>

          <div className="bg-white rounded-3xl border border-[#dee5ed] shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-[#1c2a48] mb-2">ไม่พบโพสต์</h2>
            <p className="text-[#7a8b99]">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f7fb] to-[#eef1f8] py-8">
      <div className="container max-w-4xl mx-auto px-4">
        {/* Back Button */}
        <Link
          href="/my-posts"
          className="flex items-center space-x-2 text-[#405168] hover:text-[#5e7593] transition-colors mb-6"
        >
          <IoMdArrowBack size={20} />
          <span className="text-sm font-medium">กลับไปยังโพสต์ของฉัน</span>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#1c2a48] mb-2">แก้ไขโพสต์</h1>
          <p className="text-[#7a8b99]">แก้ไขข้อมูลโพสต์ของคุณ</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-2xl">
            {error}
          </div>
        )}

        {/* Edit Form */}
        <div className="bg-white rounded-3xl border border-[#dee5ed] shadow-lg p-8">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-[#1c2a48] mb-2">
                หัวข้อ
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-[#dee5ed] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#405168] focus:border-transparent"
                placeholder="กรอกหัวข้อโพสต์"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-[#1c2a48] mb-2">
                เนื้อหา
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="w-full px-4 py-3 border border-[#dee5ed] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#405168] focus:border-transparent resize-none"
                placeholder="กรอกเนื้อหาโพสต์"
              />
            </div>

            {/* Tag */}
            <div>
              <label className="block text-sm font-medium text-[#1c2a48] mb-2">
                แท็ก
              </label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-full px-4 py-3 border border-[#dee5ed] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#405168] focus:border-transparent"
                placeholder="กรอกแท็กโพสต์"
              />
            </div>

            {/* Attachments Info */}
            {post.attachments && post.attachments.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-[#1c2a48] mb-2">
                  ไฟล์ที่แนบ
                </label>
                <div className="space-y-2">
                  {post.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="p-3 bg-[#f8f9fa] border border-[#dee5ed] rounded-xl text-sm text-[#7a8b99]"
                    >
                      📎 {attachment.file_name} ({(attachment.file_size / 1024).toFixed(2)} KB)
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-6 py-3 bg-[#405168] text-white rounded-3xl hover:bg-[#2d3a4c] disabled:opacity-50 transition-colors font-medium"
              >
                {isSaving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
              </button>
              <Link
                href="/my-posts"
                className="flex-1 px-6 py-3 border border-[#e0e7f1] text-[#405168] rounded-3xl hover:bg-[#f8f9fa] transition-colors font-medium text-center"
              >
                ยกเลิก
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Sign In Required Modal */}
      {showSignInPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black opacity-50"
            onClick={() => setShowSignInPrompt(false)}
          ></div>
          <div className="relative bg-white rounded-3xl border border-[#e0e7f1] shadow-xl max-w-md w-full p-8">
            <button
              onClick={() => setShowSignInPrompt(false)}
              className="absolute top-4 right-4 p-2 text-[#7a8b99] hover:text-[#405168] transition-colors cursor-pointer"
            >
              <IoMdClose size={20} />
            </button>

            <div className="text-center">
              <div className="text-4xl mb-4">⏱️</div>
              <h2 className="text-2xl font-bold text-[#1c2a48] mb-4">
                เซสชันหมดอายุแล้ว
              </h2>
              <p className="text-[#7a8b99] mb-6">
                กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ
              </p>

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
