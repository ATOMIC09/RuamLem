"use client";

import Image from "next/image";
import { useState } from "react";
import { IoMdPricetag, IoMdAdd, IoMdClose } from "react-icons/io";
import { GoPaperclip } from "react-icons/go";
import AuthGuard from "../components/auth-guard";

function AddPostForm() {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState("");
    const [files, setFiles] = useState<FileList | null>(null);

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
        setFiles(e.target.files);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Handle form submission here
        console.log("Post data:", { title, description, tags, files });
    };

    return (
        <div className="flex flex-col min-h-screen items-center p-8 sm:p-20">
            {/* Page Title */}
            <div className="text-[#5e7593] text-center mb-8">
                <h1 className="text-4xl font-bold text-[#1c2a48]">เพิ่มโพสต์ใหม่</h1>
                <p className="mt-2 text-lg">แชร์ความรู้และเอกสารกับเพื่อน ๆ</p>
            </div>

            {/* Add Post Form */}
            <div className="w-full max-w-2xl mx-auto p-6 text-[#5e7593] border rounded-3xl border-[#405168] bg-white">
                <form onSubmit={handleSubmit} className="space-y-6">
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
                            className="w-full px-4 py-3 border border-[#405168] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5e7593] focus:border-transparent text-[#1c2a48]"
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
                            className="w-full px-4 py-3 border border-[#405168] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5e7593] focus:border-transparent text-[#1c2a48] resize-none"
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
                                className="flex-1 px-4 py-2 border border-[#405168] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#5e7593] focus:border-transparent text-[#1c2a48]"
                                placeholder="เช่น Software Engineering, Computer Science"
                            />
                            <button
                                type="button"
                                onClick={addTag}
                                className="px-4 py-2 bg-[#e0e7f1] text-[#5e7593] rounded-2xl hover:bg-[#d1d9e4] transition-colors flex items-center cursor-pointer"
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
                        <div className="border-2 border-dashed border-[#405168] rounded-2xl p-6 text-center">
                            <input
                                type="file"
                                multiple
                                onChange={handleFileChange}
                                accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
                                className="hidden"
                                id="file-upload"
                            />
                            <label htmlFor="file-upload" className="cursor-pointer">
                                <GoPaperclip className="mx-auto mb-2 text-2xl text-[#5e7593]" />
                                <p className="text-[#5e7593]">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวาง</p>
                                <p className="text-sm text-[#7a8b99] mt-1">รองรับ PDF, Word, PowerPoint, รูปภาพ</p>
                            </label>
                        </div>

                        {/* Display selected files */}
                        {files && files.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {Array.from(files).map((file, index) => (
                                    <div key={index} className="flex items-center px-4 py-2 bg-[#e0e7f1] rounded-full">
                                        <GoPaperclip className="mr-2 text-[#5e7593]" />
                                        <span className="text-[#5e7593] text-sm">{file.name}</span>
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
                            className="flex-1 px-6 py-3 border border-[#405168] text-[#405168] rounded-3xl hover:bg-[#f8f9fa] transition-colors cursor-pointer"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={!title.trim()}
                            className="flex-1 px-6 py-3 bg-[#405168] text-white rounded-3xl hover:bg-[#2d3a4c] disabled:bg-[#7a8b99] disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                            โพสต์
                        </button>
                    </div>
                </form>
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
