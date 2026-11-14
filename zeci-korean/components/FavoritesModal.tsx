"use client";

import React from "react";
import { X, Trash2, MapPin } from "lucide-react";
import { ScholarshipItem } from "@/data/scholarships";

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: ScholarshipItem[];
  onRemoveFavorite: (id: string) => void;
  onSelectScholarship: (item: ScholarshipItem) => void;
}

export default function FavoritesModal({
  isOpen,
  onClose,
  favorites,
  onRemoveFavorite,
  onSelectScholarship,
}: FavoritesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="bg-white dark:bg-[#161d26] rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.3)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-[#e5e7eb] dark:border-[#2a3441] overflow-hidden transition-colors">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb] dark:border-[#2a3441] relative">
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-full hover:bg-[#f2f4f5] dark:hover:bg-[#1f2937] transition-colors text-[#000000] dark:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-base font-extrabold text-[#000000] dark:text-white absolute left-1/2 -translate-x-1/2">
            Danh sách học bổng đã lưu ({favorites.length})
          </h2>
          <div className="w-9" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {favorites.length === 0 ? (
            <div className="text-center py-12 text-[#86909c] dark:text-gray-400">
              <div className="text-4xl mb-3">🔖</div>
              <h3 className="font-extrabold text-base text-[#000000] dark:text-white mb-1">
                Chưa có học bổng nào được lưu
              </h3>
              <p className="text-xs">
                Nhấp vào biểu tượng trái tim trên các trường đại học bạn quan tâm để lưu và so sánh sau.
              </p>
            </div>
          ) : (
            favorites.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 rounded-2xl border border-[#e5e7eb] dark:border-[#2a3441] hover:border-[#000000] dark:hover:border-[#00f0a0] hover:shadow-xs transition-all gap-4 bg-white dark:bg-[#1a232e]"
              >
                <div
                  onClick={() => {
                    onSelectScholarship(item);
                    onClose();
                  }}
                  className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer"
                >
                  <img
                    src={item.coverImage}
                    alt={item.name}
                    className="w-16 h-16 rounded-xl object-cover shrink-0 border border-[#e5e7eb] dark:border-[#2a3441]"
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-[#000000] dark:text-white truncate hover:underline">
                      {item.name}
                    </h4>
                    <div className="flex items-center gap-1.5 text-xs text-[#86909c] dark:text-gray-400 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      <span>{item.city}</span>
                      <span>•</span>
                      <span className="font-extrabold text-[#000000] dark:text-[#00f0a0] bg-[#ecffe0] dark:bg-[#00f0a0]/15 px-1.5 py-0.2 rounded">
                        {item.coveragePercentage}% Học phí
                      </span>
                    </div>
                    <div className="text-xs text-[#86909c] dark:text-gray-400 truncate mt-0.5">
                      {item.scholarshipTitle}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onRemoveFavorite(item.id)}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white hover:bg-[#f2f4f5] dark:hover:bg-[#2a3441] rounded-lg transition-colors shrink-0 cursor-pointer"
                  title="Xóa khỏi danh sách lưu"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e5e7eb] dark:border-[#2a3441] flex justify-end bg-white dark:bg-[#161d26]">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#000000] dark:bg-white hover:bg-[#1f2937] dark:hover:bg-gray-200 text-white dark:text-black text-xs font-bold cursor-pointer transition-colors"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
}
