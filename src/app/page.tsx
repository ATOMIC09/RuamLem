"use client";

import Link from "next/link";
import { IoMdTrendingUp, IoMdPeople } from "react-icons/io";
import { FaBookOpen, FaUsers, FaFileAlt } from "react-icons/fa";
import Postbox from "./components/postbox";
import PostButton from "./components/post-button";

export default function Home() {
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
              <div className="text-2xl font-bold text-[#1c2a48]">1,247</div>
              <div className="text-sm text-[#7a8b99]">เอกสารการเรียน</div>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0e7f1]">
              <FaUsers className="text-3xl text-[#405168] mx-auto mb-2" />
              <div className="text-2xl font-bold text-[#1c2a48]">850</div>
              <div className="text-sm text-[#7a8b99]">สมาชิกในชุมชน</div>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0e7f1]">
              <FaFileAlt className="text-3xl text-[#405168] mx-auto mb-2" />
              <div className="text-2xl font-bold text-[#1c2a48]">324</div>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "คณิตศาสตร์", count: "245 โพสต์", color: "bg-blue-50 text-blue-600" },
              { name: "ฟิสิกส์", count: "189 โพสต์", color: "bg-green-50 text-green-600" },
              { name: "เคมี", count: "156 โพสต์", color: "bg-purple-50 text-purple-600" },
              { name: "อังกฤษ", count: "203 โพสต์", color: "bg-orange-50 text-orange-600" },
              { name: "ชีววิทยา", count: "134 โพสต์", color: "bg-teal-50 text-teal-600" },
              { name: "สังคม", count: "98 โพสต์", color: "bg-red-50 text-red-600" },
              { name: "ภาษาไทย", count: "167 โพสต์", color: "bg-indigo-50 text-indigo-600" },
              { name: "คอมพิวเตอร์", count: "112 โพสต์", color: "bg-pink-50 text-pink-600" },
            ].map((category, index) => (
              <Link
                key={index}
                href={`/community?category=${category.name}`}
                className={`p-4 rounded-2xl ${category.color} hover:shadow-md transition-all cursor-pointer text-center`}
              >
                <div className="font-semibold">{category.name}</div>
                <div className="text-sm opacity-70">{category.count}</div>
              </Link>
            ))}
          </div>
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
            <Postbox post={{
              id: "1",
              title: "สรุปมิดเทอมวิชา Software Engineering",
              content: "ฉันไม่แน่ใจว่าขาดอะไรอีกบ้าง แต่คิดว่าน่าจะครบแล้วนะ",
              author: { name: "John Doe", avatar: "/anonym.jpg" },
              createdAt: "วันศุกร์ เวลา 13:40 น.",
              category: "Software Engineering",
              attachments: [{ name: "Midterm Note.pdf", size: "2.5 MB", type: "pdf" }]
            }} />
            <Postbox post={{
              id: "2",
              title: "เทคนิคการทำโจทย์คณิตศาสตร์",
              content: "สรุปเทคนิคการแก้โจทย์คณิตศาสตร์สำหรับการสอบ รวมสูตรสำคัญและวิธีการคิด",
              author: { name: "Jane Smith", avatar: "/anonym.jpg" },
              createdAt: "วันพฤหัสบดี เวลา 15:20 น.",
              category: "คณิตศาสตร์",
              attachments: [{ name: "Math Techniques.pdf", size: "1.8 MB", type: "pdf" }]
            }} />
            <Postbox post={{
              id: "3",
              title: "สรุปไวยากรณ์ภาษาอังกฤษ",
              content: "รวมกฎไวยากรณ์สำคัญ ๆ ที่ต้องรู้สำหรับการสอบ พร้อมตัวอย่างประโยค",
              author: { name: "Mike Johnson", avatar: "/anonym.jpg" },
              createdAt: "วันพุธ เวลา 09:15 น.",
              category: "ภาษาอังกฤษ",
              attachments: [{ name: "English Grammar.pdf", size: "3.2 MB", type: "pdf" }]
            }} />
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
