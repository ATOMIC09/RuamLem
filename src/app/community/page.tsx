"use client";

import { useEffect, useState } from "react";
import { HiSortDescending } from "react-icons/hi";
import SearchBox from "../components/searchbox";
import PreviewPost from "../components/previewpost";
import PostButton from "../components/post-button";
import * as postService from "@/services/post.service";
import AuthGuard from "../components/auth-guard";

function CommunityPageContent() {
  const [posts, setPosts] = useState<postService.Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setIsLoading(true);
    setError("");
    const result = await postService.getPosts(10);
    if (result.error) {
      setError(result.error);
    } else if (result.posts) {
      setPosts(result.posts);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen items-center p-8 sm:p-20">
      {/* Page Header */}
      <div className="w-full max-w-4xl mx-auto mb-8">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-[#1c2a48] mb-2">ชุมชนรวมเล่ม</h1>
          <p className="text-lg text-[#5e7593]">แชร์ความรู้ ช่วยเหลือกัน เรียนรู้ไปด้วยกัน</p>
        </div>
        
        <SearchBox />
        
        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mt-6 gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <span className="text-sm text-[#5e7593] text-center sm:text-left">จัดเรียงโดย:</span>
            <div className="flex gap-2">
              <select className="flex-1 sm:flex-none px-3 py-2 bg-white border border-[#e0e7f1] rounded-3xl text-[#405168] focus:outline-none focus:ring-2 focus:ring-[#5e7593] text-sm cursor-pointer shadow-sm hover:shadow-md transition-shadow">
                <option>ล่าสุด</option>
                <option>ยอดนิยม</option>
                <option>เก่าสุด</option>
                <option>ตามชื่อ</option>
              </select>
              <button className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-2 text-sm text-[#5e7593] hover:text-[#405168] transition-colors bg-white border border-[#e0e7f1] rounded-3xl hover:shadow-md shadow-sm cursor-pointer">
                <HiSortDescending />
                <span className="hidden sm:inline">กลับด้าน</span>
                <span className="sm:hidden">↕</span>
              </button>
            </div>
          </div>
          
          <PostButton className="w-full sm:w-auto px-6 py-3 bg-[#405168] text-white rounded-3xl hover:bg-[#2d3a4c] transition-colors font-medium shadow-sm hover:shadow-md cursor-pointer">
            เพิ่มโพสต์
          </PostButton>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="w-full max-w-6xl mx-auto">
        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-16">
            <p className="text-[#5e7593]">กำลังโหลดโพสต์...</p>
          </div>
        )}

        {/* Stats Bar */}
        {!isLoading && (
          <div className="mb-6 text-center">
            <p className="text-sm text-[#7a8b99]">แสดง {posts.length} โพสต์</p>
          </div>
        )}
        
        {/* Responsive Grid */}
        {!isLoading && posts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {posts.map((post) => (
              <PreviewPost
                key={post.id}
                post={{
                  id: String(post.id),
                  title: post.title,
                  description: post.body,
                  author: {
                    name: post.user_info 
                      ? `${post.user_info.firstName} ${post.user_info.lastName}`
                      : post.author 
                      ? `${post.author.firstName} ${post.author.lastName}`
                      : "Anonymous",
                  },
                  createdAt: new Date(post.created_at || post.createdAt || new Date()).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                  category: post.tags && post.tags.length > 0 
                    ? post.tags[0].name 
                    : post.tag || "General",
                  attachments: post.file ? [{ 
                    name: post.file.file_name, 
                    size: `${(post.file.file_size / 1024 / 1024).toFixed(2)} MB`, 
                    type: post.file.file_name.split('.').pop() || "file" 
                  }] : (post.pdfUrl || post.filePath ? [{ name: "File", size: "", type: "pdf" }] : []),
                  commentCount: post.comment_count,
                }}
                fileName={post.file?.file_url}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && posts.length === 0 && !error && (
          <div className="w-full max-w-2xl mx-auto text-center py-16">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-[#1c2a48] mb-2">ยังไม่มีโพสต์</h3>
            <p className="text-[#5e7593] mb-6">เป็นคนแรกที่แชร์ความรู้ในชุมชน!</p>
          </div>
        )}
        
        {/* Load More Button */}
        {!isLoading && posts.length > 0 && (
          <div className="text-center mt-8">
            <button className="px-8 py-3 bg-white border border-[#e0e7f1] text-[#405168] rounded-3xl hover:bg-[#f8f9fa] hover:shadow-md transition-all shadow-sm font-medium cursor-pointer">
              โหลดเพิ่มเติม
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CommunityPage() {
  return (
    <AuthGuard required={false}>
      <CommunityPageContent />
    </AuthGuard>
  );
}