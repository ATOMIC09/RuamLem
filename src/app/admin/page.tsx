"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../hooks/use-auth";
import LoadingSpinner from "../components/loading-spinner";
import * as statisticsService from "@/services/statistics.service";
import * as profileService from "@/services/profile.service";
import * as postService from "@/services/post.service";
import * as analyticsService from "@/services/analytics.service";
import * as likeService from "@/services/like.service";
import * as adminService from "@/services/admin.service";
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
    IoMdCloudDownload,
    IoMdClose,
    IoMdSwap
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
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [members, setMembers] = useState<adminService.User[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [showSignInPrompt, setShowSignInPrompt] = useState(false);
    
    // Notification modal states
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState<'success' | 'error' | 'info'>('info');
    
    // Confirmation modal states
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [confirmationMessage, setConfirmationMessage] = useState('');
    const [confirmationAction, setConfirmationAction] = useState<(() => void) | null>(null);

    // Helper function to show notification
    const showNotificationModal = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
    };

    // Helper function to show confirmation
    const showConfirmationModal = (message: string, onConfirm: () => void) => {
        setConfirmationMessage(message);
        setConfirmationAction(() => onConfirm);
        setShowConfirmation(true);
    };

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
    const fetchDashboardData = async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
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
            if (isRefresh) {
                setRefreshing(false);
            } else {
                setLoading(false);
            }
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

    // Check if error is JWT expiration
    const isJWTExpired = (error: string | undefined): boolean => {
        if (!error) return false;
        return error.includes('JWT') && error.includes('expired');
    };

    // Delete post function
    const handleDeletePost = async (postId: string) => {
        showConfirmationModal(
            'คุณแน่ใจหรือไม่ว่าต้องการลบโพสต์นี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้',
            async () => {
                try {
                    const result = await adminService.deletePostAsAdmin(Number(postId));
                    
                    if (result.success) {
                        showNotificationModal('ลบโพสต์สำเร็จ', 'success');
                        // Refresh dashboard data
                        await fetchDashboardData(true);
                    } else {
                        // Check for JWT expiration
                        if (isJWTExpired(result.error)) {
                            setShowSignInPrompt(true);
                        } else {
                            showNotificationModal(result.error || 'ไม่สามารถลบโพสต์ได้', 'error');
                        }
                    }
                } catch (err) {
                    console.error('Error deleting post:', err);
                    showNotificationModal('เกิดข้อผิดพลาดในการลบโพสต์', 'error');
                }
            }
        );
    };

    // Fetch all members
    const fetchMembers = async () => {
        setMembersLoading(true);
        try {
            const result = await adminService.getAllUsers();
            if (result.users) {
                setMembers(result.users);
            } else {
                // Check for JWT expiration
                if (isJWTExpired(result.error)) {
                    setShowSignInPrompt(true);
                } else {
                    showNotificationModal(result.error || 'ไม่สามารถดึงข้อมูลสมาชิกได้', 'error');
                }
            }
        } catch (err) {
            console.error('Error fetching members:', err);
            showNotificationModal('เกิดข้อผิดพลาดในการดึงข้อมูลสมาชิก', 'error');
        } finally {
            setMembersLoading(false);
        }
    };

    // Update member role
    const handleUpdateRole = async (userId: string, currentRole: string, userName: string) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        const roleText = newRole === 'admin' ? 'แอดมิน' : 'ผู้ใช้ทั่วไป';
        
        showConfirmationModal(
            `คุณต้องการเปลี่ยนสิทธิ์ของ "${userName}" เป็น "${roleText}" หรือไม่?`,
            async () => {
                try {
                    const result = await adminService.updateUserRole(userId, newRole);
                    
                    if (result.success) {
                        showNotificationModal('อัปเดตสิทธิ์สำเร็จ', 'success');
                        // Refresh members list
                        await fetchMembers();
                    } else {
                        // Check for JWT expiration
                        if (isJWTExpired(result.error)) {
                            setShowSignInPrompt(true);
                        } else {
                            showNotificationModal(result.error || 'ไม่สามารถอัปเดตสิทธิ์ได้', 'error');
                        }
                    }
                } catch (err) {
                    console.error('Error updating role:', err);
                    showNotificationModal('เกิดข้อผิดพลาดในการอัปเดตสิทธิ์', 'error');
                }
            }
        );
    };

    // Open member management modal
    const openMemberManagement = async () => {
        setShowMemberModal(true);
        await fetchMembers();
    };

    if (isLoading || loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] to-[#e9ecef] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
                    <LoadingSpinner />
                    <h2 className="text-2xl font-bold text-[#1c2a48] mt-6 mb-2">กำลังโหลดข้อมูล</h2>
                    <p className="text-[#7a8b99]">กรุณารอสักครู่...</p>
                </div>
            </div>
        );
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
            {/* Refreshing Indicator */}
            {refreshing && (
                <div className="fixed top-4 right-4 z-50 bg-white rounded-2xl shadow-lg p-4 flex items-center gap-3 border border-[#dee5ed] animate-in slide-in-from-top-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#405168] border-t-transparent"></div>
                    <span className="text-sm text-[#405168] font-medium">กำลังโหลดข้อมูล...</span>
                </div>
            )}
            
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4 md:gap-6 mb-8">
                    {/* Total Members */}
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-5 xl:p-6 text-white hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between mb-3 xl:mb-4">
                            <div className="bg-white/20 p-2.5 xl:p-3 rounded-xl">
                                <IoMdPeople size={24} className="xl:w-7 xl:h-7 text-white" />
                            </div>
                            <IoMdTrendingUp size={18} className="xl:w-5 xl:h-5 opacity-80" />
                        </div>
                        <h3 className="text-xs xl:text-sm font-medium opacity-90 mb-1">สมาชิกทั้งหมด</h3>
                        <p className="text-2xl xl:text-3xl font-bold">{stats?.totalMembers?.toLocaleString() || 0}</p>
                    </div>

                    {/* Total Posts */}
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-5 xl:p-6 text-white hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between mb-3 xl:mb-4">
                            <div className="bg-white/20 p-2.5 xl:p-3 rounded-xl">
                                <IoMdDocument size={24} className="xl:w-7 xl:h-7 text-white" />
                            </div>
                            <IoMdTrendingUp size={18} className="xl:w-5 xl:h-5 opacity-80" />
                        </div>
                        <h3 className="text-xs xl:text-sm font-medium opacity-90 mb-1">โพสต์ทั้งหมด</h3>
                        <p className="text-2xl xl:text-3xl font-bold">{stats?.totalPosts?.toLocaleString() || 0}</p>
                    </div>

                    {/* Posts This Month */}
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-5 xl:p-6 text-white hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between mb-3 xl:mb-4">
                            <div className="bg-white/20 p-2.5 xl:p-3 rounded-xl">
                                <IoMdCalendar size={24} className="xl:w-7 xl:h-7 text-white" />
                            </div>
                            <IoMdTrendingUp size={18} className="xl:w-5 xl:h-5 opacity-80" />
                        </div>
                        <h3 className="text-xs xl:text-sm font-medium opacity-90 mb-1">โพสต์เดือนนี้</h3>
                        <p className="text-2xl xl:text-3xl font-bold">{stats?.postsThisMonth?.toLocaleString() || 0}</p>
                    </div>

                    {/* Total Comments */}
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-5 xl:p-6 text-white hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between mb-3 xl:mb-4">
                            <div className="bg-white/20 p-2.5 xl:p-3 rounded-xl">
                                <IoMdChatbubbles size={24} className="xl:w-7 xl:h-7 text-white" />
                            </div>
                            <IoMdTrendingUp size={18} className="xl:w-5 xl:h-5 opacity-80" />
                        </div>
                        <h3 className="text-xs xl:text-sm font-medium opacity-90 mb-1">ความคิดเห็นทั้งหมด</h3>
                        <p className="text-2xl xl:text-3xl font-bold">{stats?.totalComments?.toLocaleString() || 0}</p>
                    </div>

                    {/* Total Likes */}
                    <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl shadow-lg p-5 xl:p-6 text-white hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between mb-3 xl:mb-4">
                            <div className="bg-white/20 p-2.5 xl:p-3 rounded-xl">
                                <IoMdHeart size={24} className="xl:w-7 xl:h-7 text-white" />
                            </div>
                            <IoMdTrendingUp size={18} className="xl:w-5 xl:h-5 opacity-80" />
                        </div>
                        <h3 className="text-xs xl:text-sm font-medium opacity-90 mb-1">ไลค์ทั้งหมด</h3>
                        <p className="text-2xl xl:text-3xl font-bold">{stats?.totalLikes?.toLocaleString() || 0}</p>
                    </div>
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4 md:gap-6 mb-8">
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
                                    recentPosts.map((post) => (
                                        <tr 
                                            key={post.id}
                                            className="hover:bg-[#f8f9fa] transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-7 h-7 bg-gradient-to-br from-[#405168] to-[#5e7593] rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                        #{post.id}
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
                                                        onClick={() => window.open(`/post/${post.id}`, '_blank')}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                                        title="ดูโพสต์"
                                                    >
                                                        <IoMdEye size={20} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePost(post.id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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
                                className={`px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
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
                                className={`px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
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
                                className={`px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
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
                                            onClick={() => window.open(`/post/${post.id}`, '_blank')}
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
                                                    <div className="flex items-center gap-1">
                                                        <IoMdPerson size={16} />
                                                        <span>{post.author.name}</span>
                                                    </div>
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
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    <button
                        onClick={() => router.push('/community')}
                        className="bg-white hover:bg-[#f8f9fa] border border-[#dee5ed] rounded-2xl p-6 text-left transition-all hover:shadow-lg group cursor-pointer"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <IoMdDocument size={32} className="text-[#405168] group-hover:scale-110 transition-transform" />
                            <span className="text-[#7a8b99] text-sm">→</span>
                        </div>
                        <h3 className="font-bold text-[#1c2a48] mb-1">หน้าชุมชน</h3>
                        <p className="text-[#7a8b99] text-sm">ดูโพสต์ทั้งหมด</p>
                    </button>

                    <button
                        onClick={openMemberManagement}
                        className="bg-white hover:bg-[#f8f9fa] border border-[#dee5ed] rounded-2xl p-6 text-left transition-all hover:shadow-lg group cursor-pointer"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <IoMdPeople size={32} className="text-[#405168] group-hover:scale-110 transition-transform" />
                            <span className="text-[#7a8b99] text-sm">→</span>
                        </div>
                        <h3 className="font-bold text-[#1c2a48] mb-1">จัดการสมาชิก</h3>
                        <p className="text-[#7a8b99] text-sm">ดูและจัดการสมาชิกทั้งหมด</p>
                    </button>

                    <button
                        onClick={() => fetchDashboardData(true)}
                        className="bg-gradient-to-br from-[#405168] to-[#5e7593] hover:from-[#2d3a4c] hover:to-[#405168] text-white rounded-2xl p-6 text-left transition-all hover:shadow-lg group cursor-pointer"
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

            {/* Member Management Modal */}
            {showMemberModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black opacity-50" onClick={() => setShowMemberModal(false)}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-[#405168] to-[#5e7593] p-6 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <IoMdPeople size={32} />
                                <div>
                                    <h2 className="text-2xl font-bold">จัดการสมาชิก</h2>
                                    <p className="text-sm opacity-90">ดูและจัดการสมาชิกทั้งหมดในระบบ</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowMemberModal(false)}
                                className="p-2 hover:bg-white hover:text-[#405168] hover:bg-opacity-20 rounded-lg transition-colors cursor-pointer"
                            >
                                <IoMdClose size={24} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                            {membersLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <LoadingSpinner />
                                </div>
                            ) : members.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-[#f8f9fa]">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-[#7a8b99] uppercase">
                                                    สมาชิก
                                                </th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-[#7a8b99] uppercase">
                                                    สิทธิ์
                                                </th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-[#7a8b99] uppercase">
                                                    วันที่สมัคร
                                                </th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-[#7a8b99] uppercase">
                                                    การดำเนินการ
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#dee5ed]">
                                            {members.map((member) => (
                                                <tr key={member.uuid} className="hover:bg-[#f8f9fa] transition-colors">
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-3">
                                                            {member.avatarUrl ? (
                                                                <Image
                                                                    src={member.avatarUrl}
                                                                    alt={`${member.firstName} ${member.lastName}`}
                                                                    width={40}
                                                                    height={40}
                                                                    className="rounded-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#405168] to-[#5e7593] flex items-center justify-center text-white font-semibold">
                                                                    {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="font-medium text-[#1c2a48]">
                                                                    {member.firstName} {member.lastName}
                                                                </p>
                                                                {member.bio && (
                                                                    <p className="text-xs text-[#7a8b99] line-clamp-1">
                                                                        {member.bio}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                                                            member.userRole === 'admin'
                                                                ? 'bg-purple-100 text-purple-700'
                                                                : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                            <IoMdPerson size={14} />
                                                            {member.userRole === 'admin' ? 'แอดมิน' : 'ผู้ใช้'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-center text-sm text-[#7a8b99]">
                                                        {new Date(member.createdAt).toLocaleDateString('th-TH', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => handleUpdateRole(member.uuid, member.userRole, `${member.firstName} ${member.lastName}`)}
                                                                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                                                                    member.userRole === 'admin'
                                                                        ? 'text-blue-600 hover:bg-blue-50'
                                                                        : 'text-purple-600 hover:bg-purple-50'
                                                                }`}
                                                                title={member.userRole === 'admin' ? 'เปลี่ยนเป็นผู้ใช้ทั่วไป' : 'เปลี่ยนเป็นแอดมิน'}
                                                            >
                                                                <IoMdSwap size={20} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-[#7a8b99]">
                                    <IoMdPeople size={48} className="mx-auto opacity-30 mb-3" />
                                    <p>ไม่มีข้อมูลสมาชิก</p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-[#f8f9fa] px-6 py-4 border-t border-[#dee5ed]">
                            <p className="text-sm text-[#7a8b99] text-center">
                                สมาชิกทั้งหมด: <span className="font-semibold text-[#1c2a48]">{members.length}</span> คน
                            </p>
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
                                    className="w-full px-6 py-3 border border-[#e0e7f1] text-[#405168] rounded-3xl hover:bg-[#f8f9fa] hover:shadow-md transition-all font-medium shadow-sm bg-white cursor-pointer"
                                >
                                    ปิด
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Modal */}
            {showNotification && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black opacity-50" onClick={() => setShowNotification(false)}></div>
                    <div className="relative bg-white rounded-3xl border border-[#e0e7f1] shadow-xl max-w-md w-full p-8">
                        <div className="text-center">
                            <div className="text-5xl mb-4">
                                {notificationType === 'success' && '✅'}
                                {notificationType === 'error' && '❌'}
                                {notificationType === 'info' && 'ℹ️'}
                            </div>
                            <h2 className="text-xl font-bold text-[#1c2a48] mb-4">
                                {notificationType === 'success' && 'สำเร็จ'}
                                {notificationType === 'error' && 'เกิดข้อผิดพลาด'}
                                {notificationType === 'info' && 'แจ้งเตือน'}
                            </h2>
                            <p className="text-[#7a8b99] mb-6">{notificationMessage}</p>

                            <button
                                onClick={() => setShowNotification(false)}
                                className="w-full px-6 py-3 bg-[#405168] text-white rounded-3xl hover:bg-[#2d3a4c] transition-colors font-medium cursor-pointer"
                            >
                                ตกลง
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirmation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black opacity-50" onClick={() => setShowConfirmation(false)}></div>
                    <div className="relative bg-white rounded-3xl border border-[#e0e7f1] shadow-xl max-w-md w-full p-8">
                        <div className="text-center">
                            <div className="text-5xl mb-4">⚠️</div>
                            <h2 className="text-xl font-bold text-[#1c2a48] mb-4">ยืนยันการดำเนินการ</h2>
                            <p className="text-[#7a8b99] mb-6">{confirmationMessage}</p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => {
                                        setShowConfirmation(false);
                                        if (confirmationAction) {
                                            confirmationAction();
                                        }
                                    }}
                                    className="w-full px-6 py-3 bg-red-500 text-white rounded-3xl hover:bg-red-600 transition-colors font-medium cursor-pointer"
                                >
                                    ยืนยัน
                                </button>
                                <button
                                    onClick={() => setShowConfirmation(false)}
                                    className="w-full px-6 py-3 border border-[#e0e7f1] text-[#405168] rounded-3xl hover:bg-[#f8f9fa] hover:shadow-md transition-all font-medium shadow-sm bg-white cursor-pointer"
                                >
                                    ยกเลิก
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
