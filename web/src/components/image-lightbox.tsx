"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, LoaderCircle, Save, Trash2 } from "lucide-react";
import { Modal } from "@/components/modal";
import type { GroupItem, ImageItem } from "@/lib/types";

export function ImageLightbox({
  image,
  groups,
  hasPrevious,
  hasNext,
  onClose,
  onNavigate,
  onUpdated,
  onDeleted,
}: {
  image: ImageItem | null;
  groups: GroupItem[];
  hasPrevious: boolean;
  hasNext: boolean;
  onClose: () => void;
  onNavigate: (direction: -1 | 1) => void;
  onUpdated: (image: ImageItem) => void;
  onDeleted: (id: string) => void;
}) {
  const [keywords, setKeywords] = useState("");
  const [groupId, setGroupId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset the form when navigating to another image.
    setKeywords(image?.keywords.join("，") ?? "");
    setGroupId(image?.group?.id ?? "");
    setError("");
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
    if (!window.confirm("确定永久删除这张图片吗？")) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/images/${image!.id}`, { method: "DELETE" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "删除失败");
      onDeleted(image!.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "删除失败");
      setLoading(false);
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
          <div className="text-[11px] font-black uppercase tracking-[.22em] text-[#d7ff45]">整理信息</div>
          <label className="mt-5 block text-xs font-bold text-white/55">
            关键字
            <textarea className="mt-2 min-h-32 w-full resize-y rounded-2xl border border-white/10 bg-black/25 p-3.5 text-sm font-normal" value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="用逗号或换行分隔" />
          </label>
          <label className="mt-5 block text-xs font-bold text-white/55">
            分组
            <select className="mt-2 w-full rounded-2xl border border-white/10 bg-[#111214] px-3.5 py-3 text-sm" value={groupId} onChange={(event) => setGroupId(event.target.value)}>
              <option value="">未分组</option>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </label>
          <div className="mt-4 min-h-8 text-xs text-[#ff8b73]" role="alert">{error}</div>
          <button type="button" onClick={save} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#d7ff45] px-4 py-3 font-black text-black disabled:opacity-50">
            {loading ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />} 保存整理
          </button>
          <a href={`${image.originalUrl}&download=1`} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-white/70 hover:bg-white/5 hover:text-white">
            <Download size={16} /> 下载原图
          </a>
          <button type="button" onClick={remove} disabled={loading} className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-500/10">
            <Trash2 size={16} /> 永久删除
          </button>
          <div className="mt-6 border-t border-white/8 pt-5 text-xs leading-6 text-white/35">
            收藏于 {new Date(image.createdAt).toLocaleString("zh-CN")}<br />{image.mimeType.replace("image/", "").toUpperCase()}
          </div>
        </aside>
      </div>
    </Modal>
  );
}
