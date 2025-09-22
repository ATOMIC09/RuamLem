import { HiSortDescending } from "react-icons/hi";
import SearchBox from "../components/searchbox";
import PreviewPost from "../components/previewpost";
import PostButton from "../components/post-button";

export default function CommunityPage() {
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
        {/* Stats Bar */}
        <div className="mb-6 text-center">
          <p className="text-sm text-[#7a8b99]">แสดง 4 โพสต์ จากทั้งหมด 24 โพสต์</p>
        </div>
        
        {/* Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <PreviewPost post={{
            id: "1",
            title: "สรุปมิดเทอมวิชา Software Engineering",
            author: { name: "John Doe", avatar: "/anonym.jpg" },
            createdAt: "วันศุกร์ เวลา 13:40 น.",
            category: "Software Engineering",
            attachments: [{ name: "Midterm Note.pdf", size: "2.5 MB", type: "pdf" }]
          }} />
          <PreviewPost post={{
            id: "2",
            title: "เทคนิคการทำโจทย์คณิตศาสตร์",
            author: { name: "Jane Smith", avatar: "/anonym.jpg" },
            createdAt: "วันพฤหัสบดี เวลา 15:20 น.",
            category: "คณิตศาสตร์",
            attachments: [{ name: "Math Techniques.pdf", size: "1.8 MB", type: "pdf" }]
          }} />
          <PreviewPost post={{
            id: "3",
            title: "สรุปไวยากรณ์ภาษาอังกฤษ",
            author: { name: "Mike Johnson", avatar: "/anonym.jpg" },
            createdAt: "วันพุธ เวลา 09:15 น.",
            category: "ภาษาอังกฤษ",
            attachments: [{ name: "English Grammar.pdf", size: "3.2 MB", type: "pdf" }]
          }} />
          <PreviewPost post={{
            id: "4",
            title: "สรุปเคมีอนินทรีย์",
            author: { name: "Sarah Wilson", avatar: "/anonym.jpg" },
            createdAt: "วันจันทร์ เวลา 11:30 น.",
            category: "เคมี",
            attachments: [{ name: "Inorganic Chemistry.pdf", size: "4.1 MB", type: "pdf" }]
          }} />
        </div>
        
        {/* Load More Button */}
        <div className="text-center mt-8">
          <button className="px-8 py-3 bg-white border border-[#e0e7f1] text-[#405168] rounded-3xl hover:bg-[#f8f9fa] hover:shadow-md transition-all shadow-sm font-medium cursor-pointer">
            โหลดเพิ่มเติม
          </button>
        </div>
      </div>

      {/* Empty State (you can conditionally show this when no posts) */}
      {/* 
      <div className="w-full max-w-2xl mx-auto text-center py-16">
        <div className="text-6xl mb-4">📚</div>
        <h3 className="text-xl font-semibold text-[#1c2a48] mb-2">ยังไม่มีโพสต์</h3>
        <p className="text-[#5e7593] mb-6">เป็นคนแรกที่แชร์ความรู้ในชุมชน!</p>
        <Link 
          href="/post" 
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#405168] text-white rounded-3xl hover:bg-[#2d3a4c] transition-colors"
        >
          <IoMdAdd size={20} />
          เพิ่มโพสต์แรก
        </Link>
      </div>
      */}
    </div>
  );
}