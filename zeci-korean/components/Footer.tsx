"use client";

import React from "react";
import { Globe } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#f2f4f5] dark:bg-[#090d11] border-t border-[#e5e7eb] dark:border-[#2a3441] text-sm text-[#86909c] dark:text-gray-400 mt-20 transition-colors">
      <div className="max-w-7xl mx-auto px-4 md:px-12 lg:px-20 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* Col 1 */}
          <div>
            <h4 className="font-extrabold text-[#000000] dark:text-white mb-3 text-xs uppercase tracking-wider">
              Về Zeci Korean
            </h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <a href="#" className="hover:text-[#000000] dark:hover:text-[#00f0a0] hover:underline">
                  Giới thiệu cổng học bổng
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#000000] dark:hover:text-[#00f0a0] hover:underline">
                  Dữ liệu trường đại học Hàn Quốc
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#000000] dark:hover:text-[#00f0a0] hover:underline">
                  Cơ hội hợp tác tuyển sinh
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#000000] dark:hover:text-[#00f0a0] hover:underline">
                  Chính sách bảo mật thông tin
                </a>
              </li>
            </ul>
          </div>

          {/* Col 2 */}
          <div>
            <h4 className="font-extrabold text-[#000000] dark:text-white mb-3 text-xs uppercase tracking-wider">
              Theo thành phố du học
            </h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <a href="#Seoul" className="hover:text-[#000000] dark:hover:text-[#00f0a0] hover:underline">
                  Học bổng Seoul (SKY, Hanyang, Kyung Hee)
                </a>
              </li>
              <li>
                <a href="#Busan" className="hover:text-[#000000] dark:hover:text-[#00f0a0] hover:underline">
                  Học bổng Busan (PNU, Dong-A, PKNU)
                </a>
              </li>
              <li>
                <a href="#Daegu" className="hover:text-[#000000] dark:hover:text-[#00f0a0] hover:underline">
                  Học bổng Daegu (Đại học Daegu, KNU)
                </a>
              </li>
              <li>
                <a href="#Daejeon" className="hover:text-[#000000] dark:hover:text-[#00f0a0] hover:underline">
                  Học bổng Daejeon (KAIST, CNU)
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <h4 className="font-extrabold text-[#000000] dark:text-white mb-3 text-xs uppercase tracking-wider">
              Cẩm nang du học sinh
            </h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <a href="#" className="hover:text-[#000000] dark:hover:text-[#00f0a0] hover:underline">
                  Lộ trình ôn thi TOPIK từ 0 đến 5
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#000000] dark:hover:text-[#00f0a0] hover:underline">
                  Bí quyết viết bài luận SOP & Kế hoạch học tập
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#000000] dark:hover:text-[#00f0a0] hover:underline">
                  Kinh nghiệm phỏng vấn giáo sư xin học bổng
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#000000] dark:hover:text-[#00f0a0] hover:underline">
                  Chi phí sinh hoạt từng khu vực tại Hàn
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4 */}
          <div>
            <h4 className="font-extrabold text-[#000000] dark:text-white mb-3 text-xs uppercase tracking-wider">
              Hỗ trợ ứng tuyển
            </h4>
            <div className="space-y-2 text-xs font-medium">
              <p>Hotline tư vấn: <strong className="text-[#000000] dark:text-white">0988 123 456</strong></p>
              <p>Email: <strong className="text-[#000000] dark:text-white">scholarship@zeci.vn</strong></p>
              <p>Địa chỉ văn phòng: Tòa nhà Zeci, Hà Nội & TP. Hồ Chí Minh</p>
              <div className="pt-2">
                <span className="inline-block px-3 py-1 rounded-full bg-[#ecffe0] dark:bg-[#00f0a0]/15 text-[#000000] dark:text-[#00f0a0] font-bold text-[11px] border border-[#00f0a0]/60 dark:border-[#00f0a0]/30">
                  ● Đang mở hồ sơ kỳ Thu 2026
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-[#e5e7eb] dark:border-[#2a3441] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium">
          <div className="flex items-center gap-2">
            <span>© 2026 Zeci Korean. Thiết kế lấy cảm hứng từ Jobright Design System.</span>
          </div>

          <div className="flex items-center gap-4 font-bold text-[#000000] dark:text-white">
            <div className="flex items-center gap-1.5 cursor-pointer hover:underline">
              <Globe className="w-4 h-4" />
              <span>Tiếng Việt (VN)</span>
            </div>
            <span>₫ VND / ₩ KRW</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
