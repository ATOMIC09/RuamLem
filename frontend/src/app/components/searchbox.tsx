import { SlMagnifier } from "react-icons/sl";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import * as postService from "@/services/post.service";

interface SearchBoxProps {
  onSearch?: (filters: {
    query: string;
    tags: string[];
    dateRange: string;
    fileTypes: string[];
  }) => void;
}

export default function SearchBox({ onSearch }: SearchBoxProps) {
    const router = useRouter();
    const params = useSearchParams();
    
    // Read from URL params
    const urlQuery = params?.get?.("q") || "";
    const urlTags = useMemo(() => 
        params?.get?.("tags") ? params.get("tags")!.split(",").filter(t => t) : [],
        [params]
    );
    const urlDateRange = params?.get?.("dateRange") || "";
    const urlFileTypes = useMemo(() => 
        params?.get?.("fileTypes") ? params.get("fileTypes")!.split(",").filter(t => t) : [],
        [params]
    );
    
    const [searchQuery, setSearchQuery] = useState(urlQuery);
    const [selectedTags, setSelectedTags] = useState<string[]>(urlTags);
    const [selectedDateRange, setSelectedDateRange] = useState(urlDateRange);
    const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>(urlFileTypes);
    const [availableTags, setAvailableTags] = useState<Array<{ id: number; name: string }>>([]);
    const [isLoadingTags, setIsLoadingTags] = useState(true);

    const availableFileTypes = [
        { id: 1, name: "PDF", display: "PDF (.pdf)" },
        { id: 2, name: "รูปภาพ", display: "รูปภาพ (.jpg, .png, .gif)" },
        { id: 3, name: "เอกสาร", display: "เอกสาร (.doc, .docx, .txt)" },
        { id: 4, name: "สเปรดชีต", display: "สเปรดชีต (.xls, .xlsx, .csv)" },
        { id: 5, name: "งานนำเสนอ", display: "งานนำเสนอ (.ppt, .pptx)" },
    ];

    useEffect(() => {
        fetchTags();
    }, []);

    // Update from URL when params change
    useEffect(() => {
        setSearchQuery(urlQuery);
        setSelectedTags(urlTags);
        setSelectedDateRange(urlDateRange);
        setSelectedFileTypes(urlFileTypes);
    }, [urlQuery, urlTags, urlDateRange, urlFileTypes]);

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
        updateURL(value, selectedTags, selectedDateRange, selectedFileTypes);
    };

    const toggleTag = (tag: string) => {
        const newTags = selectedTags.includes(tag)
            ? selectedTags.filter(t => t !== tag)
            : [...selectedTags, tag];
        setSelectedTags(newTags);
        updateURL(searchQuery, newTags, selectedDateRange, selectedFileTypes);
    };

    const toggleDateRange = (date: string) => {
        const newDate = selectedDateRange === date ? "" : date;
        setSelectedDateRange(newDate);
        updateURL(searchQuery, selectedTags, newDate, selectedFileTypes);
    };

    const toggleFileType = (fileType: string) => {
        const newFileTypes = selectedFileTypes.includes(fileType)
            ? selectedFileTypes.filter(t => t !== fileType)
            : [...selectedFileTypes, fileType];
        setSelectedFileTypes(newFileTypes);
        updateURL(searchQuery, selectedTags, selectedDateRange, newFileTypes);
    };

    const updateURL = (query: string, tags: string[], dateRange: string, fileTypes: string[]) => {
        const newParams = new URLSearchParams();
        if (query) newParams.set("q", query);
        if (tags.length > 0) newParams.set("tags", tags.join(","));
        if (dateRange) newParams.set("dateRange", dateRange);
        if (fileTypes.length > 0) newParams.set("fileTypes", fileTypes.join(","));
        
        const newURL = newParams.toString() 
            ? `/community?${newParams.toString()}`
            : "/community";
        
        router.push(newURL);
        
        // Also call onSearch for backward compatibility if needed
        if (onSearch) {
            onSearch({ query, tags, dateRange, fileTypes });
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
                    <span className="text-sm font-semibold text-[#1c2a48]">ประเภทไฟล์</span>
                </div>
                <div className="overflow-x-auto whitespace-nowrap px-6 py-3 scrollbar-hide">
                    {availableFileTypes.map((fileType) => (
                        <button 
                            key={fileType.id} 
                            onClick={() => toggleFileType(fileType.name)}
                            className={`inline-block px-4 py-2 mr-3 mb-2 rounded-full border font-medium cursor-pointer transition-all ${
                                selectedFileTypes.includes(fileType.name)
                                    ? "bg-[#405168] text-white border-[#405168]"
                                    : "bg-[#f0f4f8] text-[#5e7593] border-[#e0e7f1] hover:bg-[#e0e7f1] hover:shadow-sm"
                            }`}
                        >
                            {fileType.display || fileType.name}
                        </button>
                    ))}
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