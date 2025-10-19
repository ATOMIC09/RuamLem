"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/app/hooks/use-auth";
import { IoMdArrowBack, IoMdClose, IoMdPricetag, IoMdTrash } from "react-icons/io";
import { GoPaperclip } from "react-icons/go";
import Link from "next/link";
import LoadingSpinner from "@/app/components/loading-spinner";
import * as postService from "@/services/post.service";

interface Post {
  id: number;
  title: string;
  body: string;
  tag?: string;
  user_info?: {
    firstName: string;
    lastName: string;
  };
  created_at?: string;
  createdAt?: string;
  attachments?: Array<{
    id: number;
    file_name: string;
    file_url: string;
    file_size: number;
  }>;
  comment_count?: number;
}

interface Tag {
  id: number;
  name: string;
}

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  const { isSignedIn, user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [removedAttachments, setRemovedAttachments] = useState<number[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Redirect to home if not signed in
  useEffect(() => {
    if (isSignedIn === null) {
      return;
    }
    if (!isSignedIn) {
      router.push("/");
    } else {
      fetchPost();
      fetchTags();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // Fetch post data
  const fetchPost = async () => {
    try {
      setIsLoading(true);
      const result = await postService.getPost(parseInt(postId));

      if (result.error) {
        if (result.error.includes('JWT') || result.error.includes('expired')) {
          setShowSignInPrompt(true);
          setError("");
        } else {
          setError(result.error);
        }
        return;
      }

      if (result.post) {
        // Check if user owns this post
        if (result.post.user_info?.firstName === user?.firstName) {
          setPost(result.post);
          setTitle(result.post.title);
          setBody(result.post.body);
          if (result.post.tag) {
            setTag(result.post.tag);
            setNewTag("");
          }
        } else {
          setError("คุณไม่มีสิทธิ์แก้ไขโพสต์นี้");
        }
      } else {
        setError("ไม่พบโพสต์ที่ต้องการ");
      }
    } catch {
      setError("ไม่สามารถโหลดโพสต์ได้");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch available tags
  const fetchTags = async () => {
    const result = await postService.getTags();
    if (result.tags) {
      setAvailableTags(result.tags);
    }
  };

  // Handle tag input for autocomplete
  const handleTagInput = (value: string) => {
    setNewTag(value);

    if (value.trim()) {
      const filtered = availableTags.filter((t) =>
        t.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredTags(filtered);
      setShowSuggestions(filtered.length > 0 || value.trim().length > 0);
    } else {
      setFilteredTags([]);
      setShowSuggestions(false);
    }
  };

  // Check if tag exists
  const isExistingTag = (tagName: string): boolean => {
    return availableTags.some((t) =>
      t.name.toLowerCase() === tagName.trim().toLowerCase()
    );
  };

  // Select tag from suggestion
  const selectTag = (selectedTag: Tag) => {
    setTag(selectedTag.name);
    setNewTag("");
    setFilteredTags([]);
    setShowSuggestions(false);
  };

  // Select tag by name
  const selectTagByName = (tagName: string) => {
    setTag(tagName);
    setNewTag("");
    setFilteredTags([]);
    setShowSuggestions(false);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const totalFiles =
        (post?.attachments?.length || 0) - removedAttachments.length + newFiles.length + selectedFiles.length;

      if (totalFiles > 10) {
        setError(
          `จำนวนไฟล์ทั้งหมดต้องไม่เกิน 10 ไฟล์ (ปัจจุบัน: ${
            (post?.attachments?.length || 0) - removedAttachments.length
          } + ${newFiles.length} + ${selectedFiles.length})`
        );
        return;
      }

      setNewFiles([...newFiles, ...selectedFiles]);
      setError("");
      e.target.value = "";
    }
  };

  // Remove new file
  const removeNewFile = (index: number) => {
    setNewFiles(newFiles.filter((_, i) => i !== index));
  };

  // Mark attachment for removal
  const markAttachmentForRemoval = (attachmentId: number) => {
    if (!removedAttachments.includes(attachmentId)) {
      setRemovedAttachments([...removedAttachments, attachmentId]);
    }
  };

  // Undo removal of attachment
  const undoAttachmentRemoval = (attachmentId: number) => {
    setRemovedAttachments(removedAttachments.filter((id) => id !== attachmentId));
  };

  // Handle save
  const handleSave = async () => {
    if (!title.trim() || !body.trim()) {
      setError("กรุณากรอกหัวข้อและเนื้อหา");
      return;
    }

    if (!tag.trim()) {
      setError("กรุณาเลือกแท็ก");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const result = await postService.updatePost(parseInt(postId), title, body, tag);

      if (result.error) {
        // Check for JWT expiration
        if (result.error.includes("JWT") || result.error.includes("expired")) {
          setShowSignInPrompt(true);
        } else {
          setError(result.error);
        }
        setIsSaving(false);
        return;
      }

      // Success - redirect to my posts
      router.push("/my-posts");
    } catch {
      setError("ไม่สามารถบันทึกการเปลี่ยนแปลงได้");
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f5f7fb] to-[#eef1f8]">
        <LoadingSpinner size="lg" text="กำลังโหลดโพสต์..." />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f5f7fb] to-[#eef1f8] py-8">
        <div className="container max-w-4xl mx-auto px-4">
          <Link
            href="/my-posts"
            className="flex items-center space-x-2 text-[#405168] hover:text-[#5e7593] transition-colors mb-6"
          >
            <IoMdArrowBack size={20} />
            <span className="text-sm font-medium">กลับไปยังโพสต์ของฉัน</span>
          </Link>

          <div className="bg-white rounded-3xl border border-[#dee5ed] shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-[#1c2a48] mb-2">ไม่พบโพสต์</h2>
            <p className="text-[#7a8b99]">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f7fb] to-[#eef1f8] py-8">
      <div className="container max-w-4xl mx-auto px-4">
        {/* Back Button */}
        <Link
          href="/my-posts"
          className="flex items-center space-x-2 text-[#405168] hover:text-[#5e7593] transition-colors mb-6"
        >
          <IoMdArrowBack size={20} />
          <span className="text-sm font-medium">กลับไปยังโพสต์ของฉัน</span>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#1c2a48] mb-2">แก้ไขโพสต์</h1>
          <p className="text-[#7a8b99]">แก้ไขข้อมูลโพสต์ของคุณ</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-2xl">
            {error}
          </div>
        )}

        {/* Edit Form */}
        <div className="bg-white rounded-3xl border border-[#dee5ed] shadow-lg p-8">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-[#1c2a48] mb-2">
                หัวข้อ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-[#dee5ed] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#405168] focus:border-transparent"
                placeholder="กรอกหัวข้อโพสต์"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-[#1c2a48] mb-2">
                เนื้อหา <span className="text-red-500">*</span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="w-full px-4 py-3 border border-[#dee5ed] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#405168] focus:border-transparent resize-none"
                placeholder="กรอกเนื้อหาโพสต์"
              />
            </div>

            {/* Tag with Autocomplete */}
            <div>
              <label className="block text-sm font-medium text-[#1c2a48] mb-2">
                แท็ก <span className="text-red-500">*</span>
              </label>

              {/* Selected Tag */}
              {tag && (
                <div className="mb-3">
                  <span className="inline-flex items-center px-3 py-1 text-sm bg-[#e0e7f1] text-[#5e7593] rounded-full">
                    <IoMdPricetag className="mr-1" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTag("")}
                      className="ml-2 text-[#7a8b99] hover:text-red-500 cursor-pointer"
                    >
                      <IoMdClose size={14} />
                    </button>
                  </span>
                </div>
              )}

              {/* Tag Input with Autocomplete */}
              {!tag && (
                <div className="relative">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => handleTagInput(e.target.value)}
                    onFocus={() => {
                      if (newTag.trim() && filteredTags.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    className="w-full px-4 py-2 border border-[#e0e7f1] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#405168] focus:border-transparent text-[#1c2a48] shadow-sm hover:shadow-md transition-shadow"
                    placeholder="พิมพ์เพื่อค้นหาแท็ก"
                  />

                  {/* Autocomplete Suggestions */}
                  {showSuggestions && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e0e7f1] rounded-2xl shadow-lg z-10">
                      {filteredTags.slice(0, 5).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => selectTag(t)}
                          className="w-full text-left px-4 py-2 text-[#5e7593] hover:bg-[#f8f9fa] transition-colors first:rounded-t-2xl cursor-pointer"
                        >
                          <IoMdPricetag className="inline mr-2" size={14} />
                          {t.name}
                        </button>
                      ))}

                      {newTag.trim() && !isExistingTag(newTag) && (
                        <button
                          type="button"
                          onClick={() => selectTagByName(newTag.trim())}
                          className="w-full text-left px-4 py-2 text-[#405168] hover:bg-[#f0f4f8] transition-colors last:rounded-b-2xl cursor-pointer border-t border-[#e0e7f1]"
                        >
                          <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded mr-2">
                            สร้างใหม่
                          </span>
                          {newTag.trim()}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Popular Tags */}
              {!tag && availableTags.length > 0 && !newTag.trim() && (
                <div className="mt-4">
                  <p className="text-xs text-[#7a8b99] mb-2">แท็กยอดนิยม:</p>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.slice(0, 5).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => selectTagByName(t.name)}
                        className="px-3 py-1 text-xs bg-[#f8f9fa] text-[#5e7593] rounded-full border border-[#e0e7f1] hover:bg-[#e0e7f1] transition-colors cursor-pointer"
                      >
                        <IoMdPricetag className="inline mr-1" size={12} />
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Existing Attachments */}
            {post.attachments && post.attachments.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-[#1c2a48] mb-2">
                  ไฟล์ที่แนบ (ปัจจุบัน)
                </label>
                <div className="space-y-2">
                  {post.attachments.map((attachment) => {
                    const isMarkedForRemoval = removedAttachments.includes(attachment.id);
                    return (
                      <div
                        key={attachment.id}
                        className={`p-3 border border-[#dee5ed] rounded-xl flex items-center justify-between transition-all ${
                          isMarkedForRemoval
                            ? "bg-red-50"
                            : "bg-[#f8f9fa]"
                        }`}
                      >
                        <span className={`text-sm flex items-center ${
                          isMarkedForRemoval ? "text-red-500" : "text-[#7a8b99]"
                        }`}>
                          <GoPaperclip className="mr-2" size={16} />
                          {attachment.file_name} ({(attachment.file_size / 1024).toFixed(2)} KB)
                        </span>
                        {isMarkedForRemoval ? (
                          <button
                            type="button"
                            onClick={() => undoAttachmentRemoval(attachment.id)}
                            className="text-xs px-3 py-1 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors cursor-pointer"
                          >
                            เลิกลบ
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => markAttachmentForRemoval(attachment.id)}
                            className="text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                          >
                            <IoMdTrash size={18} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add New Attachments */}
            <div>
              <label className="block text-sm font-medium text-[#1c2a48] mb-2">
                เพิ่มไฟล์ใหม่ (ไม่บังคับ)
              </label>
              <div className="flex items-center justify-center px-4 py-6 border-2 border-dashed border-[#dee5ed] rounded-2xl hover:border-[#405168] transition-colors cursor-pointer bg-[#f8f9fa]">
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-input"
                />
                <label
                  htmlFor="file-input"
                  className="flex flex-col items-center cursor-pointer w-full"
                >
                  <GoPaperclip size={24} className="text-[#405168] mb-2" />
                  <span className="text-sm text-[#405168] font-medium">
                    คลิกเพื่อเพิ่มไฟล์
                  </span>
                  <span className="text-xs text-[#7a8b99]">
                    จำกัด 10 ไฟล์, 50MB ต่อไฟล์
                  </span>
                </label>
              </div>

              {/* New Files List */}
              {newFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {newFiles.map((file, index) => (
                    <div
                      key={index}
                      className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between"
                    >
                      <span className="text-sm text-green-700 flex items-center">
                        <GoPaperclip className="mr-2" size={16} />
                        {file.name} ({(file.size / 1024).toFixed(2)} KB)
                      </span>
                      <button
                        type="button"
                        onClick={() => removeNewFile(index)}
                        className="text-green-600 hover:text-green-800 transition-colors cursor-pointer"
                      >
                        <IoMdTrash size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-6 py-3 bg-[#405168] text-white rounded-3xl hover:bg-[#2d3a4c] disabled:opacity-50 transition-colors font-medium cursor-pointer"
              >
                {isSaving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
              </button>
              <Link
                href="/my-posts"
                className="flex-1 px-6 py-3 border border-[#e0e7f1] text-[#405168] rounded-3xl hover:bg-[#f8f9fa] transition-colors font-medium text-center"
              >
                ยกเลิก
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Sign In Required Modal */}
      {showSignInPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black opacity-50"
            onClick={() => setShowSignInPrompt(false)}
          ></div>
          <div className="relative bg-white rounded-3xl border border-[#e0e7f1] shadow-xl max-w-md w-full p-8">
            <button
              onClick={() => setShowSignInPrompt(false)}
              className="absolute top-4 right-4 p-2 text-[#7a8b99] hover:text-[#405168] transition-colors cursor-pointer"
            >
              <IoMdClose size={20} />
            </button>

            <div className="text-center">
              <div className="text-4xl mb-4">⏱️</div>
              <h2 className="text-2xl font-bold text-[#1c2a48] mb-4">
                เซสชันหมดอายุแล้ว
              </h2>
              <p className="text-[#7a8b99] mb-6">
                กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ
              </p>

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
                  className="w-full px-6 py-3 border border-[#e0e7f1] text-[#405168] rounded-3xl hover:bg-[#f8f9fa] hover:shadow-md transition-all font-medium shadow-sm bg-white"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
