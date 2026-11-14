"use client";

import React from "react";
import { Search, MapPin, Award, BookCheck, SlidersHorizontal, X, Home, Sparkles, Check } from "lucide-react";
import { CITIES } from "@/data/scholarships";
import { FilterState } from "./FilterModal";

interface SearchFilterHubProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCity: string;
  onSelectCity: (cityId: string) => void;
  filters: FilterState;
  onChangeFilters: (filters: FilterState) => void;
  onOpenFilterModal: () => void;
  onResetFilters: () => void;
  activeFilterCount: number;
  totalResults: number;
}

export default function SearchFilterHub({
  searchQuery,
  onSearchChange,
  selectedCity,
  onSelectCity,
  filters,
  onChangeFilters,
  onOpenFilterModal,
  onResetFilters,
  activeFilterCount,
  totalResults,
}: SearchFilterHubProps) {
  // Quick coverage options
  const coveragePills = [
    { value: 0, label: "Tất cả mức" },
    { value: 100, label: "100% Toàn phần" },
    { value: 70, label: "Từ 70% Học phí" },
    { value: 50, label: "Từ 50% Học phí" },
  ];

  // Quick topik options
  const topikPills: { value: "all" | 0 | 3 | 4 | 5; label: string }[] = [
    { value: "all", label: "Mọi trình độ" },
    { value: 0, label: "Không cần TOPIK" },
    { value: 3, label: "TOPIK 3+" },
    { value: 4, label: "TOPIK 4+" },
    { value: 5, label: "TOPIK 5+" },
  ];

  return (
    <div className="bg-white dark:bg-[#0d1117] border-b border-[#e5e7eb] dark:border-[#2a3441] pt-8 pb-6 px-4 md:px-12 lg:px-20 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#ecffe0] dark:bg-[#00f0a0]/15 text-[#000000] dark:text-[#00f0a0] text-xs font-bold border border-[#00f0a0]/50 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cập nhật chính sách học bổng Hàn Quốc 2026 - 2027</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-[#000000] dark:text-white tracking-tight leading-tight">
            Săn Học Bổng Du Học Hàn Quốc
          </h1>

          <p className="text-sm md:text-base text-[#86909c] dark:text-gray-400 font-medium max-w-2xl mx-auto">
            Khám phá hơn 50+ gói học bổng từ 30% đến 100% học phí, đài thọ sinh hoạt phí và ký túc xá tại các trường đại học hàng đầu theo từng thành phố.
          </p>
        </div>

        {/* Main Search Bar - Jobright High Contrast Bar */}
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-center bg-[#f2f4f5] dark:bg-[#161d26] rounded-2xl border border-[#e5e7eb] dark:border-[#2a3441] focus-within:border-[#000000] dark:focus-within:border-[#00f0a0] focus-within:bg-white dark:focus-within:bg-[#1a232e] focus-within:ring-2 focus-within:ring-[#00f0a0]/30 shadow-xs transition-all p-1.5">
            <div className="pl-4 pr-2 text-[#86909c] dark:text-gray-400">
              <Search className="w-5 h-5" />
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm theo tên trường (SNU, KAIST, Yonsei...), khu vực hoặc từ khóa..."
              className="w-full text-sm font-semibold text-[#000000] dark:text-white placeholder:text-[#86909c] dark:placeholder:text-gray-500 bg-transparent outline-none focus:outline-none py-2.5"
            />

            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 mr-2 cursor-pointer transition-colors"
                title="Xóa tìm kiếm"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => {}}
              className="px-5 py-2.5 rounded-xl bg-[#00f0a0] hover:bg-[#00d88f] text-black font-extrabold text-xs shrink-0 cursor-pointer transition-all active:scale-95 shadow-2xs"
            >
              Tìm kiếm ({totalResults})
            </button>
          </div>
        </div>

        {/* Filter Section: Segmented & Well-distributed */}
        <div className="space-y-4 pt-2">
          
          {/* Row 1: Thành phố (Location Pills) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#86909c] dark:text-gray-400 shrink-0">
              <MapPin className="w-3.5 h-3.5 text-[#000000] dark:text-[#00f0a0]" />
              <span>Thành phố:</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth w-full py-1">
              {CITIES.map((city) => {
                const isActive = selectedCity === city.id;
                return (
                  <button
                    key={city.id}
                    onClick={() => onSelectCity(city.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer outline-none focus:outline-none ${
                      isActive
                        ? "bg-[#000000] text-white dark:bg-[#00f0a0] dark:text-black shadow-xs scale-102"
                        : "bg-[#f2f4f5] dark:bg-[#161d26] text-[#000000] dark:text-gray-300 border border-[#e5e7eb] dark:border-[#2a3441] hover:border-[#000000] dark:hover:border-white hover:text-black dark:hover:text-white"
                    }`}
                  >
                    <span>{city.label}</span>
                    <span
                      className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? "bg-white/20 dark:bg-black/20 text-white dark:text-black"
                          : "bg-gray-200 dark:bg-gray-700 text-[#86909c] dark:text-gray-300"
                      }`}
                    >
                      {city.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 2: Điều kiện nhanh (Coverage, TOPIK, Dorm, Advanced Filters) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#f2f4f5] dark:border-[#1a232e]">
            
            {/* Left: Quick Condition Groups */}
            <div className="flex flex-wrap items-center gap-4">
              
              {/* Coverage Pills */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-[#86909c] dark:text-gray-400 uppercase tracking-wider hidden md:inline-flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-[#000000] dark:text-[#00f0a0]" />
                  <span>Mức học bổng:</span>
                </span>
                <div className="flex items-center gap-1.5 bg-[#f2f4f5] dark:bg-[#161d26] p-1 rounded-xl border border-[#e5e7eb] dark:border-[#2a3441]">
                  {coveragePills.map((pill) => {
                    const isSelected = filters.minCoverage === pill.value;
                    return (
                      <button
                        key={pill.value}
                        onClick={() =>
                          onChangeFilters({ ...filters, minCoverage: pill.value })
                        }
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer outline-none focus:outline-none ${
                          isSelected
                            ? "bg-[#000000] text-white dark:bg-[#00f0a0] dark:text-black shadow-2xs"
                            : "text-[#86909c] dark:text-gray-400 hover:text-black dark:hover:text-white"
                        }`}
                      >
                        {pill.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TOPIK Pills */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-[#86909c] dark:text-gray-400 uppercase tracking-wider hidden lg:inline-flex items-center gap-1">
                  <BookCheck className="w-3.5 h-3.5 text-[#000000] dark:text-[#00f0a0]" />
                  <span>TOPIK:</span>
                </span>
                <div className="flex items-center gap-1.5 bg-[#f2f4f5] dark:bg-[#161d26] p-1 rounded-xl border border-[#e5e7eb] dark:border-[#2a3441]">
                  {topikPills.map((pill) => {
                    const isSelected = filters.topik === pill.value;
                    return (
                      <button
                        key={String(pill.value)}
                        onClick={() =>
                          onChangeFilters({ ...filters, topik: pill.value })
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer outline-none focus:outline-none ${
                          isSelected
                            ? "bg-[#000000] text-white dark:bg-[#00f0a0] dark:text-black shadow-2xs"
                            : "text-[#86909c] dark:text-gray-400 hover:text-black dark:hover:text-white"
                        }`}
                      >
                        {pill.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Dorm Toggle */}
              <button
                onClick={() =>
                  onChangeFilters({
                    ...filters,
                    dormRequired: !filters.dormRequired,
                  })
                }
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer outline-none focus:outline-none ${
                  filters.dormRequired
                    ? "bg-[#ecffe0] dark:bg-[#00f0a0]/15 border-[#00f0a0] text-[#000000] dark:text-[#00f0a0]"
                    : "bg-[#f2f4f5] dark:bg-[#161d26] border-[#e5e7eb] dark:border-[#2a3441] text-[#86909c] dark:text-gray-400 hover:text-black dark:hover:text-white"
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <div
                  className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center ${
                    filters.dormRequired
                      ? "bg-[#00f0a0] border-[#00f0a0] text-black"
                      : "border-gray-400"
                  }`}
                >
                  {filters.dormRequired && <Check className="w-2.5 h-2.5 text-black stroke-[3]" />}
                </div>
                <span>Có ký túc xá</span>
              </button>

            </div>

            {/* Right: Advanced Filter Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenFilterModal}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#e5e7eb] dark:border-[#2a3441] hover:border-[#000000] dark:hover:border-white text-xs font-bold text-[#000000] dark:text-white bg-white dark:bg-[#161d26] transition-all cursor-pointer shadow-2xs outline-none focus:outline-none"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#000000] dark:text-white" />
                <span>Bộ lọc nâng cao</span>
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#00f0a0] text-black text-[10px] font-black flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

          </div>

          {/* Row 3: Active Filters Summary Tag Bar */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#f2f4f5] dark:border-[#1a232e] text-xs">
              <span className="font-bold text-[#86909c] dark:text-gray-400">
                Đang lọc:
              </span>

              {selectedCity !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f2f4f5] dark:bg-[#1a232e] border border-[#e5e7eb] dark:border-[#2a3441] font-bold text-[#000000] dark:text-white">
                  Thành phố: {selectedCity}
                  <button
                    onClick={() => onSelectCity("all")}
                    className="hover:text-red-500 cursor-pointer ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filters.minCoverage > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ecffe0] dark:bg-[#00f0a0]/15 border border-[#00f0a0]/40 font-bold text-[#000000] dark:text-[#00f0a0]">
                  Học bổng: ≥ {filters.minCoverage}%
                  <button
                    onClick={() =>
                      onChangeFilters({ ...filters, minCoverage: 0 })
                    }
                    className="hover:text-red-500 cursor-pointer ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filters.topik !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f2f4f5] dark:bg-[#1a232e] border border-[#e5e7eb] dark:border-[#2a3441] font-bold text-[#000000] dark:text-white">
                  {filters.topik === 0 ? "Không cần TOPIK" : `TOPIK: ${filters.topik}+`}
                  <button
                    onClick={() =>
                      onChangeFilters({ ...filters, topik: "all" })
                    }
                    className="hover:text-red-500 cursor-pointer ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filters.dormRequired && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f2f4f5] dark:bg-[#1a232e] border border-[#e5e7eb] dark:border-[#2a3441] font-bold text-[#000000] dark:text-white">
                  Có KTX
                  <button
                    onClick={() =>
                      onChangeFilters({ ...filters, dormRequired: false })
                    }
                    className="hover:text-red-500 cursor-pointer ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filters.schoolType !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f2f4f5] dark:bg-[#1a232e] border border-[#e5e7eb] dark:border-[#2a3441] font-bold text-[#000000] dark:text-white">
                  {filters.schoolType}
                  <button
                    onClick={() =>
                      onChangeFilters({ ...filters, schoolType: "all" })
                    }
                    className="hover:text-red-500 cursor-pointer ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filters.degreeLevel !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f2f4f5] dark:bg-[#1a232e] border border-[#e5e7eb] dark:border-[#2a3441] font-bold text-[#000000] dark:text-white">
                  Bậc: {filters.degreeLevel}
                  <button
                    onClick={() =>
                      onChangeFilters({ ...filters, degreeLevel: "all" })
                    }
                    className="hover:text-red-500 cursor-pointer ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <button
                onClick={onResetFilters}
                className="text-xs font-bold text-[#000000] dark:text-[#00f0a0] underline underline-offset-2 ml-2 hover:opacity-80 cursor-pointer"
              >
                Xóa tất cả bộ lọc
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
