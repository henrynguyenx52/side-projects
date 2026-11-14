"use client";

import React, { useState } from "react";
import { GraduationCap, Globe, Menu, User, Sparkles, BookOpen, Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface NavbarProps {
  favoritesCount: number;
  onOpenFavorites: () => void;
}

export default function Navbar({ favoritesCount, onOpenFavorites }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-[#0d1117] border-b border-[#e5e7eb] dark:border-[#2a3441] px-4 md:px-12 lg:px-20 transition-colors">
      <div className="flex items-center justify-between h-20 max-w-7xl mx-auto">
        {/* Brand Logo - Jobright style with #00f0a0 mint accent */}
        <div className="flex items-center gap-2.5 cursor-pointer select-none">
          <div className="w-10 h-10 rounded-full bg-[#00f0a0] flex items-center justify-center text-black shadow-xs hover:scale-105 transition-transform">
            <GraduationCap className="w-5 h-5 text-black stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-extrabold tracking-tight text-[#000000] dark:text-white">
                zeci
              </span>
              <span className="text-xl font-bold tracking-tight text-[#000000] dark:text-white">
                korean
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#ecffe0] dark:bg-[#00f0a0]/15 text-[#000000] dark:text-[#00f0a0] font-bold border border-[#00f0a0]/60 dark:border-[#00f0a0]/40">
                KR 🇰🇷
              </span>
            </div>
            <span className="text-[11px] text-[#86909c] dark:text-gray-400 font-medium hidden sm:inline">
              Cổng tra cứu học bổng du học Hàn Quốc
            </span>
          </div>
        </div>

        {/* Center Pill Message / Badge */}
        <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full border border-[#e5e7eb] dark:border-[#2a3441] text-sm font-semibold text-[#000000] dark:text-white bg-[#ecffe0]/70 dark:bg-[#161d26]">
          <Sparkles className="w-4 h-4 text-[#00f0a0]" />
          <span>Cập nhật kỳ nhập học Thu 2026 & Xuân 2027</span>
        </div>

        {/* Right Action Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle Button (Light/Dark Mode) */}
          <button
            onClick={toggleTheme}
            aria-label="Chuyển chế độ sáng tối"
            className="p-2.5 rounded-full hover:bg-[#f2f4f5] dark:hover:bg-[#1f2937] text-[#000000] dark:text-white transition-colors cursor-pointer"
            title={theme === "light" ? "Chuyển sang chế độ tối" : "Chuyển sang chế độ sáng"}
          >
            {theme === "light" ? (
              <Moon className="w-5 h-5 text-[#86909c] hover:text-black transition-colors" />
            ) : (
              <Sun className="w-5 h-5 text-[#00f0a0] transition-colors" />
            )}
          </button>

          <button
            onClick={onOpenFavorites}
            className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-[#000000] dark:text-white hover:bg-[#f2f4f5] dark:hover:bg-[#1f2937] px-3.5 py-2.5 rounded-full transition-colors cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-[#00f0a0]" />
            <span>Đã lưu</span>
            {favoritesCount > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs font-extrabold bg-[#00f0a0] text-black rounded-full shadow-2xs">
                {favoritesCount}
              </span>
            )}
          </button>

          <button
            aria-label="Ngôn ngữ"
            className="p-2.5 rounded-full hover:bg-[#f2f4f5] dark:hover:bg-[#1f2937] text-[#000000] dark:text-white transition-colors cursor-pointer"
          >
            <Globe className="w-5 h-5 text-[#86909c] dark:text-gray-400" />
          </button>

          {/* User Profile Pill button */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-3 pl-3.5 pr-2 py-1.5 rounded-full border border-[#e5e7eb] dark:border-[#2a3441] hover:border-[#000000] dark:hover:border-white hover:shadow-xs transition-all cursor-pointer bg-white dark:bg-[#161d26]"
            >
              <Menu className="w-4 h-4 text-[#000000] dark:text-white" />
              <div className="w-8 h-8 rounded-full bg-[#000000] dark:bg-white flex items-center justify-center text-white dark:text-black">
                <User className="w-4 h-4 text-white dark:text-black" />
              </div>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#161d26] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.14)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-[#e5e7eb] dark:border-[#2a3441] py-2 z-50 text-sm">
                <div className="px-4 py-2 font-bold text-[#000000] dark:text-white border-b border-[#e5e7eb] dark:border-[#2a3441]">
                  Chào mừng bạn đến với Zeci Korean
                </div>
                <button
                  onClick={() => {
                    onOpenFavorites();
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#f2f4f5] dark:hover:bg-[#1f2937] text-[#000000] dark:text-white font-medium"
                >
                  Danh sách học bổng đã lưu ({favoritesCount})
                </button>
                <button
                  onClick={() => {
                    toggleTheme();
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#f2f4f5] dark:hover:bg-[#1f2937] text-[#000000] dark:text-white font-medium flex items-center justify-between"
                >
                  <span>Chế độ giao diện</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#f2f4f5] dark:bg-[#2a3441] text-[#86909c] dark:text-gray-300">
                    {theme === "light" ? "Sáng ☀️" : "Tối 🌙"}
                  </span>
                </button>
                <a
                  href="#how-to-apply"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2.5 hover:bg-[#f2f4f5] dark:hover:bg-[#1f2937] text-[#000000] dark:text-white font-medium"
                >
                  Kinh nghiệm xin học bổng TOPIK
                </a>
                <a
                  href="#contact"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2.5 hover:bg-[#f2f4f5] dark:hover:bg-[#1f2937] text-[#000000] dark:text-white font-medium border-t border-[#e5e7eb] dark:border-[#2a3441]"
                >
                  Tư vấn lộ trình du học 1:1
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
