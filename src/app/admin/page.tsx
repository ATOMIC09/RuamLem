"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/use-auth";
import LoadingSpinner from "../components/loading-spinner";
import * as statisticsService from "@/services/statistics.service";
import * as profileService from "@/services/profile.service";
import * as postService from "@/services/post.service";
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
    IoMdCreate
} from "react-icons/io";

interface Statistics {
    totalPosts: number;
    totalMembers: number;
    postsThisMonth: number;
    totalComments: number;
    totalFiles: number;
    totalLikes: number;
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
}

export default function AdminDashboard() {
    const { isSignedIn, isLoading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<Statistics | null>(null);
    const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
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
                setRecentPosts(postsResult.posts.map((post: postService.Post) => ({
                    id: post.id.toString(),
                    title: post.title,
                    author: {
                        name: post.user_info ? `${post.user_info.firstName} ${post.user_info.lastName}` : 'Unknown'
                    },
                    createdAt: post.created_at || post.createdAt || new Date().toISOString(),
                    views: 0, // Not available in current API
                    likes: 0  // Not available in current API
                })));
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#7a8b99] uppercase tracking-wider">
                                        ชื่อโพสต์
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#7a8b99] uppercase tracking-wider">
                                        ผู้เขียน
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#7a8b99] uppercase tracking-wider">
                                        วันที่สร้าง
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-[#7a8b99] uppercase tracking-wider">
                                        <IoMdEye className="inline" size={16} />
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-[#7a8b99] uppercase tracking-wider">
                                        <IoMdHeart className="inline" size={16} />
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-[#7a8b99] uppercase tracking-wider">
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
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-gradient-to-br from-[#405168] to-[#5e7593] rounded-lg flex items-center justify-center text-white text-sm font-bold">
                                                        {index + 1}
                                                    </div>
                                                    <span className="font-medium text-[#1c2a48] line-clamp-1">
                                                        {post.title}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <IoMdPerson size={18} className="text-[#7a8b99]" />
                                                    <span className="text-[#405168]">{post.author.name}</span>
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
                                        <td colSpan={6} className="px-6 py-12 text-center text-[#7a8b99]">
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
