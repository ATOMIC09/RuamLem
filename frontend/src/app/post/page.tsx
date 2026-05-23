"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IoMdPricetag, IoMdClose } from "react-icons/io";
import { GoPaperclip } from "react-icons/go";
import Link from "next/link";
import * as postService from "@/services/post.service";

interface Tag {
  id: number;
  name: string;
}

function AddPostForm() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [availableTags, setAvailableTags] = useState<Tag[]>([]);
    const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showSignInPrompt, setShowSignInPrompt] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Fetch available tags on mount
    useEffect(() => {
        const fetchTags = async () => {
            const result = await postService.getTags();
            if (result.tags) {
                setAvailableTags(result.tags);
            }
        };
        fetchTags();
    }, []);

    const handleTagInput = (value: string) => {
        setNewTag(value);
        
        if (value.trim() && tags.length < 1) {
            // Filter tags based on input
            const filtered = availableTags.filter(tag =>
                tag.name.toLowerCase().includes(value.toLowerCase())
            );
            setFilteredTags(filtered);
            // Show suggestions if there are filtered results or if the input is a new tag
            setShowSuggestions(filtered.length > 0 || value.trim().length > 0);
        } else {
            setFilteredTags([]);
            setShowSuggestions(false);
        }
    };

    // Check if a tag name exists in available tags
    const isExistingTag = (tagName: string): boolean => {
        return availableTags.some(tag =>
            tag.name.toLowerCase() === tagName.trim().toLowerCase()
        );
    };

    const selectTag = (tag: Tag) => {
        setTags([tag.name]);
        setNewTag("");
        setFilteredTags([]);
        setShowSuggestions(false);
    };

    const selectTagByName = (tagName: string) => {
        if (tags.length < 1) {
            setTags([tagName]);
            setNewTag("");
            setFilteredTags([]);
            setShowSuggestions(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            const totalFiles = files.length + newFiles.length;
            
            // Check if total files exceed limit
            if (totalFiles > 10) {
                setError(`จำนวนไฟล์ทั้งหมดต้องไม่เกิน 10 ไฟล์ (ปัจจุบัน: ${files.length} + ${newFiles.length})`);
                return;
            }
            
            // Add new files to existing files
            setFiles([...files, ...newFiles]);
            setError(""); // Clear any previous errors
            
            // Reset the input so you can select the same file again if needed
            e.target.value = '';
        }
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    // Handle drag and drop events
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        const totalFiles = files.length + droppedFiles.length;

        // Check if total files exceed limit
        if (totalFiles > 10) {
            setError(`จำนวนไฟล์ทั้งหมดต้องไม่เกิน 10 ไฟล์ (ปัจจุบัน: ${files.length} + ${droppedFiles.length})`);
            return;
        }

        // Add dropped files to existing files
        setFiles([...files, ...droppedFiles]);
        setError(""); // Clear any previous errors
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        setSuccess(false);

        // Validation
        if (!title.trim()) {
            setError("กรุณากรอกหัวข้อโพสต์");
            setIsLoading(false);
            return;
        }

        if (tags.length !== 1) {
            setError("กรุณาเลือกแท็กเพียงหนึ่งแท็กเท่านั้น");
            setIsLoading(false);
            return;
        }

        if (files.length === 0) {
            setError("กรุณาแนบไฟล์อย่างน้อยหนึ่งไฟล์");
            setIsLoading(false);
            return;
        }

        if (files.length > 10) {
            setError("จำนวนไฟล์ต้องไม่เกิน 10 ไฟล์");
            setIsLoading(false);
            return;
        }

        // Check file size (50MB max per file)
        const MAX_FILE_SIZE = 50 * 1024 * 1024;
        for (const file of files) {
            if (file.size > MAX_FILE_SIZE) {
                setError(`ไฟล์ ${file.name} มีขนาดเกิน 50MB`);
                setIsLoading(false);
                return;
            }
        }

        try {
            // Call the backend service to create post
            const response = await postService.createPost({
                title: title.trim(),
                body: description.trim(),
                tags: tags,
                files: files,
            });

            if (response.error) {
                // Check for JWT expiration
                if (response.error.includes('JWT') || response.error.includes('expired')) {
                    setShowSignInPrompt(true);
                    setError("");
                } else {
                    setError(response.error || "การสร้างโพสต์ล้มเหลว");
                }
                setIsLoading(false);
                return;
            }

            // Success - show message and redirect
            setSuccess(true);
            setTitle("");
            setDescription("");
            setTags([]);
            setFiles([]);

            // Redirect to community page after 2 seconds
            setTimeout(() => {
                router.push("/community");
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen">
            {/* Hero Section */}
            <div className="w-full bg-gradient-to-b from-[#f8f9fa] to-white py-12 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-4xl font-bold text-[#1c2a48] mb-2">เพิ่มโพสต์ใหม่</h1>
                    <p className="text-lg text-[#7a8b99]">แชร์ความรู้และเอกสารกับเพื่อน ๆ</p>
                </div>
            </div>

            {/* Form Section */}
            <div className="flex flex-col items-center flex-1 p-8 sm:p-20">
                {/* Add Post Form */}
                <div className="w-full max-w-2xl mx-auto border border-[#e0e7f1] rounded-3xl bg-white shadow-sm p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Error Message */}
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Success Message */}
                        {success && (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-green-600 text-sm">
                                โพสต์สำเร็จ! กำลังเปลี่ยนหน้า...
                            </div>
                        )}

                        {/* Title Input */}
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-[#1c2a48] mb-2">
                                หัวข้อโพสต์ <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-3 border border-[#e0e7f1] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5e7593] focus:border-transparent text-[#1c2a48] shadow-sm hover:shadow-md transition-shadow"
                                placeholder="เช่น สรุปมิดเทอมวิชา Software Engineering"
                                required
                            />
                        </div>

                        {/* Description Input */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-[#1c2a48] mb-2">
                                รายละเอียด
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                className="w-full px-4 py-3 border border-[#e0e7f1] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5e7593] focus:border-transparent text-[#1c2a48] resize-none shadow-sm hover:shadow-md transition-shadow"
                                placeholder="อธิบายเพิ่มเติมเกี่ยวกับเนื้อหาที่แชร์..."
                            />
                        </div>

                        {/* Tags Section */}
                        <div>
                            <label className="block text-sm font-medium text-[#1c2a48] mb-2">
                                แท็ก <span className="text-red-500">*</span> (เลือกได้เพียง 1 แท็ก)
                            </label>
                            
                            {/* Selected Tag */}
                            {tags.length > 0 && (
                                <div className="mb-3">
                                    <span className="inline-flex items-center px-3 py-1 text-sm bg-[#e0e7f1] text-[#5e7593] rounded-full">
                                        <IoMdPricetag className="mr-1" />
                                        {tags[0]}
                                        <button
                                            type="button"
                                            onClick={() => setTags([])}
                                            className="ml-2 text-[#7a8b99] hover:text-red-500 cursor-pointer"
                                        >
                                            <IoMdClose size={14} />
                                        </button>
                                    </span>
                                </div>
                            )}

                            {/* Tag Input with Autocomplete */}
                            {tags.length === 0 && (
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
                                            // Delay to allow click on suggestion
                                            setTimeout(() => setShowSuggestions(false), 200);
                                        }}
                                        className="w-full px-4 py-2 border border-[#e0e7f1] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5e7593] focus:border-transparent text-[#1c2a48] shadow-sm hover:shadow-md transition-shadow"
                                        placeholder="พิมพ์เพื่อค้นหาแท็ก"
                                    />

                                    {/* Autocomplete Suggestions */}
                                    {showSuggestions && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e0e7f1] rounded-2xl shadow-lg z-10">
                                            {/* Existing tag suggestions */}
                                            {filteredTags.slice(0, 5).map((tag) => (
                                                <button
                                                    key={tag.id}
                                                    type="button"
                                                    onClick={() => selectTag(tag)}
                                                    className="w-full text-left px-4 py-2 text-[#5e7593] hover:bg-[#f8f9fa] transition-colors first:rounded-t-2xl cursor-pointer"
                                                >
                                                    <IoMdPricetag className="inline mr-2" size={14} />
                                                    {tag.name}
                                                </button>
                                            ))}
                                            
                                            {/* New tag option if input doesn't match any existing tag */}
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
                            {tags.length === 0 && availableTags.length > 0 && !newTag.trim() && (
                                <div className="mt-4">
                                    <p className="text-xs text-[#7a8b99] mb-2">แท็กยอดนิยม:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {availableTags.slice(0, 5).map((tag) => (
                                            <button
                                                key={tag.id}
                                                type="button"
                                                onClick={() => selectTagByName(tag.name)}
                                                className="px-3 py-1 text-xs bg-[#f8f9fa] text-[#5e7593] rounded-full border border-[#e0e7f1] hover:bg-[#e0e7f1] transition-colors cursor-pointer"
                                            >
                                                <IoMdPricetag className="inline mr-1" size={12} />
                                                {tag.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Create New Tag Button - shown when typing a new tag */}
                            {tags.length === 0 && newTag.trim() && !isExistingTag(newTag) && !showSuggestions && (
                                <div className="mt-3">
                                    <button
                                        type="button"
                                        onClick={() => selectTagByName(newTag.trim())}
                                        className="px-4 py-2 text-sm bg-green-50 text-green-700 rounded-2xl border border-green-200 hover:bg-green-100 transition-colors cursor-pointer font-medium flex items-center gap-2"
                                    >
                                        <span className="text-lg">+</span>
                                        สร้างแท็กใหม่: &quot;{newTag.trim()}&quot;
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* File Upload Section */}
                        <div>
                            <label className="block text-sm font-medium text-[#1c2a48] mb-2">
                                แนบไฟล์ <span className="text-red-500">*</span> (สูงสุด 10 ไฟล์)
                            </label>
                            <div 
                                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                                    isDragging 
                                        ? 'border-[#405168] bg-blue-50 scale-105' 
                                        : 'border-[#e0e7f1] bg-[#f8f9fa] hover:bg-[#f0f4f8]'
                                }`}
                                onDragOver={handleDragOver}
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleFileChange}
                                    accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.txt"
                                    className="hidden"
                                    id="file-upload"
                                />
                                <label htmlFor="file-upload" className="cursor-pointer">
                                    <GoPaperclip className={`mx-auto mb-2 text-2xl transition-colors ${
                                        isDragging ? 'text-[#405168]' : 'text-[#5e7593]'
                                    }`} />
                                    <p className={`font-medium transition-colors ${
                                        isDragging ? 'text-[#405168]' : 'text-[#5e7593]'
                                    }`}>
                                        {isDragging ? 'วางไฟล์ที่นี่' : 'คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวาง'}
                                    </p>
                                    <p className="text-sm text-[#7a8b99] mt-1">ขนาดสูงสุด 50MB ต่อไฟล์ (PDF, Word, PowerPoint, รูปภาพ, Text)</p>
                                </label>
                            </div>

                            {/* Display selected files with count */}
                            {files && files.length > 0 && (
                                <div className="mt-4">
                                    <div className="mb-2 flex items-center justify-between">
                                        <p className="text-sm font-medium text-[#1c2a48]">
                                            ไฟล์ที่เลือก ({files.length}/10)
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        {Array.from(files).map((file, index) => (
                                            <div key={index} className="flex items-center justify-between px-4 py-3 bg-[#f8f9fa] rounded-2xl text-[#5e7593] border border-[#e0e7f1] hover:bg-[#f0f4f8] transition-colors">
                                                <div className="flex items-center flex-1 min-w-0">
                                                    <GoPaperclip className="mr-3 flex-shrink-0 text-lg" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate text-[#1c2a48]">{file.name}</p>
                                                        <p className="text-xs text-[#7a8b99]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(index)}
                                                    className="ml-3 flex-shrink-0 text-[#7a8b99] hover:text-red-500 transition-colors cursor-pointer"
                                                    title="Remove file"
                                                >
                                                    <IoMdClose size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4 pt-4">
                            <button
                                type="button"
                                onClick={() => window.history.back()}
                                disabled={isLoading}
                                className="flex-1 px-6 py-3 border border-[#e0e7f1] text-[#405168] rounded-3xl hover:bg-[#f8f9fa] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm hover:shadow-md cursor-pointer"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="submit"
                                disabled={!title.trim() || isLoading}
                                className="flex-1 px-6 py-3 bg-[#405168] text-white rounded-3xl hover:bg-[#2d3a4c] disabled:bg-[#7a8b99] disabled:cursor-not-allowed transition-colors font-medium shadow-sm hover:shadow-md cursor-pointer"
                            >
                                {isLoading ? "กำลังโพสต์..." : "โพสต์"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

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

export default function AddPostPage() {
    return <AddPostForm />;
}
