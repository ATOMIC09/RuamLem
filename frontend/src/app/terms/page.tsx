import Link from "next/link";

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#f8f9fa] to-white py-12 px-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-[#1c2a48] mb-3">เงื่อนไขการใช้งาน และนโยบายความเป็นส่วนตัว</h1>
                    <p className="text-[#7a8b99] leading-relaxed">
                        สำหรับนักศึกษาวิศวกรรมคอมพิวเตอร์ มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ
                    </p>
                    <p className="text-sm text-[#7a8b99] mt-2">อัปเดตล่าสุด: 22 กันยายน 2568</p>
                </div>

                <div className="bg-white rounded-3xl border border-[#e0e7f1] shadow-sm p-8 space-y-8">
                    {/* Terms of Service Section */}
                    <section>
                        <h2 className="text-2xl font-bold text-[#1c2a48] mb-4 flex items-center gap-2">
                            <span className="text-2xl">📋</span>
                            เงื่อนไขการใช้งาน
                        </h2>

                        <div className="space-y-6 text-[#405168]">
                            <div className="p-5 bg-[#f8f9fa] rounded-2xl border border-[#e0e7f1]">
                                <h3 className="text-base font-semibold text-[#1c2a48] mb-2">1. การยอมรับเงื่อนไข</h3>
                                <p className="leading-7 text-sm">
                                    เมื่อคุณเข้าใช้งานเว็บไซต์ &quot;รวมเล่ม&quot; คุณตกลงที่จะปฏิบัติตามเงื่อนไขการใช้งานนี้ 
                                    เว็บไซต์นี้จัดทำขึ้นเพื่อให้บริการฟรีสำหรับนักศึกษาวิศวกรรมคอมพิวเตอร์ (Cpr.E) 
                                    มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ เท่านั้น
                                </p>
                            </div>

                            <div className="p-5 bg-[#f8f9fa] rounded-2xl border border-[#e0e7f1]">
                                <h3 className="text-base font-semibold text-[#1c2a48] mb-3">2. คุณสมบัติของผู้ใช้งาน</h3>
                                <ul className="list-disc list-inside space-y-2 ml-2 text-sm">
                                    <li>เป็นนักศึกษาหลักสูตรวิศวกรรมศาสตรบัณฑิต สาขาวิศวกรรมคอมพิวเตอร์ (Cpr.E) มจพ.</li>
                                    <li>สามารถใช้อีเมลใดก็ได้เพื่อสร้างบัญชี</li>
                                    <li>ใช้งานเพื่อแชร์ความรู้ในกรอบของสาขา Cpr.E</li>
                                </ul>
                            </div>

                            <div className="p-5 bg-[#f8f9fa] rounded-2xl border border-[#e0e7f1]">
                                <h3 className="text-base font-semibold text-[#1c2a48] mb-3">3. การใช้งานที่อนุญาต</h3>
                                <ul className="list-disc list-inside space-y-2 ml-2 text-sm">
                                    <li>แชร์เอกสารการเรียน สรุป และข้อสอบสำหรับการศึกษา</li>
                                    <li>ให้คำปรึกษาและช่วยเหลือเพื่อนนักศึกษา</li>
                                    <li>สร้างกลุ่มศึกษาและแลกเปลี่ยนความรู้</li>
                                    <li>ใช้งานเพื่อวัตถุประสงค์ทางการศึกษาเท่านั้น</li>
                                </ul>
                            </div>

                            <div className="p-5 bg-[#f8f9fa] rounded-2xl border border-[#e0e7f1]">
                                <h3 className="text-base font-semibold text-[#1c2a48] mb-3">4. การใช้งานที่ห้าม</h3>
                                <ul className="list-disc list-inside space-y-2 ml-2 text-sm">
                                    <li>อัปโหลดเนื้อหาที่ละเมิดลิขสิทธิ์หรือผิดกฎหมาย</li>
                                    <li>แชร์เอกสารสำหรับการขายหรือหาผลกำไร</li>
                                    <li>ใช้ข้อมูลเพื่อวัตถุประสงค์ที่ไม่ใช่การศึกษา</li>
                                    <li>สร้างเนื้อหาที่ไม่เหมาะสมหรือก่อให้เกิดความขัดแย้ง</li>
                                    <li>ปลอมแปลงตัวตนหรือข้อมูลการศึกษา</li>
                                </ul>
                            </div>

                            <div className="p-5 bg-[#f8f9fa] rounded-2xl border border-[#e0e7f1]">
                                <h3 className="text-base font-semibold text-[#1c2a48] mb-2">5. ความรับผิดชอบของผู้ใช้</h3>
                                <p className="leading-7 text-sm">
                                    ผู้ใช้งานมีความรับผิดชอบต่อเนื้อหาที่อัปโหลด รวมถึงความถูกต้องและความเหมาะสม 
                                    ทางเว็บไซต์ไม่รับผิดชอบต่อความผิดพลาดในเนื้อหาหรือผลที่เกิดจากการใช้เอกสาร
                                </p>
                            </div>

                            <div className="p-5 bg-[#f8f9fa] rounded-2xl border border-[#e0e7f1]">
                                <h3 className="text-base font-semibold text-[#1c2a48] mb-2">6. การบริการฟรี</h3>
                                <p className="leading-7 text-sm">
                                    เว็บไซต์นี้ให้บริการฟรีสำหรับนักศึกษา Cpr.E KMUTNB โดยไม่มีค่าใช้จ่ายใดๆ 
                                    อย่างไรก็ตาม ทางเว็บไซต์ขอสงวนสิทธิ์ในการปรับเปลี่ยนเงื่อนไขการใช้งานได้ตามความเหมาะสม
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Privacy Policy Section */}
                    <section className="pt-6 border-t border-[#e0e7f1]">
                        <h2 className="text-2xl font-bold text-[#1c2a48] mb-4 flex items-center gap-2">
                            <span className="text-2xl">🔒</span>
                            นโยบายความเป็นส่วนตัว
                        </h2>

                        <div className="space-y-6 text-[#405168]">
                            <div className="p-5 bg-[#f8f9fa] rounded-2xl border border-[#e0e7f1]">
                                <h3 className="text-base font-semibold text-[#1c2a48] mb-3">1. ข้อมูลที่เราเก็บรวบรวม</h3>
                                <ul className="list-disc list-inside space-y-2 ml-2 text-sm">
                                    <li><strong>ข้อมูลส่วนบุคคล:</strong> ชื่อบัญชี, อีเมล</li>
                                    <li><strong>ข้อมูลการใช้งาน:</strong> เอกสารที่อัปโหลด, ความคิดเห็น, การโต้ตอบ</li>
                                    <li><strong>ข้อมูลทางเทคนิค:</strong> IP Address, Browser, ระยะเวลาการใช้งาน</li>
                                </ul>
                            </div>

                            <div className="p-5 bg-[#f8f9fa] rounded-2xl border border-[#e0e7f1]">
                                <h3 className="text-base font-semibold text-[#1c2a48] mb-3">2. วัตถุประสงค์การใช้ข้อมูล</h3>
                                <ul className="list-disc list-inside space-y-2 ml-2 text-sm">
                                    <li>ให้บริการแพลตฟอร์มแชร์ความรู้สำหรับสาขา Cpr.E</li>
                                    <li>ปรับปรุงและพัฒนาระบบให้ดียิ่งขึ้น</li>
                                    <li>สื่อสารข้อมูลสำคัญเกี่ยวกับการใช้งาน</li>
                                    <li>รักษาความปลอดภัยและป้องกันการใช้งานที่ไม่เหมาะสม</li>
                                </ul>
                            </div>

                            <div className="p-5 bg-[#f8f9fa] rounded-2xl border border-[#e0e7f1]">
                                <h3 className="text-base font-semibold text-[#1c2a48] mb-3">3. การคุ้มครองข้อมูล</h3>
                                <ul className="list-disc list-inside space-y-2 ml-2 text-sm">
                                    <li>เข้ารหัสข้อมูลส่วนบุคคลและรหัสผ่าน</li>
                                    <li>จำกัดการเข้าถึงข้อมูลเฉพาะผู้ดูแลระบบ</li>
                                    <li>สำรองข้อมูลเป็นระยะเพื่อป้องกันการสูญหาย</li>
                                    <li>ตรวจสอบและอัปเดตระบบความปลอดภัยสม่ำเสมอ</li>
                                </ul>
                            </div>

                            <div className="p-5 bg-[#f8f9fa] rounded-2xl border border-[#e0e7f1]">
                                <h3 className="text-base font-semibold text-[#1c2a48] mb-2">4. การแชร์ข้อมูล</h3>
                                <p className="leading-7 text-sm mb-3">
                                    เราจะไม่เปิดเผยข้อมูลส่วนบุคคลของคุณให้กับบุคคลที่สาม ยกเว้น:
                                </p>
                                <ul className="list-disc list-inside space-y-2 ml-2 text-sm">
                                    <li>เมื่อได้รับความยินยอมจากคุณ</li>
                                    <li>เพื่อปฏิบัติตามกฎหมายหรือคำสั่งศาล</li>
                                    <li>เพื่อรักษาความปลอดภัยของระบบและผู้ใช้งาน</li>
                                </ul>
                            </div>

                            <div className="p-5 bg-[#f8f9fa] rounded-2xl border border-[#e0e7f1]">
                                <h3 className="text-base font-semibold text-[#1c2a48] mb-3">5. สิทธิของผู้ใช้งาน</h3>
                                <ul className="list-disc list-inside space-y-2 ml-2 text-sm">
                                    <li>ขอเข้าถึงข้อมูลส่วนบุคคลของตนเอง</li>
                                    <li>แก้ไขหรือปรับปรุงข้อมูลที่ไม่ถูกต้อง</li>
                                    <li>ขอลบบัญชีและข้อมูลส่วนบุคคล</li>
                                    <li>ถอนความยินยอมการใช้ข้อมูล</li>
                                    <li>ร้องเรียนการใช้ข้อมูลที่ไม่เหมาะสม</li>
                                </ul>
                            </div>

                            <div className="p-5 bg-[#f8f9fa] rounded-2xl border border-[#e0e7f1]">
                                <h3 className="text-base font-semibold text-[#1c2a48] mb-2">6. การติดต่อ</h3>
                                <p className="leading-7 text-sm">
                                    ช่องทางการติดต่อและแจ้งปัญหากำลังอยู่ในระหว่างการพัฒนา 
                                    ในขณะนี้ยังไม่มีช่องทางการติดต่ออย่างเป็นทางการ 
                                    หากมีคำถามหรือข้อกังวลเกี่ยวกับนโยบายความเป็นส่วนตัว กรุณารอการประกาศช่องทางการติดต่อในอนาคต
                                </p>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Back to Home Link */}
                <div className="text-center mt-8">
                    <Link 
                        href="/" 
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#405168] text-white rounded-3xl hover:bg-[#2d3a4c] hover:shadow-md transition-all font-medium shadow-sm"
                    >
                        กลับไปหน้าหลัก
                    </Link>
                </div>
            </div>
        </div>
    );
}