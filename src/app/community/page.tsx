import Link from "next/link";
import { IoMdAdd } from "react-icons/io";
import { HiSortDescending } from "react-icons/hi";
import SearchBox from "../components/searchbox";
import PreviewPost from "../components/previewpost";

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
        <div className="flex justify-between items-center mt-6 gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#5e7593]">จัดเรียงโดย:</span>
            <select className="px-3 py-2 bg-white border border-[#405168] rounded-2xl text-[#405168] focus:outline-none focus:ring-2 focus:ring-[#5e7593] text-sm">
              <option>ล่าสุด</option>
              <option>ยอดนิยม</option>
              <option>เก่าสุด</option>
              <option>ตามชื่อ</option>
            </select>
            <button className="flex items-center gap-1 px-3 py-2 text-sm text-[#5e7593] hover:text-[#405168] transition-colors">
              <HiSortDescending />
              กลับด้าน
            </button>
          </div>
          
          <Link 
            href="/post" 
            className="flex items-center gap-2 px-6 py-3 bg-[#405168] text-white rounded-3xl hover:bg-[#2d3a4c] transition-colors shadow-sm"
          >
            <IoMdAdd size={20} />
            เพิ่มโพสต์
          </Link>
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
          <PreviewPost />
          <PreviewPost />
          <PreviewPost />
          <PreviewPost />
        </div>
        
        {/* Load More Button */}
        <div className="text-center mt-8">
          <button className="px-8 py-3 bg-white border border-[#405168] text-[#405168] rounded-3xl hover:bg-[#f8f9fa] transition-colors">
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