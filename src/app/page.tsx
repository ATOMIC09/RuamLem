export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center pt-40">
      {/* Title */}
      <div className="text-[#5e7593] text-center">
        <h1 className="text-7xl font-bold">&quot;รวมเล่ม&quot;</h1>
        <p className="mt-4 text-xl">วาร์ปความรู้ ข้อสอบครบ</p>
      </div>
      {/* Button to smooth scroll down */}
      <div className="mt-10">
        <a
          href="#content"
          className="px-6 py-3 bg-white border border-[#405168] text-[#405168] rounded-3xl hover:text-white hover:bg-[#405168] transition-colors"
        >
           เริ่มกันเลย
        </a>
      </div>
      {/* Seperater with center text*/}
      <div id="content" className="mt-40 w-full max-w-full px-6">
        <div className="flex items-center">
          <hr className="flex-grow border-t border-[#405168]" />
          <span className="mx-4 text-[#405168]">โพสต์ล่าสุด</span>
          <hr className="flex-grow border-t border-[#405168]" />
        </div>
      </div>
    </div>
  );
}
