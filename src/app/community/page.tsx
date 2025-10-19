"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { HiSortDescending } from "react-icons/hi";
import LoadingSpinner from "../components/loading-spinner";
import SearchBox from "../components/searchbox";
import PreviewPost from "../components/previewpost";
import PostButton from "../components/post-button";
import * as postService from "@/services/post.service";
import AuthGuard from "../components/auth-guard";

function CommunityPageContent() {
  const params = useSearchParams();
  
  // Read filters from URL
  const queryParam = params?.get?.("q") || "";
  const tagsParam = useMemo(() => 
    params?.get?.("tags") ? params.get("tags")!.split(",").filter(t => t) : [],
    [params]
  );
  const dateRangeParam = params?.get?.("dateRange") || "";
  
  const [posts, setPosts] = useState<postService.Post[]>([]);
  const [allPosts, setAllPosts] = useState<postService.Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<postService.Post[]>([]);
  const [sortedAndFilteredPosts, setSortedAndFilteredPosts] = useState<postService.Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [itemsPerPage] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("ล่าสุด");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter posts when URL params or allPosts changes
  useEffect(() => {
    let result = allPosts;

    // Filter by search query (title, body, tags)
    if (queryParam) {
      const query = queryParam.toLowerCase();
      result = result.filter(post =>
        post.title.toLowerCase().includes(query) ||
        post.body.toLowerCase().includes(query) ||
        (post.tags && post.tags.some(tag => tag.name.toLowerCase().includes(query)))
      );
    }

    // Filter by tags
    if (tagsParam.length > 0) {
      result = result.filter(post =>
        post.tags && post.tags.some(tag => tagsParam.includes(tag.name))
      );
    }

    // Filter by date range
    if (dateRangeParam) {
      const now = new Date();
      result = result.filter(post => {
        const postDate = new Date(post.created_at || post.createdAt || new Date());
        
        // Get dates in YYYY-MM-DD format for comparison
        const todayString = now.toISOString().split('T')[0];
        const postDateString = postDate.toISOString().split('T')[0];
        
        // Calculate difference in days more accurately
        const diffTime = now.getTime() - postDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        switch (dateRangeParam) {
          case "วันนี้":
            return postDateString === todayString;
          case "สัปดาห์นี้":
            return diffDays >= 0 && diffDays < 7;
          case "เดือนนี้":
            return diffDays >= 0 && diffDays < 30;
          case "ปีนี้":
            return diffDays >= 0 && diffDays < 365;
          case "ล่าสุด":
          default:
            return true;
        }
      });
    }

    setFilteredPosts(result);
    setCurrentPage(1); // Reset to first page when filters change
  }, [queryParam, tagsParam, dateRangeParam, allPosts]);

  // Sort posts when sortBy or sortOrder changes
  useEffect(() => {
    const sortedPosts = [...filteredPosts];

    switch (sortBy) {
      case "ล่าสุด":
        sortedPosts.sort((a, b) => {
          const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
          const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
          return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
        });
        break;
      case "เก่าสุด":
        sortedPosts.sort((a, b) => {
          const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
          const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
          return sortOrder === "desc" ? dateA - dateB : dateB - dateA;
        });
        break;
      case "ยอดนิยม":
        sortedPosts.sort((a, b) => {
          const commentsA = a.comment_count || 0;
          const commentsB = b.comment_count || 0;
          return sortOrder === "desc" ? commentsB - commentsA : commentsA - commentsB;
        });
        break;
      case "ตามชื่อ":
        sortedPosts.sort((a, b) => {
          const titleA = a.title.toLowerCase();
          const titleB = b.title.toLowerCase();
          return sortOrder === "desc" ? titleB.localeCompare(titleA) : titleA.localeCompare(titleB);
        });
        break;
    }

    setSortedAndFilteredPosts(sortedPosts);
  }, [sortBy, sortOrder, filteredPosts]);

  // Update displayed posts when page changes
  useEffect(() => {
    const startIndex = 0;
    const endIndex = currentPage * itemsPerPage;
    setPosts(sortedAndFilteredPosts.slice(startIndex, endIndex));
  }, [currentPage, sortedAndFilteredPosts, itemsPerPage]);

  const fetchPosts = async () => {
    setIsLoading(true);
    setError("");
    // Fetch more posts to support pagination
    const result = await postService.getPosts(100);
    if (result.error) {
      setError(result.error);
    } else if (result.posts) {
      setAllPosts(result.posts);
      setFilteredPosts(result.posts);
      setSortedAndFilteredPosts(result.posts);
      setPosts(result.posts.slice(0, itemsPerPage));
      setCurrentPage(1);
    }
    setIsLoading(false);
  };

  const handleLoadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  const hasMorePosts = posts.length < sortedAndFilteredPosts.length;

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
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-2 bg-white border border-[#e0e7f1] rounded-3xl text-[#405168] focus:outline-none focus:ring-2 focus:ring-[#5e7593] text-sm cursor-pointer shadow-sm hover:shadow-md transition-shadow"
              >
                <option>ล่าสุด</option>
                <option>ยอดนิยม</option>
                <option>เก่าสุด</option>
                <option>ตามชื่อ</option>
              </select>
              <button 
                onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-2 text-sm font-medium transition-all rounded-3xl shadow-sm hover:shadow-md cursor-pointer border ${
                  sortOrder === "desc" 
                    ? "bg-white text-[#5e7593] border-[#e0e7f1] hover:text-[#405168]" 
                    : "bg-[#405168] text-white border-[#405168] hover:bg-[#2d3a4c]"
                }`}
              >
                <HiSortDescending className={`transition-transform ${sortOrder === "asc" ? "rotate-180" : ""}`} />
                <span className="hidden sm:inline">{sortOrder === "desc" ? "ลดลง" : "เพิ่มขึ้น"}</span>
                <span className="sm:hidden">{sortOrder === "desc" ? "↓" : "↑"}</span>
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
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" text="กำลังโหลดโพสต์..." />
          </div>
        )}

        {/* Stats Bar */}
        {!isLoading && (
          <div className="mb-6 text-center">
            <p className="text-sm text-[#7a8b99]">แสดง {posts.length} จาก {sortedAndFilteredPosts.length} โพสต์</p>
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
                    avatar: post.user_info?.avatarUrl || undefined,
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
                  attachments: post.attachments || (post.file ? [post.file] : []),
                  commentCount: post.comment_count,
                }}
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
        {!isLoading && posts.length > 0 && hasMorePosts && (
          <div className="text-center mt-8">
            <button 
              onClick={handleLoadMore}
              className="px-8 py-3 bg-white border border-[#e0e7f1] text-[#405168] rounded-3xl hover:bg-[#f8f9fa] hover:shadow-md transition-all shadow-sm font-medium cursor-pointer"
            >
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