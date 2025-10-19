"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/use-auth";
import LoadingSpinner from "../components/loading-spinner";
import * as statisticsService from "@/services/statistics.service";
import * as profileService from "@/services/profile.service";
import * as postService from "@/services/post.service";
import * as analyticsService from "@/services/analytics.service";
import * as likeService from "@/services/like.service";
import { 
    IoMdPeople, 
    IoMdDocument, 
    IoMdChatbubbles, 
    IoMdCloudUpload,
    IoMdTrendingUp,
    IoMdCalendar,
    IoMdEye,
    IoMdHeart,
    IoMdTime,
    IoMdPerson,
    IoMdTrash,
    IoMdCreate,
    IoMdCloudDownload
} from "react-icons/io";

interface Statistics {
    totalPosts: number;
    totalMembers: number;
    postsThisMonth: number;
    totalComments: number;
    totalFiles: number;
    totalLikes: number;
    totalViews: number;
    totalDownloads: number;
}

interface RecentPost {
    id: string;
    title: string;
    author: {
        name: string;
    };
    createdAt: string;
    views: number;
    likes: number;
    downloads: number;
    comments: number;
}

export default function AdminDashboard() {
    const { isSignedIn, isLoading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<Statistics | null>(null);
    const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
    const [topPosts, setTopPosts] = useState<RecentPost[]>([]);
    const [topTab, setTopTab] = useState<'views' | 'likes' | 'downloads'>('views');
    const [userRole, setUserRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Check authentication and authorization
    useEffect(() => {
        const checkAuth = async () => {
            if (isLoading) return;

            if (!isSignedIn) {
                router.push('/signin');
                return;
            }

            // Check if user is admin
            try {
                const result = await profileService.getProfile();
                if (result.error) {
                    setError('ไม่สามารถตรวจสอบสิทธิ์ได้');
                    return;
                }

                if (result.profile?.userRole !== 'admin') {
                    router.push('/');
                    return;
                }

                setUserRole(result.profile.userRole);
                await fetchDashboardData();
            } catch (err) {
                setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
                console.error('Error:', err);
            }
        };

        checkAuth();
    }, [isSignedIn, isLoading, router]);

    // Fetch dashboard data
    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Fetch statistics
            const statsResult = await statisticsService.getStatistics();
            if (statsResult.stats) {
                setStats(statsResult.stats);
            }

            // Fetch recent posts
            const postsResult = await postService.getPosts(5);
            if (postsResult.posts) {
                // Fetch analytics data for each post
                const postsWithAnalytics = await Promise.all(
                    postsResult.posts.map(async (post: postService.Post) => {
                        const postId = post.id.toString();
                        
                        // Fetch view count
                        let views = 0;
                        try {
                            const viewResult = await analyticsService.getPostViewCount(postId);
                            views = viewResult.viewCount || 0;
                        } catch (err) {
                            console.error(`Error fetching views for post ${postId}:`, err);
                        }

                        // Fetch like count
                        let likes = 0;
                        try {
                            const likeResult = await likeService.getPostLikeStatus(Number(postId));
                            likes = likeResult.data?.likeCount || 0;
                        } catch (err) {
                            console.error(`Error fetching likes for post ${postId}:`, err);
                        }

                        // Get download count from all attachments
                        let downloads = 0;
                        if (post.attachments && post.attachments.length > 0) {
                            try {
                                const fileIds = post.attachments.map(att => att.id);
                                const downloadResult = await analyticsService.getMultipleFileDownloads(fileIds);
                                if (downloadResult.data) {
                                    downloads = downloadResult.data.reduce((sum, file) => sum + file.downloadCount, 0);
                                }
                            } catch (err) {
                                console.error(`Error fetching downloads for post ${postId}:`, err);
                            }
                        }

                        // Get comment count
                        const comments = post.comment_count || 0;

                        return {
                            id: postId,
                            title: post.title,
                            author: {
                                name: post.user_info ? `${post.user_info.firstName} ${post.user_info.lastName}` : 'Unknown'
                            },
                            createdAt: post.created_at || post.createdAt || new Date().toISOString(),
                            views,
                            likes,
                            downloads,
                            comments
                        };
                    })
                );
                
                setRecentPosts(postsWithAnalytics);
            }

            // Fetch top posts (more posts for better analytics)
            const topPostsResult = await postService.getPosts(20);
            if (topPostsResult.posts) {
                const topPostsWithAnalytics = await Promise.all(
                    topPostsResult.posts.map(async (post: postService.Post) => {
                        const postId = post.id.toString();
                        
                        let views = 0;
                        try {
                            const viewResult = await analyticsService.getPostViewCount(postId);
                            views = viewResult.viewCount || 0;
                        } catch (err) {
                            console.error(`Error fetching views for post ${postId}:`, err);
                        }

                        let likes = 0;
                        try {
                            const likeResult = await likeService.getPostLikeStatus(Number(postId));
                            likes = likeResult.data?.likeCount || 0;
                        } catch (err) {
                            console.error(`Error fetching likes for post ${postId}:`, err);
                        }

                        let downloads = 0;
                        if (post.attachments && post.attachments.length > 0) {
                            try {
                                const fileIds = post.attachments.map(att => att.id);
                                const downloadResult = await analyticsService.getMultipleFileDownloads(fileIds);
                                if (downloadResult.data) {
                                    downloads = downloadResult.data.reduce((sum, file) => sum + file.downloadCount, 0);
                                }
                            } catch (err) {
                                console.error(`Error fetching downloads for post ${postId}:`, err);
                            }
                        }

                        const comments = post.comment_count || 0;

                        return {
                            id: postId,
                            title: post.title,
                            author: {
                                name: post.user_info ? `${post.user_info.firstName} ${post.user_info.lastName}` : 'Unknown'
                            },
                            createdAt: post.created_at || post.createdAt || new Date().toISOString(),
                            views,
                            likes,
                            downloads,
                            comments
                        };
                    })
                );
                
                setTopPosts(topPostsWithAnalytics);
            }
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (isLoading || loading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] to-[#e9ecef] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-[#1c2a48] mb-2">เกิดข้อผิดพลาด</h2>
                    <p className="text-[#7a8b99] mb-6">{error}</p>
                    <button
                        onClick={() => router.push('/')}
                        className="px-6 py-3 bg-[#405168] text-white rounded-xl hover:bg-[#2d3a4c] transition-colors"
                    >
                        กลับสู่หน้าหลัก
                    </button>
                </div>
            </div>
        );
    }

    if (userRole !== 'admin') {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] to-[#e9ecef]">
            {/* Header */}
            <div className="bg-white border-b border-[#dee5ed]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-[#1c2a48] flex items-center gap-3">
                                <IoMdTrendingUp className="text-[#405168]" />
                                แดชบอร์ดแอดมิน
                            </h1>
                            <p className="text-[#7a8b99] mt-1">จัดการและควบคุมเว็บไซต์ RuamLem</p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[#7a8b99]">
                            <IoMdCalendar size={18} />
                            <span>{new Date().toLocaleDateString('th-TH', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                    {/* Total Members */}
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-white bg-opacity-20 p-3 rounded-xl">
                                <IoMdPeople size={28} />
                            </div>
                            <IoMdTrendingUp size={20} className="opacity-60" />
                        </div>
                        <h3 className="text-sm font-medium opacity-90 mb-1">สมาชิกทั้งหมด</h3>
                        <p className="text-3xl font-bold">{stats?.totalMembers?.toLocaleString() || 0}</p>
                    </div>

                    {/* Total Posts */}
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-white bg-opacity-20 p-3 rounded-xl">
                                <IoMdDocument size={28} />
                            </div>
                            <IoMdTrendingUp size={20} className="opacity-60" />
                        </div>
                        <h3 className="text-sm font-medium opacity-90 mb-1">โพสต์ทั้งหมด</h3>
                        <p className="text-3xl font-bold">{stats?.totalPosts?.toLocaleString() || 0}</p>
                    </div>

                    {/* Posts This Month */}
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-white bg-opacity-20 p-3 rounded-xl">
                                <IoMdCalendar size={28} />
                            </div>
                            <IoMdTrendingUp size={20} className="opacity-60" />
                        </div>
                        <h3 className="text-sm font-medium opacity-90 mb-1">โพสต์เดือนนี้</h3>
                        <p className="text-3xl font-bold">{stats?.postsThisMonth?.toLocaleString() || 0}</p>
                    </div>

                    {/* Total Comments */}
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-white bg-opacity-20 p-3 rounded-xl">
                                <IoMdChatbubbles size={28} />
                            </div>
                            <IoMdTrendingUp size={20} className="opacity-60" />
                        </div>
                        <h3 className="text-sm font-medium opacity-90 mb-1">ความคิดเห็นทั้งหมด</h3>
                        <p className="text-3xl font-bold">{stats?.totalComments?.toLocaleString() || 0}</p>
                    </div>

                    {/* Total Likes */}
                    <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-white bg-opacity-20 p-3 rounded-xl">
                                <IoMdHeart size={28} />
                            </div>
                            <IoMdTrendingUp size={20} className="opacity-60" />
                        </div>
                        <h3 className="text-sm font-medium opacity-90 mb-1">ไลค์ทั้งหมด</h3>
                        <p className="text-3xl font-bold">{stats?.totalLikes?.toLocaleString() || 0}</p>
                    </div>
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                    {/* Total Files */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-[#dee5ed]">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 text-[#7a8b99] mb-2">
                                    <IoMdCloudUpload size={20} />
                                    <span className="text-sm font-medium">ไฟล์ที่อัปโหลด</span>
                                </div>
                                <p className="text-3xl font-bold text-[#1c2a48]">
                                    {stats?.totalFiles?.toLocaleString() || 0}
                                </p>
                            </div>
                            <div className="bg-[#f8f9fa] p-4 rounded-xl">
                                <IoMdCloudUpload size={32} className="text-[#405168]" />
                            </div>
                        </div>
                    </div>

                    {/* Total Views */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-[#dee5ed]">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 text-[#7a8b99] mb-2">
                                    <IoMdEye size={20} />
                                    <span className="text-sm font-medium">การดูทั้งหมด</span>
                                </div>
                                <p className="text-3xl font-bold text-[#1c2a48]">
                                    {stats?.totalViews?.toLocaleString() || 0}
                                </p>
                            </div>
                            <div className="bg-[#f8f9fa] p-4 rounded-xl">
                                <IoMdEye size={32} className="text-[#405168]" />
                            </div>
                        </div>
                    </div>

                    {/* Total Downloads */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-[#dee5ed]">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 text-[#7a8b99] mb-2">
                                    <IoMdCloudUpload size={20} />
                                    <span className="text-sm font-medium">ดาวน์โหลดทั้งหมด</span>
                                </div>
                                <p className="text-3xl font-bold text-[#1c2a48]">
                                    {stats?.totalDownloads?.toLocaleString() || 0}
                                </p>
                            </div>
                            <div className="bg-[#f8f9fa] p-4 rounded-xl">
                                <IoMdCloudUpload size={32} className="text-[#405168]" />
                            </div>
                        </div>
                    </div>

                    {/* Average Posts Per User */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-[#dee5ed]">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 text-[#7a8b99] mb-2">
                                    <IoMdCreate size={20} />
                                    <span className="text-sm font-medium">โพสต์เฉลี่ย/คน</span>
                                </div>
                                <p className="text-3xl font-bold text-[#1c2a48]">
                                    {stats?.totalMembers && stats?.totalPosts 
                                        ? (stats.totalPosts / stats.totalMembers).toFixed(1)
                                        : '0.0'
                                    }
                                </p>
                            </div>
                            <div className="bg-[#f8f9fa] p-4 rounded-xl">
                                <IoMdPerson size={32} className="text-[#405168]" />
                            </div>
                        </div>
                    </div>

                    {/* Engagement Rate */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-[#dee5ed]">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 text-[#7a8b99] mb-2">
                                    <IoMdHeart size={20} />
                                    <span className="text-sm font-medium">อัตราการมีส่วนร่วม</span>
                                </div>
                                <p className="text-3xl font-bold text-[#1c2a48]">
                                    {stats?.totalPosts && (stats?.totalComments || stats?.totalLikes)
                                        ? (((stats.totalComments + stats.totalLikes) / stats.totalPosts) * 100).toFixed(0)
                                        : '0'
                                    }%
                                </p>
                            </div>
                            <div className="bg-[#f8f9fa] p-4 rounded-xl">
                                <IoMdTrendingUp size={32} className="text-[#405168]" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Posts Table */}
                <div className="bg-white rounded-2xl shadow-lg border border-[#dee5ed] overflow-hidden">
                    <div className="p-6 border-b border-[#dee5ed]">
                        <h2 className="text-xl font-bold text-[#1c2a48] flex items-center gap-2">
                            <IoMdTime size={24} />
                            โพสต์ล่าสุด
                        </h2>
                        <p className="text-[#7a8b99] text-sm mt-1">โพสต์ที่เผยแพร่ล่าสุดในระบบ</p>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#f8f9fa]">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#7a8b99] uppercase tracking-wider min-w-[250px] max-w-[400px]">
                                        ชื่อโพสต์
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#7a8b99] uppercase tracking-wider min-w-[150px]">
                                        ผู้เขียน
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#7a8b99] uppercase tracking-wider min-w-[180px]">
                                        วันที่สร้าง
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-[#7a8b99] uppercase tracking-wider min-w-[80px]">
                                        <div className="flex items-center justify-center gap-1">
                                            <IoMdEye size={16} />
                                            <span>ดู</span>
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-[#7a8b99] uppercase tracking-wider min-w-[80px]">
                                        <div className="flex items-center justify-center gap-1">
                                            <IoMdHeart size={16} />
                                            <span>ไลค์</span>
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-[#7a8b99] uppercase tracking-wider min-w-[100px]">
                                        <div className="flex items-center justify-center gap-1">
                                            <IoMdCloudDownload size={16} />
                                            <span>ดาวน์โหลด</span>
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-[#7a8b99] uppercase tracking-wider min-w-[100px]">
                                        <div className="flex items-center justify-center gap-1">
                                            <IoMdChatbubbles size={16} />
                                            <span>ความคิดเห็น</span>
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-[#7a8b99] uppercase tracking-wider min-w-[120px]">
                                        การดำเนินการ
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#dee5ed]">
                                {recentPosts.length > 0 ? (
                                    recentPosts.map((post, index) => (
                                        <tr 
                                            key={post.id}
                                            className="hover:bg-[#f8f9fa] transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 bg-gradient-to-br from-[#405168] to-[#5e7593] rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                                        {index + 1}
                                                    </div>
                                                    <span className="font-medium text-[#1c2a48] line-clamp-1 overflow-hidden text-ellipsis">
                                                        {post.title}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <IoMdPerson size={18} className="text-[#7a8b99] flex-shrink-0" />
                                                    <span className="text-[#405168] truncate">{post.author.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-[#7a8b99] text-sm">
                                                {formatDate(post.createdAt)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center gap-1 text-[#7a8b99]">
                                                    {post.views.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center gap-1 text-[#7a8b99]">
                                                    {post.likes.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center gap-1 text-[#7a8b99]">
                                                    {post.downloads.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center gap-1 text-[#7a8b99]">
                                                    {post.comments.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => router.push(`/post/${post.id}`)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="ดูโพสต์"
                                                    >
                                                        <IoMdEye size={20} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('คุณต้องการลบโพสต์นี้หรือไม่?')) {
                                                                // TODO: Implement delete functionality
                                                                alert('ฟังก์ชันลบยังไม่ได้ implement');
                                                            }
                                                        }}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="ลบโพสต์"
                                                    >
                                                        <IoMdTrash size={20} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-[#7a8b99]">
                                            <div className="flex flex-col items-center gap-3">
                                                <IoMdDocument size={48} className="opacity-30" />
                                                <p>ไม่มีโพสต์ในขณะนี้</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top Performing Posts */}
                <div className="bg-white rounded-2xl shadow-lg border border-[#dee5ed] overflow-hidden mt-8">
                    <div className="p-6 border-b border-[#dee5ed]">
                        <h2 className="text-xl font-bold text-[#1c2a48] flex items-center gap-2 mb-4">
                            <IoMdTrendingUp size={24} />
                            โพสต์ยอดนิยม
                        </h2>
                        
                        {/* Tabs */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setTopTab('views')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    topTab === 'views'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-[#f8f9fa] text-[#7a8b99] hover:bg-[#dee5ed]'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <IoMdEye size={18} />
                                    <span>ดูมากที่สุด</span>
                                </div>
                            </button>
                            <button
                                onClick={() => setTopTab('likes')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    topTab === 'likes'
                                        ? 'bg-pink-500 text-white'
                                        : 'bg-[#f8f9fa] text-[#7a8b99] hover:bg-[#dee5ed]'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <IoMdHeart size={18} />
                                    <span>ไลค์มากที่สุด</span>
                                </div>
                            </button>
                            <button
                                onClick={() => setTopTab('downloads')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    topTab === 'downloads'
                                        ? 'bg-green-500 text-white'
                                        : 'bg-[#f8f9fa] text-[#7a8b99] hover:bg-[#dee5ed]'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <IoMdCloudDownload size={18} />
                                    <span>ดาวน์โหลดมากที่สุด</span>
                                </div>
                            </button>
                        </div>
                    </div>
                    
                    <div className="p-6">
                        <div className="space-y-4">
                            {topPosts
                                .sort((a, b) => {
                                    if (topTab === 'views') return b.views - a.views;
                                    if (topTab === 'likes') return b.likes - a.likes;
                                    return b.downloads - a.downloads;
                                })
                                .slice(0, 10)
                                .map((post, index) => {
                                    const value = topTab === 'views' ? post.views : topTab === 'likes' ? post.likes : post.downloads;
                                    const icon = topTab === 'views' ? <IoMdEye size={20} /> : topTab === 'likes' ? <IoMdHeart size={20} /> : <IoMdCloudDownload size={20} />;
                                    const colorClass = topTab === 'views' ? 'text-blue-600' : topTab === 'likes' ? 'text-pink-600' : 'text-green-600';
                                    const bgClass = topTab === 'views' ? 'bg-blue-50' : topTab === 'likes' ? 'bg-pink-50' : 'bg-green-50';
                                    
                                    return (
                                        <div
                                            key={post.id}
                                            className="flex items-center gap-4 p-4 rounded-xl border border-[#dee5ed] hover:shadow-md transition-all group cursor-pointer"
                                            onClick={() => router.push(`/post/${post.id}`)}
                                        >
                                            {/* Rank Badge */}
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white ${
                                                index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                                                index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                                                index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                                                'bg-gradient-to-br from-[#405168] to-[#5e7593]'
                                            }`}>
                                                {index + 1}
                                            </div>
                                            
                                            {/* Post Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-[#1c2a48] line-clamp-1 group-hover:text-[#405168] transition-colors">
                                                    {post.title}
                                                </h3>
                                                <div className="flex items-center gap-4 mt-1 text-sm text-[#7a8b99]">
                                                    <div className="flex items-center gap-1">
                                                        <IoMdPerson size={16} />
                                                        <span>{post.author.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="flex items-center gap-1">
                                                            <IoMdEye size={16} />
                                                            {post.views.toLocaleString()}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <IoMdHeart size={16} />
                                                            {post.likes.toLocaleString()}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <IoMdCloudDownload size={16} />
                                                            {post.downloads.toLocaleString()}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <IoMdChatbubbles size={16} />
                                                            {post.comments.toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Highlighted Metric */}
                                            <div className={`px-6 py-3 rounded-xl ${bgClass} flex items-center gap-2 ${colorClass} font-bold`}>
                                                {icon}
                                                <span className="text-2xl">{value.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            
                            {topPosts.length === 0 && (
                                <div className="text-center py-12 text-[#7a8b99]">
                                    <IoMdDocument size={48} className="mx-auto opacity-30 mb-3" />
                                    <p>ไม่มีข้อมูลในขณะนี้</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <button
                        onClick={() => router.push('/community')}
                        className="bg-white hover:bg-[#f8f9fa] border border-[#dee5ed] rounded-2xl p-6 text-left transition-all hover:shadow-lg group"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <IoMdDocument size={32} className="text-[#405168] group-hover:scale-110 transition-transform" />
                            <span className="text-[#7a8b99] text-sm">→</span>
                        </div>
                        <h3 className="font-bold text-[#1c2a48] mb-1">จัดการโพสต์</h3>
                        <p className="text-[#7a8b99] text-sm">ดูและจัดการโพสต์ทั้งหมด</p>
                    </button>

                    <button
                        onClick={() => alert('ฟังก์ชันจัดการสมาชิกยังไม่ได้ implement')}
                        className="bg-white hover:bg-[#f8f9fa] border border-[#dee5ed] rounded-2xl p-6 text-left transition-all hover:shadow-lg group"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <IoMdPeople size={32} className="text-[#405168] group-hover:scale-110 transition-transform" />
                            <span className="text-[#7a8b99] text-sm">→</span>
                        </div>
                        <h3 className="font-bold text-[#1c2a48] mb-1">จัดการสมาชิก</h3>
                        <p className="text-[#7a8b99] text-sm">ดูและจัดการสมาชิกทั้งหมด</p>
                    </button>

                    <button
                        onClick={() => fetchDashboardData()}
                        className="bg-gradient-to-br from-[#405168] to-[#5e7593] hover:from-[#2d3a4c] hover:to-[#405168] text-white rounded-2xl p-6 text-left transition-all hover:shadow-lg group"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <IoMdTrendingUp size={32} className="group-hover:scale-110 transition-transform" />
                            <span className="text-sm">↻</span>
                        </div>
                        <h3 className="font-bold mb-1">รีเฟรชข้อมูล</h3>
                        <p className="text-white text-opacity-80 text-sm">อัปเดตข้อมูลล่าสุด</p>
                    </button>
                </div>
            </div>
        </div>
    );
}
