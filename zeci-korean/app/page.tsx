"use client";

import React, { useState, useMemo, useEffect } from "react";
import Navbar from "@/components/Navbar";
import SearchFilterHub from "@/components/SearchFilterHub";
import ScholarshipCard from "@/components/ScholarshipCard";
import FilterModal, { FilterState } from "@/components/FilterModal";
import ScholarshipDetailModal from "@/components/ScholarshipDetailModal";
import FavoritesModal from "@/components/FavoritesModal";
import Footer from "@/components/Footer";
import { SCHOLARSHIPS_DATA, ScholarshipItem, CITIES } from "@/data/scholarships";
import { ArrowUpDown, RotateCcw, AlertCircle, MapPin } from "lucide-react";

export default function Home() {
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [sortBy, setSortBy] = useState<"recommended" | "coverage-desc" | "rating-desc" | "topik-asc">("recommended");
  
  const [filters, setFilters] = useState<FilterState>({
    city: "all",
    minCoverage: 0,
    topik: "all",
    schoolType: "all",
    dormRequired: false,
    degreeLevel: "all",
  });

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedScholarship, setSelectedScholarship] = useState<ScholarshipItem | null>(null);
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("zeci_korean_favorites");
      if (saved) {
        setFavoriteIds(JSON.parse(saved));
      }
    } catch {
      // fallback
    }
  }, []);

  // Save favorites to localStorage
  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteIds((prev) => {
      const updated = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem("zeci_korean_favorites", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleRemoveFavorite = (id: string) => {
    setFavoriteIds((prev) => {
      const updated = prev.filter((item) => item !== id);
      try {
        localStorage.setItem("zeci_korean_favorites", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Synchronize city selection
  const handleSelectCity = (cityId: string) => {
    setSelectedCity(cityId);
    setFilters((prev) => ({ ...prev, city: cityId }));
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCity("all");
    setFilters({
      city: "all",
      minCoverage: 0,
      topik: "all",
      schoolType: "all",
      dormRequired: false,
      degreeLevel: "all",
    });
  };

  // Count active non-default filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCity !== "all") count++;
    if (filters.minCoverage > 0) count++;
    if (filters.topik !== "all") count++;
    if (filters.schoolType !== "all") count++;
    if (filters.dormRequired) count++;
    if (filters.degreeLevel !== "all") count++;
    return count;
  }, [filters, selectedCity]);

  // Filtered and sorted scholarships
  const filteredScholarships = useMemo(() => {
    return SCHOLARSHIPS_DATA.filter((item) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesKrName = item.koreanName.toLowerCase().includes(q);
        const matchesCity = item.city.toLowerCase().includes(q);
        const matchesTitle = item.scholarshipTitle.toLowerCase().includes(q);
        if (!matchesName && !matchesKrName && !matchesCity && !matchesTitle) {
          return false;
        }
      }

      // City filter
      if (selectedCity !== "all" && item.city !== selectedCity) {
        return false;
      }

      // Min coverage percentage
      if (filters.minCoverage > 0 && item.coveragePercentage < filters.minCoverage) {
        return false;
      }

      // TOPIK level requirement
      if (filters.topik !== "all") {
        if (filters.topik === 0 && item.topikRequired !== 0) {
          return false;
        }
        if (typeof filters.topik === "number" && filters.topik > 0) {
          if (item.topikRequired > filters.topik) {
            return false;
          }
        }
      }

      // School Type
      if (filters.schoolType !== "all" && item.type !== filters.schoolType) {
        return false;
      }

      // Dormitory
      if (filters.dormRequired && !item.dormSupport) {
        return false;
      }

      // Degree level
      if (filters.degreeLevel !== "all") {
        const targetDegree = filters.degreeLevel as ScholarshipItem["degreeLevels"][number];
        if (!item.degreeLevels.includes(targetDegree)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "coverage-desc") {
        return b.coveragePercentage - a.coveragePercentage;
      }
      if (sortBy === "rating-desc") {
        return b.rating - a.rating;
      }
      if (sortBy === "topik-asc") {
        return a.topikRequired - b.topikRequired;
      }
      return 0; // recommended original order
    });
  }, [searchQuery, selectedCity, filters, sortBy]);

  // Favorite items
  const favoriteItems = useMemo(() => {
    return SCHOLARSHIPS_DATA.filter((item) => favoriteIds.includes(item.id));
  }, [favoriteIds]);

  const activeCityInfo = CITIES.find((c) => c.id === selectedCity);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0d1117] text-[#000000] dark:text-white transition-colors duration-200">
      {/* 1. Header Navbar */}
      <Navbar
        favoritesCount={favoriteIds.length}
        onOpenFavorites={() => setIsFavoritesModalOpen(true)}
      />

      {/* 2. Unified Search & Filter Hub */}
      <SearchFilterHub
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCity={selectedCity}
        onSelectCity={handleSelectCity}
        filters={filters}
        onChangeFilters={setFilters}
        onOpenFilterModal={() => setIsFilterModalOpen(true)}
        onResetFilters={handleResetFilters}
        activeFilterCount={activeFilterCount}
        totalResults={filteredScholarships.length}
      />

      {/* Main Listing Section */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-12 lg:px-20 py-8">
        
        {/* City Info Banner - when a city is selected */}
        {selectedCity !== "all" && activeCityInfo && (
          <div className="mb-8 p-5 rounded-2xl bg-[#ecffe0] dark:bg-[#00f0a0]/15 border border-[#00f0a0]/40 dark:border-[#00f0a0]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-black dark:bg-[#00f0a0] flex items-center justify-center text-white dark:text-black">
                <MapPin className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-base font-black text-[#000000] dark:text-white">
                  Khu vực {activeCityInfo.label} ({filteredScholarships.length} trường đại học)
                </h2>
                {"desc" in activeCityInfo && (
                  <p className="text-xs text-[#86909c] dark:text-gray-300 mt-0.5 font-medium">
                    {activeCityInfo.desc}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => handleSelectCity("all")}
              className="text-xs font-bold text-[#000000] dark:text-[#00f0a0] hover:underline cursor-pointer"
            >
              Xem tất cả thành phố &rarr;
            </button>
          </div>
        )}

        {/* Results Bar with Sort Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 text-sm text-[#86909c] dark:text-gray-400">
          <div className="font-bold text-[#000000] dark:text-white">
            Hiện có{" "}
            <span className="bg-[#ecffe0] dark:bg-[#00f0a0]/20 text-[#000000] dark:text-[#00f0a0] px-2 py-0.5 rounded font-black">
              {filteredScholarships.length}
            </span>{" "}
            học bổng phù hợp
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs font-medium">Sắp xếp:</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "recommended" | "coverage-desc" | "rating-desc" | "topik-asc")}
                className="text-xs font-bold text-[#000000] dark:text-white bg-[#f2f4f5] dark:bg-[#161d26] border border-[#e5e7eb] dark:border-[#2a3441] rounded-xl px-3 py-2 pr-7 appearance-none focus:outline-hidden cursor-pointer hover:border-[#000000] dark:hover:border-white"
              >
                <option value="recommended" className="dark:bg-[#161d26]">Gợi ý hàng đầu</option>
                <option value="coverage-desc" className="dark:bg-[#161d26]">Học bổng cao nhất (100% &rarr; 30%)</option>
                <option value="rating-desc" className="dark:bg-[#161d26]">Đánh giá sinh viên cao nhất</option>
                <option value="topik-asc" className="dark:bg-[#161d26]">Dễ xin nhất (TOPIK thấp nhất)</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Scholarship Grid */}
        {filteredScholarships.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
            {filteredScholarships.map((item) => (
              <ScholarshipCard
                key={item.id}
                item={item}
                isFavorite={favoriteIds.includes(item.id)}
                onToggleFavorite={handleToggleFavorite}
                onSelect={(selected) => setSelectedScholarship(selected)}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-[#ecffe0] dark:bg-[#00f0a0]/15 text-black dark:text-[#00f0a0] flex items-center justify-center mb-4 border border-[#00f0a0]/50">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-extrabold text-[#000000] dark:text-white mb-1">
              Không tìm thấy học bổng phù hợp
            </h3>
            <p className="text-sm text-[#86909c] dark:text-gray-400 max-w-md mb-6">
              Hãy thử nới lỏng các tiêu chí tìm kiếm hoặc xóa các bộ lọc để xem thêm các cơ hội học bổng khác.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-6 py-3 rounded-xl bg-[#000000] dark:bg-[#00f0a0] hover:bg-[#1f2937] dark:hover:bg-[#00d88f] text-white dark:text-black text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Đặt lại toàn bộ bộ lọc</span>
            </button>
          </div>
        )}

      </main>

      {/* 4. Modals */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={filters}
        onChangeFilters={setFilters}
        onResetFilters={handleResetFilters}
        totalMatches={filteredScholarships.length}
      />

      <ScholarshipDetailModal
        item={selectedScholarship}
        onClose={() => setSelectedScholarship(null)}
        isFavorite={selectedScholarship ? favoriteIds.includes(selectedScholarship.id) : false}
        onToggleFavorite={handleToggleFavorite}
      />

      <FavoritesModal
        isOpen={isFavoritesModalOpen}
        onClose={() => setIsFavoritesModalOpen(false)}
        favorites={favoriteItems}
        onRemoveFavorite={handleRemoveFavorite}
        onSelectScholarship={(item) => setSelectedScholarship(item)}
      />

      {/* 5. Footer */}
      <Footer />
    </div>
  );
}
