import { SlMagnifier } from "react-icons/sl";
import { useState, useEffect } from "react";
import * as postService from "@/services/post.service";

interface SearchBoxProps {
  onSearch?: (filters: {
    query: string;
    tags: string[];
    dateRange: string;
  }) => void;
}

export default function SearchBox({ onSearch }: SearchBoxProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [selectedDateRange, setSelectedDateRange] = useState("");
    const [availableTags, setAvailableTags] = useState<Array<{ id: number; name: string }>>([]);
    const [isLoadingTags, setIsLoadingTags] = useState(true);

    useEffect(() => {
        fetchTags();
    }, []);

    const fetchTags = async () => {
        setIsLoadingTags(true);
        try {
            const result = await postService.getTags();
            if (result.tags) {
                setAvailableTags(result.tags);
            }
        } catch (error) {
            console.error("Failed to fetch tags:", error);
            setAvailableTags([]);
        }
        setIsLoadingTags(false);
    };

    const handleQueryChange = (value: string) => {
        setSearchQuery(value);
        // Trigger search on every query change
        if (onSearch) {
            onSearch({
                query: value,
                tags: selectedTags,
                dateRange: selectedDateRange,
            });
        }
    };

    const toggleTag = (tag: string) => {
        const newTags = selectedTags.includes(tag)
            ? selectedTags.filter(t => t !== tag)
            : [...selectedTags, tag];
        setSelectedTags(newTags);
        if (onSearch) {
            onSearch({
                query: searchQuery,
                tags: newTags,
                dateRange: selectedDateRange,
            });
        }
    };

    const toggleDateRange = (date: string) => {
        const newDate = selectedDateRange === date ? "" : date;
        setSelectedDateRange(newDate);
        if (onSearch) {
            onSearch({
                query: searchQuery,
                tags: selectedTags,
                dateRange: newDate,
            });
        }
    };

    return (
        <div className="w-full">
            <div className="flex w-full bg-white rounded-3xl py-3 px-4 font-medium items-center gap-3 shadow-sm border border-[#e0e7f1] hover:shadow-md transition-shadow">
                <SlMagnifier size={20} className="text-[#5e7593]" />
                <input
                    type="text"
                    placeholder="ค้นหาโพสต์, วิชา, หรือคำสำคัญ..."
                    value={searchQuery}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    className="text-[#1c2a48] w-full bg-transparent focus:outline-none placeholder-[#7a8b99]"
                />
            </div>
            {/* Filter menu */}
            <div className="mt-4 bg-white rounded-3xl border border-[#e0e7f1] shadow-sm">
                <div className="px-6 py-3 border-b border-[#f0f4f8]">
                    <span className="text-sm font-semibold text-[#1c2a48]">รายวิชา</span>
                </div>
                {/* Tag selection slider, hide slide bar */}
                <div className="overflow-x-auto whitespace-nowrap px-6 py-3 scrollbar-hide">
                    {isLoadingTags ? (
                        <span className="text-sm text-[#7a8b99]">กำลังโหลดวิชา...</span>
                    ) : availableTags.length > 0 ? (
                        availableTags.map((tag) => (
                            <button 
                                key={tag.id} 
                                onClick={() => toggleTag(tag.name)}
                                className={`inline-block px-4 py-2 mr-3 mb-2 rounded-full border font-medium cursor-pointer transition-all ${
                                    selectedTags.includes(tag.name)
                                        ? "bg-[#405168] text-white border-[#405168]"
                                        : "bg-[#f0f4f8] text-[#5e7593] border-[#e0e7f1] hover:bg-[#e0e7f1] hover:shadow-sm"
                                }`}
                            >
                                {tag.name}
                            </button>
                        ))
                    ) : (
                        <span className="text-sm text-[#7a8b99]">ไม่มีวิชาให้เลือก</span>
                    )}
                </div>
                <div className="px-6 py-3 border-b border-t border-[#f0f4f8]">
                    <span className="text-sm font-semibold text-[#1c2a48]">วันที่</span>
                </div>
                <div className="overflow-x-auto whitespace-nowrap px-6 py-3 scrollbar-hide">
                    {["ล่าสุด", "วันนี้", "สัปดาห์นี้", "เดือนนี้", "ปีนี้"].map((date) => (
                        <button 
                            key={date} 
                            onClick={() => toggleDateRange(date)}
                            className={`inline-block px-4 py-2 mr-3 mb-2 rounded-full border font-medium cursor-pointer transition-all ${
                                selectedDateRange === date
                                    ? "bg-[#405168] text-white border-[#405168]"
                                    : "bg-[#f0f4f8] text-[#5e7593] border-[#e0e7f1] hover:bg-[#e0e7f1] hover:shadow-sm"
                            }`}
                        >
                            {date}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}