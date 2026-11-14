"use client";

import React from "react";
import { X, Check } from "lucide-react";

export interface FilterState {
  city: string;
  minCoverage: number; // 0, 30, 50, 70, 100
  topik: number | "all"; // "all", 0, 3, 4, 5, 6
  schoolType: string; // "all", "Quốc gia / Công lập", "Tư thục", "Viện nghiên cứu"
  dormRequired: boolean;
  degreeLevel: string; // "all", "Đại học", "Thạc sĩ", "Tiến sĩ", "Học tiếng"
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onChangeFilters: (filters: FilterState) => void;
  onResetFilters: () => void;
  totalMatches: number;
}

export default function FilterModal({
  isOpen,
  onClose,
  filters,
  onChangeFilters,
  onResetFilters,
  totalMatches,
}: FilterModalProps) {
  if (!isOpen) return null;

  const coverageOptions = [
    { value: 0, label: "Tất cả mức" },
    { value: 30, label: "Từ 30% Học phí" },
    { value: 50, label: "Từ 50% Học phí" },
    { value: 70, label: "Từ 70% Học phí" },
    { value: 100, label: "100% Toàn phần" },
  ];

  const topikOptions = [
    { value: "all", label: "Bất kỳ" },
    { value: 0, label: "Không cần TOPIK (Học tiếng Anh/D-4)" },
    { value: 3, label: "TOPIK 3" },
    { value: 4, label: "TOPIK 4" },
    { value: 5, label: "TOPIK 5" },
    { value: 6, label: "TOPIK 6" },
  ];

  const schoolTypeOptions = [
    { value: "all", label: "Tất cả các loại trường" },
    { value: "Quốc gia / Công lập", label: "Đại học Quốc gia / Công lập" },
    { value: "Tư thục", label: "Đại học Tư thục" },
    { value: "Viện nghiên cứu", label: "Viện nghiên cứu quốc gia (KAIST, GIST)" },
  ];

  const degreeOptions = [
    { value: "all", label: "Tất cả bậc học" },
    { value: "Đại học", label: "Cử nhân (Đại học)" },
    { value: "Thạc sĩ", label: "Thạc sĩ" },
    { value: "Tiến sĩ", label: "Tiến sĩ" },
    { value: "Học tiếng", label: "Hệ học tiếng D-4" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in">
      {/* Modal Dialog */}
      <div className="bg-white dark:bg-[#161d26] rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.3)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-[#e5e7eb] dark:border-[#2a3441] overflow-hidden transition-colors">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb] dark:border-[#2a3441] relative">
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-full hover:bg-[#f2f4f5] dark:hover:bg-[#1f2937] transition-colors text-[#000000] dark:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-base font-extrabold text-[#000000] dark:text-white absolute left-1/2 -translate-x-1/2">
            Bộ lọc học bổng
          </h2>
          <div className="w-9" />
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 divide-y divide-[#e5e7eb] dark:divide-[#2a3441] text-sm">
          
          {/* Section 1: Mức học bổng */}
          <div className="pb-6">
            <h3 className="font-extrabold text-base text-[#000000] dark:text-white mb-1">
              Mức tài trợ học bổng
            </h3>
            <p className="text-xs text-[#86909c] dark:text-gray-400 mb-4">
              Lọc theo tỷ lệ miễn giảm học phí tối thiểu mà trường cấp
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {coverageOptions.map((opt) => {
                const isSelected = filters.minCoverage === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() =>
                      onChangeFilters({ ...filters, minCoverage: opt.value })
                    }
                    className={`px-4 py-3 rounded-2xl border text-xs font-bold text-center transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#000000] dark:border-[#00f0a0] bg-[#000000] dark:bg-[#00f0a0] text-white dark:text-black shadow-xs"
                        : "border-[#e5e7eb] dark:border-[#2a3441] text-[#000000] dark:text-white hover:border-[#000000] dark:hover:border-gray-400 bg-white dark:bg-[#1a232e]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Yêu cầu chứng chỉ TOPIK */}
          <div className="py-6">
            <h3 className="font-extrabold text-base text-[#000000] dark:text-white mb-1">
              Yêu cầu chứng chỉ TOPIK
            </h3>
            <p className="text-xs text-[#86909c] dark:text-gray-400 mb-4">
              Chọn mức TOPIK tối đa bạn đang có hoặc dự kiến đạt được
            </p>
            <div className="flex flex-wrap gap-2">
              {topikOptions.map((opt) => {
                const isSelected = filters.topik === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    onClick={() =>
                      onChangeFilters({
                        ...filters,
                        topik: opt.value as number | "all",
                      })
                    }
                    className={`px-4 py-2.5 rounded-full border text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#000000] dark:border-[#00f0a0] bg-[#000000] dark:bg-[#00f0a0] text-white dark:text-black"
                        : "border-[#e5e7eb] dark:border-[#2a3441] text-[#000000] dark:text-white hover:border-[#000000] dark:hover:border-gray-400 bg-white dark:bg-[#1a232e]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Loại hình trường đại học */}
          <div className="py-6">
            <h3 className="font-extrabold text-base text-[#000000] dark:text-white mb-1">
              Loại hình trường đại học
            </h3>
            <p className="text-xs text-[#86909c] dark:text-gray-400 mb-4">
              Trường công lập có học phí gốc rẻ, trường tư thục có nhiều gói học bổng đầu vào
            </p>
            <div className="space-y-2">
              {schoolTypeOptions.map((opt) => {
                const isSelected = filters.schoolType === opt.value;
                return (
                  <label
                    key={opt.value}
                    onClick={() =>
                      onChangeFilters({ ...filters, schoolType: opt.value })
                    }
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-[#f2f4f5] dark:hover:bg-[#1f2937] cursor-pointer transition-colors"
                  >
                    <span className="font-semibold text-[#000000] dark:text-white text-sm">
                      {opt.label}
                    </span>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? "bg-[#000000] dark:bg-[#00f0a0] border-[#000000] dark:border-[#00f0a0] text-white dark:text-black"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white dark:text-black stroke-[3]" />}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Section 4: Bậc học */}
          <div className="py-6">
            <h3 className="font-extrabold text-base text-[#000000] dark:text-white mb-1">
              Hệ đào tạo
            </h3>
            <div className="flex flex-wrap gap-2 mt-3">
              {degreeOptions.map((opt) => {
                const isSelected = filters.degreeLevel === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() =>
                      onChangeFilters({ ...filters, degreeLevel: opt.value })
                    }
                    className={`px-4 py-2.5 rounded-full border text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#000000] dark:border-[#00f0a0] bg-[#000000] dark:bg-[#00f0a0] text-white dark:text-black"
                        : "border-[#e5e7eb] dark:border-[#2a3441] text-[#000000] dark:text-white hover:border-[#000000] dark:hover:border-gray-400 bg-white dark:bg-[#1a232e]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 5: Quyền lợi đặc biệt */}
          <div className="pt-6">
            <h3 className="font-extrabold text-base text-[#000000] dark:text-white mb-1">
              Chính sách hỗ trợ nơi ở
            </h3>
            <label
              onClick={() =>
                onChangeFilters({
                  ...filters,
                  dormRequired: !filters.dormRequired,
                })
              }
              className="flex items-center justify-between p-3 rounded-xl hover:bg-[#f2f4f5] dark:hover:bg-[#1f2937] cursor-pointer transition-colors mt-2"
            >
              <div>
                <div className="font-bold text-[#000000] dark:text-white text-sm">
                  Ưu tiên trường có hỗ trợ ký túc xá (KTX)
                </div>
                <div className="text-xs text-[#86909c] dark:text-gray-400">
                  Giúp giảm bớt chi phí thuê nhà đắt đỏ tại Hàn Quốc
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                  filters.dormRequired
                    ? "bg-[#00f0a0] border-[#00f0a0] text-black"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              >
                {filters.dormRequired && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
              </div>
            </label>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e5e7eb] dark:border-[#2a3441] flex items-center justify-between bg-white dark:bg-[#161d26]">
          <button
            onClick={onResetFilters}
            className="text-sm font-bold text-[#000000] dark:text-gray-300 underline underline-offset-4 hover:opacity-75 dark:hover:text-white cursor-pointer"
          >
            Xóa tất cả
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl bg-[#00f0a0] hover:bg-[#00d88f] text-black text-sm font-black transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            Xem {totalMatches} học bổng
          </button>
        </div>

      </div>
    </div>
  );
}
