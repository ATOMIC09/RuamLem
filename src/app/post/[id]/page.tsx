"use client";

import Image from "next/image";
import Link from "next/link";
import { IoMdPricetag, IoMdArrowBack, IoMdEye, IoMdHeart, IoMdShare } from "react-icons/io";
import { GoPaperclip } from "react-icons/go";
import { FaDownload } from "react-icons/fa";
import { useParams } from "next/navigation";

// Mock data - in real app this would come from API
const mockPosts = {
  "1": {
    id: "1",
    title: "สรุปมิดเทอมวิชา Software Engineering",
    content: `สวัสดีครับทุกคน! วันนี้ผมมาแชร์สรุปเนื้อหาสำหรับสอบมิดเทอมวิชา Software Engineering ครับ

เนื้อหาที่ออกสอบครอบคลุม:

1. **Software Development Life Cycle (SDLC)**
   - Waterfall Model
   - Agile Development
   - Scrum Framework
   
2. **Requirements Engineering**
   - Functional Requirements
   - Non-functional Requirements
   - Requirements Gathering Techniques
   
3. **System Design**
   - Architecture Patterns
   - Design Principles
   - UML Diagrams
   
4. **Testing**
   - Unit Testing
   - Integration Testing
   - System Testing

ผมรวบรวมทั้งหมดไว้ในไฟล์ PDF แล้ว หวังว่าจะมีประโยชน์กับทุกคนนะครับ!

ถ้ามีคำถามอะไรเพิ่มเติม สามารถคอมเมนต์ได้เลยครับ 😊`,
    author: {
      name: "John Doe",
      avatar: "/anonym.jpg"
    },
    createdAt: "วันศุกร์ เวลา 13:40 น.",
    category: "Software Engineering",
    attachments: [
      {
        name: "Midterm Note.pdf",
        size: "2.5 MB",
        type: "pdf"
      }
    ],
    views: 234,
    likes: 18
  },
  "2": {
    id: "2", 
    title: "เทคนิคการทำโจทย์คณิตศาสตร์",
    content: `สวัสดีทุกคนครับ! วันนี้มาแชร์เทคนิคการแก้โจทย์คณิตศาสตร์ที่ผมใช้แล้วได้ผลดี

**เทคนิคสำคัญ ๆ ที่ควรรู้:**

1. **อ่านโจทย์ให้เข้าใจ**
   - อ่านช้า ๆ อย่างน้อย 2 รอบ
   - ขีดเส้นใต้คำสำคัญ
   - วาดรูปประกอบถ้าเป็นโจทย์เรขาคณิต

2. **หาสิ่งที่โจทย์ให้และสิ่งที่ต้องหา**
   - เขียนสิ่งที่ทราบแยกต่างหาก
   - ระบุสิ่งที่โจทย์ถามชัดเจน

3. **เลือกสูตรที่เหมาะสม**
   - ทบทวนสูตรที่เกี่ยวข้อง
   - เลือกวิธีที่ตรงไปตรงมาที่สุด

รวมสูตรสำคัญและตัวอย่างโจทย์ไว้ในไฟล์แล้วครับ!`,
    author: {
      name: "Jane Smith",
      avatar: "/anonym.jpg"
    },
    createdAt: "วันพฤหัสบดี เวลา 15:20 น.",
    category: "คณิตศาสตร์",
    attachments: [
      {
        name: "Math Techniques.pdf",
        size: "1.8 MB",
        type: "pdf"
      }
    ],
    views: 156,
    likes: 12
  },
  "3": {
    id: "3",
    title: "สรุปไวยากรณ์ภาษาอังกฤษ",
    content: `Hello everyone! วันนี้มาสรุปกฎไวยากรณ์ภาษาอังกฤษที่สำคัญสำหรับการสอบ

**หัวข้อหลักที่ต้องเรียน:**

1. **Tenses (กาล)**
   - Present Simple, Continuous, Perfect
   - Past Simple, Continuous, Perfect
   - Future Simple, Continuous, Perfect

2. **Parts of Speech**
   - Noun, Verb, Adjective, Adverb
   - Preposition, Conjunction, Article

3. **Sentence Structure**
   - Subject + Verb + Object
   - Complex and Compound Sentences
   - Active and Passive Voice

4. **Common Mistakes**
   - Subject-Verb Agreement
   - Pronoun Reference
   - Dangling Modifiers

มีตัวอย่างประโยคและแบบฝึกหัดในไฟล์ PDF ด้วยนะครับ!`,
    author: {
      name: "Mike Johnson",
      avatar: "/anonym.jpg"
    },
    createdAt: "วันพุธ เวลา 09:15 น.",
    category: "ภาษาอังกฤษ",
    attachments: [
      {
        name: "English Grammar.pdf",
        size: "3.2 MB",
        type: "pdf"
      }
    ],
    views: 89,
    likes: 7
  },
  "4": {
    id: "4",
    title: "สรุปเคมีอนินทรีย์",
    content: `สวัสดีค่ะทุกคน! วันนี้มาแชร์สรุปเคมีอนินทรีย์สำหรับการสอบ

**เนื้อหาสำคัญที่ต้องจำ:**

1. **ตารางธาตุ**
   - กลุ่มและคาบ
   - คุณสมบัติที่เปลี่ยนแปลงตามตารางธาตุ
   - ธาตุแทรนซิชัน

2. **พันธะเคมี**
   - พันธะไอออนิก
   - พันธะโควาเลนต์
   - พันธะโลหะ

3. **ปฏิกิริยาเคมี**
   - ปฏิกิริยาออกซิเดชัน-รีดักชัน
   - กรด-เบส
   - ปฏิกิริยาตกตะกอน

4. **สารประกอบสำคัญ**
   - เกลือ
   - กรดและเบส
   - ออกไซด์

รวมสูตรเคมีและตัวอย่างการคำนวณไว้ให้แล้วค่ะ!`,
    author: {
      name: "Sarah Wilson",
      avatar: "/anonym.jpg"
    },
    createdAt: "วันจันทร์ เวลา 11:30 น.",
    category: "เคมี",
    attachments: [
      {
        name: "Inorganic Chemistry.pdf",
        size: "4.1 MB",
        type: "pdf"
      }
    ],
    views: 67,
    likes: 9
  }
};

export default function PostDetailPage() {
  const params = useParams();
  const postId = params.id as string;
  const post = mockPosts[postId as keyof typeof mockPosts];

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">📄</div>
          <h1 className="text-2xl font-bold text-[#1c2a48] mb-2">ไม่พบโพสต์</h1>
          <p className="text-[#7a8b99] mb-6">โพสต์ที่คุณกำลังค้นหาอาจถูกลบหรือไม่มีอยู่</p>
          <Link
            href="/community"
            className="px-6 py-3 bg-[#405168] text-white rounded-3xl hover:bg-[#2d3a4c] transition-colors font-medium"
          >
            กลับไปยังชุมชน
          </Link>
        </div>
      </div>
    );
  }

  const handleDownload = (fileName: string) => {
    // Mock download - in real app this would download the actual file
    console.log(`Downloading: ${fileName}`);
  };

  const handleLike = () => {
    // Mock like - in real app this would update the like count
    console.log("Liked post");
  };

  const handleShare = () => {
    // Mock share - in real app this would open share dialog
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: post.content,
        url: window.location.href,
      });
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert("ลิงก์ถูกคัดลอกแล้ว!");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] py-8">
      <div className="max-w-4xl mx-auto px-6">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            href="/community"
            className="flex items-center gap-2 text-[#5e7593] hover:text-[#405168] transition-colors"
          >
            <IoMdArrowBack />
            <span>กลับไปยังชุมชน</span>
          </Link>
        </div>

        {/* Post Container */}
        <div className="bg-white rounded-3xl shadow-sm border border-[#e0e7f1] p-8">
          {/* Post Header */}
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-[#f0f4f8]">
            <div className="flex items-center">
              <Image
                src={post.author.avatar}
                alt={post.author.name}
                width={50}
                height={50}
                className="w-12 h-12 rounded-full mr-4"
              />
              <div>
                <div className="font-bold text-[#1c2a48] text-lg">{post.author.name}</div>
                <div className="text-sm text-[#7a8b99]">{post.createdAt}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="px-4 py-2 text-sm bg-[#f0f4f8] text-[#5e7593] rounded-full border border-[#e0e7f1]">
                <IoMdPricetag className="inline-block mr-2" />
                {post.category}
              </span>
              
              <div className="flex items-center gap-1 text-sm text-[#7a8b99]">
                <IoMdEye />
                <span>{post.views}</span>
              </div>
            </div>
          </div>

          {/* Post Title */}
          <h1 className="text-3xl font-bold text-[#1c2a48] mb-6">{post.title}</h1>

          {/* Post Content */}
          <div className="prose max-w-none mb-8">
            <div className="text-[#1c2a48] leading-relaxed whitespace-pre-line text-base">
              {post.content}
            </div>
          </div>

          {/* Attachments */}
          {post.attachments && post.attachments.length > 0 && (
            <div className="mb-8 pt-6 border-t border-[#f0f4f8]">
              <h3 className="text-lg font-semibold text-[#1c2a48] mb-4">ไฟล์แนบ</h3>
              <div className="space-y-3">
                {post.attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-[#f8f9fa] rounded-2xl border border-[#e0e7f1]"
                  >
                    <div className="flex items-center">
                      <GoPaperclip className="text-[#5e7593] mr-3" size={20} />
                      <div>
                        <div className="font-medium text-[#1c2a48]">{file.name}</div>
                        <div className="text-sm text-[#7a8b99]">{file.size}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(file.name)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#405168] text-white rounded-2xl hover:bg-[#2d3a4c] transition-colors cursor-pointer"
                    >
                      <FaDownload size={14} />
                      <span className="text-sm font-medium">ดาวน์โหลด</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-[#f0f4f8]">
            <div className="flex items-center gap-4">
              <button
                onClick={handleLike}
                className="flex items-center gap-2 px-4 py-2 bg-[#f0f4f8] text-[#5e7593] rounded-2xl hover:bg-[#e0e7f1] transition-colors cursor-pointer"
              >
                <IoMdHeart />
                <span className="text-sm font-medium">{post.likes} ถูกใจ</span>
              </button>
              
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-[#f0f4f8] text-[#5e7593] rounded-2xl hover:bg-[#e0e7f1] transition-colors cursor-pointer"
              >
                <IoMdShare />
                <span className="text-sm font-medium">แชร์</span>
              </button>
            </div>
            
            <div className="text-sm text-[#7a8b99]">
              โพสต์ #{post.id}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}