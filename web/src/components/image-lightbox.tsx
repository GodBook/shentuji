"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Heart, LoaderCircle, RotateCcw, Save, ScanSearch, Star, Trash2 } from "lucide-react";
import { Modal } from "@/components/modal";
import type { GroupItem, ImageItem, SimilarImageMatch } from "@/lib/types";

export function ImageLightbox({
  image,
  groups,
  hasPrevious,
  hasNext,
  onClose,
  onNavigate,
  onUpdated,
  onDeleted,
  trashMode = false,
  onRestored,
  onPermanentDeleted,
  onOpenImage,
}: {
  image: ImageItem | null;
  groups: GroupItem[];
  hasPrevious: boolean;
  hasNext: boolean;
  onClose: () => void;
  onNavigate: (direction: -1 | 1) => void;
  onUpdated: (image: ImageItem) => void;
  onDeleted: (id: string) => void;
  trashMode?: boolean;
  onRestored: (image: ImageItem) => void;
  onPermanentDeleted: (id: string) => void;
  onOpenImage: (image: ImageItem) => void;
}) {
  const [keywords, setKeywords] = useState("");
  const [groupId, setGroupId] = useState("");
  const [favorite, setFavorite] = useState(false);
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarMatches, setSimilarMatches] = useState<SimilarImageMatch[] | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset the form when navigating to another image.
    setKeywords(image?.keywords.join("，") ?? "");
    setGroupId(image?.group?.id ?? "");
    setFavorite(image?.favorite ?? false);
    setRating(image?.rating ?? 0);
    setError("");
    setSimilarMatches(null);
  }, [image]);

  useEffect(() => {
    if (!image) return;
    const keyboard = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "ArrowLeft" && hasPrevious) onNavigate(-1);
      if (event.key === "ArrowRight" && hasNext) onNavigate(1);
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [hasNext, hasPrevious, image, onNavigate]);

  if (!image) return <Modal open={false} onClose={onClose} title="图片详情"><span /></Modal>;

  async function save() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/images/${image!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: keywords.split(/[,，\n]/).map((value) => value.trim()).filter(Boolean),
          groupId: groupId || null,
          favorite,
          rating,
        }),
      });
      const result = (await response.json()) as { image?: ImageItem; error?: string };
      if (!response.ok || !result.image) throw new Error(result.error || "保存失败");
      onUpdated(result.image);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    const permanent = trashMode;
    if (!window.confirm(permanent ? "永久删除后无法恢复，确定继续吗？" : "将这张图片移入回收站？")) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/images/${image!.id}${permanent ? "?permanent=1" : ""}`, { method: "DELETE" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "删除失败");
      if (permanent) onPermanentDeleted(image!.id);
      else onDeleted(image!.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "删除失败");
      setLoading(false);
    }
  }

  async function restore() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/images/${image!.id}/restore`, { method: "POST" });
      const result = (await response.json()) as { image?: ImageItem; error?: string };
      if (!response.ok || !result.image) throw new Error(result.error || "恢复失败");
      onRestored(result.image);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "恢复失败");
    } finally {
      setLoading(false);
    }
  }

  async function detectSimilar() {
    setSimilarLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/images/${image!.id}/similar`);
      const result = (await response.json()) as { matches?: SimilarImageMatch[]; error?: string };
      if (!response.ok || !result.matches) throw new Error(result.error || "相似检测失败");
      setSimilarMatches(result.matches);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "相似检测失败");
    } finally {
      setSimilarLoading(false);
    }
  }

  return (
    <Modal open={Boolean(image)} onClose={onClose} title={image.originalName} description={`${image.width} × ${image.height} · ${(image.byteSize / 1024 / 1024).toFixed(2)} MB`} wide>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_310px]">
        <section className="relative grid min-h-[45vh] place-items-center overflow-hidden bg-[radial-gradient(circle_at_center,rgba(255,255,255,.07),transparent_65%)] p-4 sm:min-h-[64vh] sm:p-8">
          <button type="button" disabled={!hasPrevious} onClick={() => onNavigate(-1)} className="absolute left-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white backdrop-blur disabled:opacity-0" aria-label="上一张"><ChevronLeft /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.originalUrl} alt={[image.originalName, ...image.keywords].join("，")} className="max-h-[70vh] max-w-full object-contain drop-shadow-2xl" />
          <button type="button" disabled={!hasNext} onClick={() => onNavigate(1)} className="absolute right-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white backdrop-blur disabled:opacity-0" aria-label="下一张"><ChevronRight /></button>
        </section>
        <aside className="border-t border-white/8 p-5 lg:border-l lg:border-t-0 lg:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] font-black uppercase tracking-[.22em] text-[#d7ff45]">{trashMode ? "回收站信息" : "整理信息"}</div>
            {!trashMode && (
              <button type="button" aria-pressed={favorite} onClick={() => setFavorite((value) => !value)} className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold ${favorite ? "bg-rose-400/15 text-rose-300" : "bg-white/5 text-white/45 hover:text-white"}`}>
                <Heart size={14} fill={favorite ? "currentColor" : "none"} />{favorite ? "已收藏" : "收藏"}
              </button>
            )}
          </div>
          {!trashMode && (
            <fieldset className="mt-5">
              <legend className="text-xs font-bold text-white/55">评分</legend>
              <div className="mt-2 flex items-center gap-1" role="radiogroup" aria-label="图片评分">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" role="radio" aria-checked={rating === star} aria-label={`${star} 星`} onClick={() => setRating((value) => value === star ? 0 : star)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/7 focus-visible:outline-2 focus-visible:outline-[#d7ff45]">
                    <Star size={19} className={star <= rating ? "text-amber-300" : "text-white/18"} fill={star <= rating ? "currentColor" : "none"} />
                  </button>
                ))}
                {rating > 0 && <span className="ml-1 text-xs text-white/35">{rating}/5</span>}
              </div>
            </fieldset>
          )}
          <label className="mt-5 block text-xs font-bold text-white/55">
            关键字
            <textarea disabled={trashMode} className="mt-2 min-h-32 w-full resize-y rounded-2xl border border-white/10 bg-black/25 p-3.5 text-sm font-normal disabled:opacity-55" value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="用逗号或换行分隔" />
          </label>
          <label className="mt-5 block text-xs font-bold text-white/55">
            分组
            <select disabled={trashMode} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#111214] px-3.5 py-3 text-sm disabled:opacity-55" value={groupId} onChange={(event) => setGroupId(event.target.value)}>
              <option value="">未分组</option>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </label>
          <div className="mt-4 min-h-8 text-xs text-[#ff8b73]" role="alert">{error}</div>
          {trashMode ? (
            <button type="button" onClick={restore} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#d7ff45] px-4 py-3 font-black text-black disabled:opacity-50">
              {loading ? <LoaderCircle className="animate-spin" size={17} /> : <RotateCcw size={17} />} 恢复到图库
            </button>
          ) : (
            <button type="button" onClick={save} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#d7ff45] px-4 py-3 font-black text-black disabled:opacity-50">
              {loading ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />} 保存整理
            </button>
          )}
          <a href={`${image.originalUrl}&download=1`} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-white/70 hover:bg-white/5 hover:text-white">
            <Download size={16} /> 下载原图
          </a>
          {!trashMode && (
            <div className="mt-6 border-t border-white/8 pt-5">
              <button type="button" onClick={detectSimilar} disabled={similarLoading} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-white/70 hover:bg-white/5 disabled:opacity-50">
                {similarLoading ? <LoaderCircle className="animate-spin" size={16} /> : <ScanSearch size={16} />} 检测相似图片
              </button>
              {similarMatches && (
                <div className="mt-3" aria-live="polite">
                  <div className="mb-2 text-xs text-white/40">{similarMatches.length ? `发现 ${similarMatches.length} 张相似图片` : "未发现相似图片"}</div>
                  <div className="grid grid-cols-3 gap-2">
                    {similarMatches.slice(0, 6).map((match) => (
                      <button key={match.image.id} type="button" onClick={() => onOpenImage(match.image)} className="overflow-hidden rounded-xl border border-white/8 text-left hover:border-[#d7ff45]/55" aria-label={`查看相似图片 ${match.image.originalName}，相似度 ${match.similarity}%`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={match.image.thumbnailUrl} alt="" className="aspect-square w-full object-cover" />
                        <span className="block truncate px-1.5 py-1 text-[10px] text-white/55">{match.similarity}%</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <button type="button" onClick={remove} disabled={loading} className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-500/10">
            <Trash2 size={16} /> {trashMode ? "永久删除" : "移入回收站"}
          </button>
          <div className="mt-6 border-t border-white/8 pt-5 text-xs leading-6 text-white/35">
            收藏于 {new Date(image.createdAt).toLocaleString("zh-CN")}<br />
            {image.deletedAt && <>删除于 {new Date(image.deletedAt).toLocaleString("zh-CN")}<br /></>}
            {image.mimeType.replace("image/", "").toUpperCase()}
          </div>
        </aside>
      </div>
    </Modal>
  );
}
