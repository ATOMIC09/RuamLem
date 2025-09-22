import SearchBox from "../components/searchbox";
import PreviewPost from "../components/previewpost";

export default function CommunityPage() {
  return (
    <div className="flex flex-col min-h-screen items-center p-8 sm:p-20">
      <SearchBox />
      {/* Postbox only with title in grid */}
      <div className="w-full max-w-4xl mx-auto mt-8 grid grid-cols-2 gap-4">
        <PreviewPost />
        <PreviewPost />
        <PreviewPost />
        <PreviewPost />
      </div>
    </div>
  );
}