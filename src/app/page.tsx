"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IoMdTrendingUp, IoMdPeople } from "react-icons/io";
import { FaBookOpen, FaUsers, FaFileAlt } from "react-icons/fa";
import LoadingSpinner from "./components/loading-spinner";
import PreviewPost from "./components/previewpost";
import PostButton from "./components/post-button";
import * as postService from "@/services/post.service";

interface TagWithCount {
  name: string;
  count: number;
  color: string;
}

export default function Home() {
  const [recentPosts, setRecentPosts] = useState<postService.Post[]>([]);
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalMembers: 850, // This would need a backend endpoint
    postsThisMonth: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch posts
      const postsResult = await postService.getPosts(100);
      if (postsResult.posts && Array.isArray(postsResult.posts)) {
        // Get recent 3 posts
        const recent = postsResult.posts.slice(0, 3);
        setRecentPosts(recent);

        // Calculate stats
        const now = new Date();
        const thisMonth = postsResult.posts.filter(post => {
          const postDate = new Date(post.created_at || post.createdAt || new Date());
          return postDate.getMonth() === now.getMonth() && postDate.getFullYear() === now.getFullYear();
        }).length;

        setStats(prev => ({
          ...prev,
          totalPosts: postsResult.posts!.length,
          postsThisMonth: thisMonth,
        }));

        // Count posts by tag
        const tagMap = new Map<string, number>();
        postsResult.posts!.forEach(post => {
          if (post.tags && post.tags.length > 0) {
            post.tags.forEach(tag => {
              tagMap.set(tag.name, (tagMap.get(tag.name) || 0) + 1);
            });
          }
        });

        // Convert to array and sort by count
        const tagList = Array.from(tagMap, ([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);

        // Add colors
        const colors = [
          "bg-blue-50 text-blue-600",
          "bg-green-50 text-green-600",
          "bg-purple-50 text-purple-600",
          "bg-orange-50 text-orange-600",
          "bg-teal-50 text-teal-600",
          "bg-red-50 text-red-600",
          "bg-indigo-50 text-indigo-600",
          "bg-pink-50 text-pink-600",
        ];

        const tagsWithColors = tagList.map((tag, index) => ({
          ...tag,
          color: colors[index % colors.length],
        }));

        setTags(tagsWithColors);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
    setIsLoading(false);
  };

  const scrollToContent = () => {
    const contentSection = document.getElementById('content');
    if (contentSection) {
      contentSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen">
      {/* Hero Section */}
      <div className="w-full bg-gradient-to-b from-[#f8f9fa] to-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Title */}
          <div className="text-[#5e7593] mb-8">
            <h1 className="text-5xl md:text-7xl font-bold mb-4">&quot;รวมเล่ม&quot;</h1>
            <p className="text-xl md:text-2xl mb-2">วาร์ปความรู้ ข้อสอบครบ</p>
            <p className="text-lg text-[#7a8b99]">แพลตฟอร์มแชร์ความรู้สำหรับนักเรียน นักศึกษา</p>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0e7f1]">
              <FaBookOpen className="text-3xl text-[#405168] mx-auto mb-2" />
              <div className="text-2xl font-bold text-[#1c2a48]">{stats.totalPosts.toLocaleString()}</div>
              <div className="text-sm text-[#7a8b99]">เอกสารการเรียน</div>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0e7f1]">
              <FaUsers className="text-3xl text-[#405168] mx-auto mb-2" />
              <div className="text-2xl font-bold text-[#1c2a48]">{stats.totalMembers.toLocaleString()}</div>
              <div className="text-sm text-[#7a8b99]">สมาชิกในชุมชน</div>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0e7f1]">
              <FaFileAlt className="text-3xl text-[#405168] mx-auto mb-2" />
              <div className="text-2xl font-bold text-[#1c2a48]">{stats.postsThisMonth}</div>
              <div className="text-sm text-[#7a8b99]">โพสต์ใหม่เดือนนี้</div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/community"
              className="flex items-center justify-center gap-2 px-8 py-4 bg-[#405168] text-white rounded-3xl hover:bg-[#2d3a4c] transition-colors text-lg font-medium"
            >
              <IoMdPeople size={20} />
              เข้าสู่ชุมชน
            </Link>
            <PostButton variant="secondary">
              แชร์ความรู้
            </PostButton>
          </div>

          {/* Scroll indicator */}
          <div className="mt-12">
            <button
              onClick={scrollToContent}
              className="inline-flex items-center text-[#7a8b99] hover:text-[#405168] transition-colors cursor-pointer bg-transparent border-none"
            >
              <span className="mr-2">ดูโพสต์ล่าสุด</span>
              <div className="animate-bounce">↓</div>
            </button>
          </div>
        </div>
      </div>

      {/* Popular Categories */}
      <div className="w-full py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-[#1c2a48] text-center mb-8">หมวดหมู่ยอดนิยม</h2>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="md" text="กำลังโหลดหมวดหมู่..." />
            </div>
          ) : tags.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {tags.map((category, index) => (
                <Link
                  key={index}
                  href={`/community?tags=${encodeURIComponent(category.name)}`}
                  className={`p-4 rounded-2xl ${category.color} hover:shadow-md transition-all cursor-pointer text-center`}
                >
                  <div className="font-semibold">{category.name}</div>
                  <div className="text-sm opacity-70">{category.count} โพสต์</div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center text-[#7a8b99]">ยังไม่มีหมวดหมู่</div>
          )}
        </div>
      </div>

      {/* Recent Posts Section */}
      <div id="content" className="w-full py-16 px-6 bg-[#f8f9fa]">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-[#1c2a48] mb-2">โพสต์ล่าสุด</h2>
              <p className="text-[#7a8b99]">ความรู้ใหม่ ๆ จากสมาชิกในชุมชน</p>
            </div>
            <Link
              href="/community"
              className="flex items-center gap-2 px-6 py-3 bg-white border border-[#e0e7f1] text-[#405168] rounded-3xl hover:bg-[#f8f9fa] hover:shadow-md transition-all shadow-sm font-medium cursor-pointer"
            >
              <IoMdTrendingUp />
              ดูทั้งหมด
            </Link>
          </div>
          {/* Posts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {isLoading ? (
              <div className="col-span-3 flex justify-center py-8">
                <LoadingSpinner size="lg" text="กำลังโหลดโพสต์..." />
              </div>
            ) : recentPosts.length > 0 ? (
              recentPosts.map((post) => (
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
                      avatar: post.user_info?.avatarUrl || undefined,
                    },
                    createdAt: new Date(post.created_at || post.createdAt || new Date()).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                    category: post.tags && post.tags.length > 0 ? post.tags[0].name : post.tag || "General",
                    attachments: post.attachments || (post.file ? [post.file] : []),
                    commentCount: post.comment_count,
                  }}
                />
              ))
            ) : (
              <div className="col-span-3 text-center text-[#7a8b99]">ยังไม่มีโพสต์</div>
            )}
          </div>
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="w-full py-16 px-6 bg-[#405168] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">พร้อมเริ่มต้นแชร์ความรู้แล้วหรือยัง?</h2>
          <p className="text-xl mb-8 opacity-90">เข้าร่วมชุมชนเพื่อสังคมที่ดีกว่า</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <PostButton className="bg-white text-[#405168] hover:bg-gray-100 hover:text-[#405168]">
              เริ่มโพสต์เลย
            </PostButton>
            <Link 
              href="/signup"
              className="px-8 py-4 border-2 border-white text-white rounded-3xl hover:bg-white hover:text-[#405168] transition-colors text-lg font-medium cursor-pointer"
            >
              สมัครสมาชิก
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
