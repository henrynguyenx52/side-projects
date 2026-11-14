"use client";

import React from "react";
import { Heart, Star, MapPin, Award, Home } from "lucide-react";
import { ScholarshipItem } from "@/data/scholarships";

interface ScholarshipCardProps {
  item: ScholarshipItem;
  isFavorite: boolean;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onSelect: (item: ScholarshipItem) => void;
}

export default function ScholarshipCard({
  item,
  isFavorite,
  onToggleFavorite,
  onSelect,
}: ScholarshipCardProps) {
  return (
    <div
      onClick={() => onSelect(item)}
      className="group cursor-pointer flex flex-col select-none transition-transform duration-200"
    >
      {/* Image Container */}
      <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-[#f2f4f5] dark:bg-[#161d26] border border-[#e5e7eb] dark:border-[#2a3441] mb-3">
        <img
          src={item.coverImage}
          alt={item.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Top-left Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {item.coveragePercentage === 100 && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-[#00f0a0] text-black shadow-xs tracking-tight">
              Học bổng 100%
            </span>
          )}
          {item.badge && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/85 backdrop-blur-xs text-white shadow-xs">
              {item.badge}
            </span>
          )}
        </div>

        {/* Top-right Heart Button */}
        <button
          onClick={(e) => onToggleFavorite(item.id, e)}
          className="absolute top-3 right-3 p-2 rounded-full hover:scale-115 active:scale-95 transition-transform z-10 cursor-pointer"
          aria-label="Lưu vào danh sách yêu thích"
        >
          <Heart
            className={`w-6 h-6 stroke-white stroke-2 drop-shadow-md transition-colors ${
              isFavorite ? "fill-[#00f0a0] stroke-black" : "fill-black/35"
            }`}
          />
        </button>

        {/* Bottom Dorm Badge if supported */}
        {item.dormSupport && (
          <div className="absolute bottom-2.5 left-3 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-white text-[10px] font-semibold flex items-center gap-1">
            <Home className="w-3 h-3 text-[#00f0a0]" />
            <span>Có hỗ trợ KTX</span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="flex flex-col gap-1">
        {/* Title row: University name & Rating */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-[15px] text-[#000000] dark:text-white leading-tight line-clamp-1 group-hover:underline dark:group-hover:text-[#00f0a0] transition-colors">
            {item.name}
          </h3>
          <div className="flex items-center gap-1 shrink-0 text-sm font-bold text-[#000000] dark:text-white">
            <Star className="w-3.5 h-3.5 fill-[#000000] dark:fill-[#00f0a0] text-[#000000] dark:text-[#00f0a0]" />
            <span>{item.rating.toFixed(2)}</span>
          </div>
        </div>

        {/* Location & University Type */}
        <div className="flex items-center gap-1 text-[13px] text-[#86909c] dark:text-gray-400">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-[#86909c] dark:text-gray-400" />
          <span className="truncate">{item.district}</span>
          <span>•</span>
          <span className="shrink-0">{item.type}</span>
        </div>

        {/* Scholarship Name */}
        <div className="text-[13px] font-semibold text-[#000000] dark:text-gray-200 flex items-center gap-1 truncate mt-0.5">
          <Award className="w-3.5 h-3.5 text-[#000000] dark:text-[#00f0a0] shrink-0" />
          <span className="truncate">{item.scholarshipTitle}</span>
        </div>

        {/* Condition tags: TOPIK & GPA */}
        <div className="flex items-center gap-2 text-xs text-[#86909c] dark:text-gray-400 mt-0.5">
          <span className="px-2 py-0.5 rounded-md bg-[#f2f4f5] dark:bg-[#1f2937] border border-[#e5e7eb] dark:border-[#2a3441] font-semibold text-[#000000] dark:text-gray-200">
            {item.topikRequired === 0 ? "Không cần TOPIK" : `TOPIK ${item.topikRequired}+`}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-[#f2f4f5] dark:bg-[#1f2937] border border-[#e5e7eb] dark:border-[#2a3441] font-semibold text-[#000000] dark:text-gray-200">
            GPA ≥ {item.gpaRequired}
          </span>
          <span className="text-[11px] text-[#86909c] dark:text-gray-400 truncate">
            {item.applicationDeadline}
          </span>
        </div>

        {/* Price/Benefit line */}
        <div className="mt-1.5 pt-1.5 border-t border-[#e5e7eb] dark:border-[#2a3441] flex items-baseline justify-between text-sm">
          <div>
            <span className="font-extrabold text-[#000000] dark:text-black bg-[#ecffe0] dark:bg-[#00f0a0] px-1.5 py-0.5 rounded-sm">
              {item.coverageText.split("+")[0].trim()}
            </span>
            <span className="text-xs text-[#86909c] dark:text-gray-400 ml-1">
              (Gốc: {item.tuitionOriginal})
            </span>
          </div>
          <span className="text-xs font-bold text-[#000000] dark:text-[#00f0a0] group-hover:underline">
            Chi tiết &rarr;
          </span>
        </div>
      </div>
    </div>
  );
}
