"use client";

import React from "react";
import {
  X,
  Star,
  MapPin,
  ExternalLink,
  Mail,
  Heart,
  CheckCircle,
  Building2,
} from "lucide-react";
import { ScholarshipItem } from "@/data/scholarships";

interface ScholarshipDetailModalProps {
  item: ScholarshipItem | null;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
}

export default function ScholarshipDetailModal({
  item,
  onClose,
  isFavorite,
  onToggleFavorite,
}: ScholarshipDetailModalProps) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="bg-white dark:bg-[#161d26] rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.3)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-[#e5e7eb] dark:border-[#2a3441] overflow-hidden transition-colors">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb] dark:border-[#2a3441]">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 -ml-2 rounded-full hover:bg-[#f2f4f5] dark:hover:bg-[#1f2937] transition-colors text-[#000000] dark:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold uppercase tracking-wider text-[#86909c] dark:text-gray-400">
              Chi tiết học bổng & Đại học
            </span>
          </div>

          <button
            onClick={(e) => onToggleFavorite(item.id, e)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#e5e7eb] dark:border-[#2a3441] hover:border-[#000000] dark:hover:border-white hover:bg-[#f2f4f5] dark:hover:bg-[#1f2937] text-xs font-bold text-[#000000] dark:text-white cursor-pointer transition-all"
          >
            <Heart
              className={`w-4 h-4 ${
                isFavorite
                  ? "fill-[#00f0a0] stroke-black"
                  : "stroke-[#000000] dark:stroke-white"
              }`}
            />
            <span>{isFavorite ? "Đã lưu" : "Lưu học bổng"}</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6 space-y-6">
          
          {/* Main Title & Rating */}
          <div>
            <div className="flex flex-wrap items-baseline gap-2 mb-1">
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#000000] dark:text-white">
                {item.name}
              </h1>
              <span className="text-lg font-bold text-[#86909c] dark:text-gray-400">
                ({item.koreanName})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-[#86909c] dark:text-gray-400">
              <div className="flex items-center gap-1 text-[#000000] dark:text-white font-bold">
                <Star className="w-4 h-4 fill-[#000000] dark:fill-[#00f0a0] text-[#000000] dark:text-[#00f0a0]" />
                <span>{item.rating.toFixed(2)}</span>
                <span className="text-[#86909c] dark:text-gray-400 font-normal underline">
                  ({item.reviewsCount} đánh giá)
                </span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-[#86909c] dark:text-gray-400" />
                <span>{item.district}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1 font-bold text-[#000000] dark:text-[#00f0a0]">
                <Building2 className="w-4 h-4" />
                <span>{item.ranking}</span>
              </div>
            </div>
          </div>

          {/* Cover Hero Image */}
          <div className="relative aspect-16/9 w-full rounded-2xl overflow-hidden bg-[#f2f4f5] dark:bg-[#161d26] border border-[#e5e7eb] dark:border-[#2a3441] shadow-xs">
            <img
              src={item.coverImage}
              alt={item.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 flex gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-[#00f0a0] text-black shadow-md">
                Học bổng {item.coveragePercentage}%
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/85 text-white shadow-md">
                {item.type}
              </span>
            </div>
          </div>

          {/* Primary Scholarship Highlight Box */}
          <div className="p-5 rounded-2xl bg-[#ecffe0] dark:bg-[#00f0a0]/15 border border-[#00f0a0]/40 dark:border-[#00f0a0]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase font-black tracking-wider text-[#000000] dark:text-[#00f0a0] mb-1">
                Chính sách học bổng trọng điểm
              </div>
              <h3 className="text-lg font-black text-[#000000] dark:text-white">
                {item.scholarshipTitle}
              </h3>
              <p className="text-sm font-bold text-[#000000] dark:text-gray-200 mt-0.5">
                {item.coverageText}
              </p>
            </div>

            <div className="bg-white dark:bg-[#1a232e] px-4 py-3 rounded-xl border border-[#e5e7eb] dark:border-[#2a3441] shadow-2xs shrink-0 text-right">
              <div className="text-xs text-[#86909c] dark:text-gray-400 font-medium">Học phí sau học bổng</div>
              <div className="text-lg font-black text-[#000000] dark:text-white">
                {item.tuitionAfter}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 line-through">
                Gốc: {item.tuitionOriginal}
              </div>
            </div>
          </div>

          {/* Requirements Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="p-3.5 rounded-xl border border-[#e5e7eb] dark:border-[#2a3441] bg-white dark:bg-[#1a232e]">
              <div className="text-xs text-[#86909c] dark:text-gray-400 mb-1 font-medium">Yêu cầu TOPIK</div>
              <div className="font-extrabold text-[#000000] dark:text-white">
                {item.topikRequired === 0
                  ? "Không bắt buộc"
                  : `TOPIK ${item.topikRequired}+`}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-[#e5e7eb] dark:border-[#2a3441] bg-white dark:bg-[#1a232e]">
              <div className="text-xs text-[#86909c] dark:text-gray-400 mb-1 font-medium">Điểm GPA tối thiểu</div>
              <div className="font-extrabold text-[#000000] dark:text-white">
                {item.gpaRequired} / 4.0
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-[#e5e7eb] dark:border-[#2a3441] bg-white dark:bg-[#1a232e]">
              <div className="text-xs text-[#86909c] dark:text-gray-400 mb-1 font-medium">Hạn nộp hồ sơ</div>
              <div className="font-extrabold text-[#000000] dark:text-[#00f0a0]">
                {item.applicationDeadline}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-[#e5e7eb] dark:border-[#2a3441] bg-white dark:bg-[#1a232e]">
              <div className="text-xs text-[#86909c] dark:text-gray-400 mb-1 font-medium">Ký túc xá</div>
              <div className="font-extrabold text-[#000000] dark:text-white">
                {item.dormSupport ? "Hỗ trợ KTX" : "Tự túc"}
              </div>
            </div>
          </div>

          {/* Key Highlights */}
          <div>
            <h4 className="font-extrabold text-base text-[#000000] dark:text-white mb-3">
              Quyền lợi và điều kiện chi tiết
            </h4>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {item.highlights.map((hl, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-[#f2f4f5] dark:bg-[#1a232e] border border-[#e5e7eb] dark:border-[#2a3441] text-sm text-[#000000] dark:text-gray-200 font-medium"
                >
                  <CheckCircle className="w-4 h-4 text-[#000000] dark:text-[#00f0a0] shrink-0 mt-0.5" />
                  <span>{hl}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="font-extrabold text-base text-[#000000] dark:text-white mb-2">
              Giới thiệu về trường & cuộc sống sinh viên
            </h4>
            <p className="text-sm leading-relaxed text-[#333333] dark:text-gray-300">
              {item.description}
            </p>
          </div>

        </div>

        {/* Action Footer */}
        <div className="px-6 py-4 border-t border-[#e5e7eb] dark:border-[#2a3441] flex items-center justify-between bg-white dark:bg-[#161d26]">
          <div className="text-xs text-[#86909c] dark:text-gray-400">
            Kỳ tuyển sinh: <strong className="text-[#000000] dark:text-white">{item.term}</strong>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`mailto:${item.contactEmail}?subject=Đăng ký tư vấn học bổng ${encodeURIComponent(item.name)}`}
              className="px-4 py-2.5 rounded-xl border border-[#e5e7eb] dark:border-[#2a3441] hover:border-[#000000] dark:hover:border-white text-xs font-bold text-[#000000] dark:text-white flex items-center gap-1.5 transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span>Gửi Email tuyển sinh</span>
            </a>

            <a
              href={item.website}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-[#00f0a0] hover:bg-[#00d88f] text-black text-xs font-black flex items-center gap-1.5 transition-all shadow-xs"
            >
              <span>Trang chủ trường</span>
              <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
