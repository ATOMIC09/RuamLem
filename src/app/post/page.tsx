"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IoMdPricetag, IoMdAdd, IoMdClose } from "react-icons/io";
import { GoPaperclip } from "react-icons/go";
import AuthGuard from "../components/auth-guard";
import * as postService from "@/services/post.service";

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

    const addTag = () => {
        if (newTag.trim() && !tags.includes(newTag.trim())) {
            setTags([...tags, newTag.trim()]);
            setNewTag("");
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
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

        if (tags.length === 0) {
            setError("กรุณาเพิ่มอย่างน้อยหนึ่งแท็ก");
            setIsLoading(false);
            return;
        }

        if (files.length === 0) {
            setError("กรุณาแนบไฟล์อย่างน้อยหนึ่งไฟล์");
            setIsLoading(false);
            return;
        }

        if (files.length > 1) {
            setError("กรุณาแนบไฟล์เพียงหนึ่งไฟล์เท่านั้น");
            setIsLoading(false);
            return;
        }

        // Check file size (50MB max)
        const MAX_FILE_SIZE = 50 * 1024 * 1024;
        if (files[0].size > MAX_FILE_SIZE) {
            setError("ขนาดไฟล์ต้องไม่เกิน 50MB");
            setIsLoading(false);
            return;
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
                setError(response.error || "การสร้างโพสต์ล้มเหลว");
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
                                แท็ก
                            </label>
                            
                            {/* Existing Tags */}
                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {tags.map((tag, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center px-3 py-1 text-sm bg-[#e0e7f1] text-[#5e7593] rounded-full"
                                        >
                                            <IoMdPricetag className="mr-1" />
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => removeTag(tag)}
                                                className="ml-2 text-[#7a8b99] hover:text-red-500"
                                            >
                                                <IoMdClose size={14} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Add New Tag */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                    className="flex-1 px-4 py-2 border border-[#e0e7f1] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5e7593] focus:border-transparent text-[#1c2a48] shadow-sm hover:shadow-md transition-shadow"
                                    placeholder="เช่น Software Engineering, Computer Science"
                                />
                                <button
                                    type="button"
                                    onClick={addTag}
                                    className="px-4 py-2 bg-[#e0e7f1] text-[#5e7593] rounded-2xl hover:bg-[#d1d9e4] transition-colors flex items-center cursor-pointer shadow-sm hover:shadow-md"
                                >
                                    <IoMdAdd />
                                </button>
                            </div>
                        </div>

                        {/* File Upload Section */}
                        <div>
                            <label className="block text-sm font-medium text-[#1c2a48] mb-2">
                                แนบไฟล์
                            </label>
                            <div className="border-2 border-dashed border-[#e0e7f1] rounded-2xl p-6 text-center bg-[#f8f9fa] hover:bg-[#f0f4f8] transition-colors">
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleFileChange}
                                    accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.txt"
                                    className="hidden"
                                    id="file-upload"
                                />
                                <label htmlFor="file-upload" className="cursor-pointer">
                                    <GoPaperclip className="mx-auto mb-2 text-2xl text-[#5e7593]" />
                                    <p className="text-[#5e7593] font-medium">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวาง</p>
                                    <p className="text-sm text-[#7a8b99] mt-1">ขนาดสูงสุด 50MB (PDF, Word, PowerPoint, รูปภาพ, Text)</p>
                                </label>
                            </div>

                            {/* Display selected files */}
                            {files && files.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    {Array.from(files).map((file, index) => (
                                        <div key={index} className="flex items-center px-4 py-2 bg-[#e0e7f1] rounded-2xl text-[#5e7593]">
                                            <GoPaperclip className="mr-2 flex-shrink-0" />
                                            <span className="text-sm truncate">{file.name}</span>
                                        </div>
                                    ))}
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
        </div>
    );
}

export default function AddPostPage() {
    return (
        <AuthGuard>
            <AddPostForm />
        </AuthGuard>
    );
}
