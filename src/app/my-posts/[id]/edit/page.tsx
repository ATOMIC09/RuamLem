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
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<number[]>([]);
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
      
      // Calculate total files: existing - removed + new files + selected files
      const existingFiles = (post?.attachments?.length || 0) - removedAttachmentIds.length;
      const totalFiles = existingFiles + newFiles.length + selectedFiles.length;

      if (totalFiles > 10) {
        setError(
          `จำนวนไฟล์ทั้งหมดต้องไม่เกิน 10 ไฟล์ (ปัจจุบันมี: ${existingFiles} ไฟล์, เพิ่มใหม่: ${newFiles.length + selectedFiles.length} ไฟล์)`
        );
        return;
      }

      // Validate file size - max 50MB per file
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
      for (const file of selectedFiles) {
        if (file.size > MAX_FILE_SIZE) {
          setError(`ไฟล์ ${file.name} มีขนาดเกิน 50MB`);
          return;
        }
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
    if (!removedAttachmentIds.includes(attachmentId)) {
      setRemovedAttachmentIds([...removedAttachmentIds, attachmentId]);
    }
  };

  // Undo removal of attachment
  const undoAttachmentRemoval = (attachmentId: number) => {
    setRemovedAttachmentIds(removedAttachmentIds.filter((id) => id !== attachmentId));
  };

  // Show notification helper
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Handle file download
  const handleDownload = async (e: React.MouseEvent, fileUrl: string | undefined) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!fileUrl) return;
    
    try {
      const { url, error } = await postService.getFileDownloadUrl(fileUrl);
      if (url) {
        window.open(url, "_blank");
        showNotification('success', 'กำลังดาวน์โหลดไฟล์...');
      } else {
        console.error('Download error:', error);
        showNotification('error', 'ไม่สามารถดาวน์โหลดไฟล์ได้');
      }
    } catch (error) {
      console.error('Download failed:', error);
      showNotification('error', 'ไม่สามารถดาวน์โหลดไฟล์ได้');
    }
  };

  // Handle save
  const handleSave = async () => {
    // Validation
    if (!title.trim() || !body.trim()) {
      setError("กรุณากรอกหัวข้อและเนื้อหา");
      return;
    }

    if (!tag.trim()) {
      setError("กรุณาเลือกแท็ก");
      return;
    }

    // Calculate total files after changes
    const existingFilesCount = (post?.attachments?.length || 0) - removedAttachmentIds.length;
    const totalFilesAfterSave = existingFilesCount + newFiles.length;

    // Must have at least 1 file
    if (totalFilesAfterSave < 1) {
      setError("โพสต์ต้องมีไฟล์อย่างน้อย 1 ไฟล์");
      return;
    }

    setIsSaving(true);
    setError("");
    
    try {
      // Step 1: Update post details (title, body, tag)
      const result = await postService.updatePost(parseInt(postId), title, body, tag);

      if (result.error) {
        if (result.error.includes("JWT") || result.error.includes("expired")) {
          setShowSignInPrompt(true);
        } else {
          setError(result.error);
        }
        setIsSaving(false);
        return;
      }

      // Step 2: Delete removed attachments (after post update succeeds)
      if (removedAttachmentIds.length > 0) {
        const deleteResult = await postService.deleteMultipleFiles(removedAttachmentIds, parseInt(postId));
        if (deleteResult.error) {
          if (deleteResult.error.includes("JWT") || deleteResult.error.includes("expired")) {
            setShowSignInPrompt(true);
            setIsSaving(false);
            return;
          }
          // Post was updated but file deletion failed
          showNotification('error', `โพสต์ถูกอัปเดตแล้ว แต่การลบไฟล์ล้มเหลว: ${deleteResult.error}`);
          setTimeout(() => {
            router.push("/my-posts");
          }, 2000);
          return;
        }
        showNotification('success', `ลบไฟล์ ${removedAttachmentIds.length} ไฟล์สำเร็จ`);
      }

      // Step 3: Upload new files
      if (newFiles.length > 0) {
        for (let i = 0; i < newFiles.length; i++) {
          const file = newFiles[i];
          showNotification('info', `กำลังอัปโหลดไฟล์ ${i + 1}/${newFiles.length}...`);
          
          const uploadResult = await postService.uploadFileToPost(file, parseInt(postId));
          if (uploadResult.error) {
            if (uploadResult.error.includes("JWT") || uploadResult.error.includes("expired")) {
              setShowSignInPrompt(true);
              setIsSaving(false);
              return;
            }
            setError(`การอัปโหลดไฟล์ ${file.name} ล้มเหลว: ${uploadResult.error}`);
            setIsSaving(false);
            return;
          }
        }
        showNotification('success', `อัปโหลดไฟล์ ${newFiles.length} ไฟล์สำเร็จ`);
      }

      // Success - show notification and redirect
      showNotification('success', 'บันทึกการเปลี่ยนแปลงสำเร็จ');
      setTimeout(() => {
        router.push("/my-posts");
      }, 1500);
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
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-6 right-6 px-6 py-3 rounded-2xl shadow-lg text-white text-sm font-medium transition-all duration-300 z-50 ${
          notification.type === 'success' ? 'bg-green-500' : 
          notification.type === 'error' ? 'bg-red-500' : 
          'bg-blue-500'
        }`}>
          {notification.type === 'success' && '✓ '}
          {notification.type === 'error' && '✕ '}
          {notification.type === 'info' && 'ℹ '}
          {notification.message}
        </div>
      )}

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
            <div>
              <label className="block text-sm font-medium text-[#1c2a48] mb-2">
                ไฟล์ที่มีอยู่ <span className="text-red-500">*</span> (ต้องมีอย่างน้อย 1 ไฟล์)
              </label>
              
              {post?.attachments && post.attachments.length > 0 && (
                <div className="space-y-2">
                  {post.attachments.map((attachment) => {
                    const isMarkedForRemoval = removedAttachmentIds.includes(attachment.id);
                    
                    return (
                      <div
                        key={attachment.id}
                        className={`p-3 rounded-xl flex items-center justify-between transition-all ${
                          isMarkedForRemoval
                            ? 'bg-red-50 border border-red-200 opacity-60'
                            : 'bg-[#f8f9fa] border border-[#e0e7f1] hover:bg-[#f0f4f8]'
                        }`}
                      >
                        <div className="flex items-center flex-1 min-w-0">
                          <GoPaperclip className="mr-3 flex-shrink-0 text-lg text-[#5e7593]" />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${
                              isMarkedForRemoval ? 'text-red-500 line-through' : 'text-[#1c2a48]'
                            }`}>
                              {attachment.file_name}
                            </p>
                            <p className="text-xs text-[#7a8b99]">
                              {(attachment.file_size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-3">
                          {!isMarkedForRemoval ? (
                            <>
                              <button
                                type="button"
                                onClick={(e) => handleDownload(e, attachment.file_url)}
                                className="px-3 py-1.5 text-xs bg-[#405168] text-white rounded-full hover:bg-[#2d3a4c] transition-colors cursor-pointer"
                                title="ดาวน์โหลด"
                              >
                                ดาวน์โหลด
                              </button>
                              <button
                                type="button"
                                onClick={() => markAttachmentForRemoval(attachment.id)}
                                className="p-1.5 text-[#7a8b99] hover:text-red-500 transition-colors cursor-pointer"
                                title="ทำเครื่องหมายลบ"
                              >
                                <IoMdTrash size={18} />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => undoAttachmentRemoval(attachment.id)}
                              className="px-3 py-1.5 text-xs bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors cursor-pointer"
                              title="ยกเลิกการลบ"
                            >
                              เลิกลบ
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* File count summary */}
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-sm text-blue-700">
                  <strong>สรุป:</strong> ไฟล์ที่มีอยู่{' '}
                  {(post?.attachments?.length || 0) - removedAttachmentIds.length} ไฟล์
                  {removedAttachmentIds.length > 0 && (
                    <span className="text-red-600">
                      {' '}(จะลบ {removedAttachmentIds.length} ไฟล์)
                    </span>
                  )}
                  {newFiles.length > 0 && (
                    <span className="text-green-600">
                      {' '}+ เพิ่มใหม่ {newFiles.length} ไฟล์
                    </span>
                  )}
                  {' '}= รวม{' '}
                  {(post?.attachments?.length || 0) - removedAttachmentIds.length + newFiles.length} ไฟล์
                </p>
              </div>
            </div>

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
