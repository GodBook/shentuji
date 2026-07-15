"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArchiveRestore,
  Check,
  CheckSquare2,
  Download,
  Folder,
  FolderCog,
  Hash,
  ImageIcon,
  Images,
  LoaderCircle,
  LogOut,
  Plus,
  Search,
  Sparkles,
  Square,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { GroupManager } from "@/components/group-manager";
import { ImageLightbox } from "@/components/image-lightbox";
import { UploadDialog } from "@/components/upload-dialog";
import type { GroupItem, ImageItem, ImageListResult, ImportReport } from "@/lib/types";

type Notice = { message: string; kind: "success" | "error" } | null;

async function responseJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string };
  if (response.status === 401) {
    window.location.assign("/login");
    throw new Error("登录已过期");
  }
  if (!response.ok) throw new Error(body.error || "请求失败");
  return body;
}

function keywordValues(value: string) {
  return value.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean);
}

export function GalleryApp() {
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [total, setTotal] = useState(0);
  const [allCount, setAllCount] = useState(0);
  const [ungroupedCount, setUngroupedCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState("all");
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ name: string; count: number }>>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadSeed, setUploadSeed] = useState<File[]>([]);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [activeImage, setActiveImage] = useState<ImageItem | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [batchKeywords, setBatchKeywords] = useState("");
  const [batchGroup, setBatchGroup] = useState("");
  const [batchBusy, setBatchBusy] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const buildFilterUrl = useCallback(
    (base: string, cursor?: string | null) => {
      const params = new URLSearchParams();
      if (groupFilter !== "all") params.set("group", groupFilter);
      selectedKeywords.forEach((keyword) => params.append("keyword", keyword));
      if (cursor) params.set("cursor", cursor);
      const text = params.toString();
      return text ? `${base}?${text}` : base;
    },
    [groupFilter, selectedKeywords],
  );

  const loadGroups = useCallback(async () => {
    const result = await responseJson<{
      groups: GroupItem[];
      stats: { total: number; ungrouped: number };
    }>(await fetch("/api/groups"));
    setGroups(result.groups);
    setAllCount(result.stats.total);
    setUngroupedCount(result.stats.ungrouped);
  }, []);

  const fetchImages = useCallback(
    async (cursor: string | null, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const result = await responseJson<ImageListResult>(
          await fetch(buildFilterUrl("/api/images", cursor)),
        );
        setImages((current) => (append ? [...current, ...result.items] : result.items));
        setTotal(result.total);
        setNextCursor(result.nextCursor);
        if (groupFilter === "all" && selectedKeywords.length === 0) setAllCount(result.total);
        if (!append) setSelected(new Set());
      } catch (reason) {
        setNotice({
          kind: "error",
          message: reason instanceof Error ? reason.message : "加载图库失败",
        });
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildFilterUrl, groupFilter, selectedKeywords.length],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- State updates happen after the async request resolves.
    void loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- State updates happen after the async request resolves.
    void fetchImages(null, false);
  }, [fetchImages]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/keywords?q=${encodeURIComponent(query)}`);
        const result = await responseJson<{ keywords: Array<{ name: string; count: number }> }>(response);
        setSuggestions(result.keywords);
      } catch {
        setSuggestions([]);
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      if (uploadOpen) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const files = Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith("image/"));
      if (!files.length) return;
      event.preventDefault();
      setUploadSeed(files);
      setUploadOpen(true);
    };
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  }, [uploadOpen]);

  function addKeyword(value: string) {
    const name = value.normalize("NFKC").trim().replace(/\s+/g, " ");
    if (!name) return;
    setSelectedKeywords((current) =>
      current.some((item) => item.toLocaleLowerCase("en-US") === name.toLocaleLowerCase("en-US"))
        ? current
        : [...current, name],
    );
    setQuery("");
  }

  async function refresh(message?: string) {
    await Promise.all([loadGroups(), fetchImages(null, false)]);
    if (message) setNotice({ kind: "success", message });
  }

  async function selectAllFiltered() {
    try {
      const result = await responseJson<{ ids: string[] }>(
        await fetch(buildFilterUrl("/api/images/ids")),
      );
      setSelected(new Set(result.ids));
      setNotice({ kind: "success", message: `已选中当前结果中的 ${result.ids.length} 张图片` });
    } catch (reason) {
      setNotice({ kind: "error", message: reason instanceof Error ? reason.message : "全选失败" });
    }
  }

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runBulk(body: Record<string, unknown>, message: string) {
    setBatchBusy(true);
    try {
      await responseJson(await fetch("/api/images/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, ids: Array.from(selected) }),
      }));
      setBatchKeywords("");
      await refresh(message);
    } catch (reason) {
      setNotice({ kind: "error", message: reason instanceof Error ? reason.message : "批量操作失败" });
    } finally {
      setBatchBusy(false);
    }
  }

  async function exportArchive(ids?: string[]) {
    setBatchBusy(true);
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids?.length ? { ids } : {}),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || "导出失败");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `shentuji-backup-${new Date().toISOString().slice(0, 10)}.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice({ kind: "success", message: `备份已生成${ids ? ` · ${ids.length} 张` : " · 整个图库"}` });
    } catch (reason) {
      setNotice({ kind: "error", message: reason instanceof Error ? reason.message : "导出失败" });
    } finally {
      setBatchBusy(false);
    }
  }

  async function importArchive(file: File) {
    const form = new FormData();
    form.append("archive", file);
    setBatchBusy(true);
    try {
      const report = await responseJson<ImportReport>(await fetch("/api/import", { method: "POST", body: form }));
      await refresh(`已导入 ${report.imported} 张图片${report.skipped ? `，跳过 ${report.skipped} 张` : ""}`);
    } catch (reason) {
      setNotice({ kind: "error", message: reason instanceof Error ? reason.message : "导入失败" });
    } finally {
      setBatchBusy(false);
      if (importRef.current) importRef.current.value = "";
    }
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.assign("/login");
  }

  const activeIndex = activeImage ? images.findIndex((image) => image.id === activeImage.id) : -1;
  const currentGroup = groups.find((group) => group.id === groupFilter);
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="border-b border-white/8 bg-[#101113]/85 px-4 py-4 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
        <div className="flex items-center justify-between lg:block">
          <div className="flex items-center gap-3 px-2">
            <span className="grid h-10 w-10 -rotate-6 place-items-center rounded-2xl bg-[#d7ff45] text-black"><ImageIcon size={20} strokeWidth={2.5} /></span>
            <div><div className="font-black tracking-tight">神图集</div><div className="text-[9px] uppercase tracking-[.28em] text-white/30">Divine Gallery</div></div>
          </div>
          <button onClick={() => { setUploadSeed([]); setUploadOpen(true); }} className="flex items-center gap-2 rounded-2xl bg-[#d7ff45] px-4 py-2.5 text-sm font-black text-black lg:mt-7 lg:w-full lg:justify-center lg:py-3" type="button"><Plus size={17} /> 收神图</button>
        </div>

        <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:mt-7 lg:block lg:space-y-1" aria-label="图库分组">
          <button type="button" onClick={() => setGroupFilter("all")} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition lg:w-full ${groupFilter === "all" ? "bg-white/9 font-bold text-white" : "text-white/48 hover:bg-white/5 hover:text-white"}`}><Images size={16} /><span className="lg:flex-1 lg:text-left">全部神图</span><span className="text-xs opacity-45">{allCount}</span></button>
          <button type="button" onClick={() => setGroupFilter("ungrouped")} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition lg:w-full ${groupFilter === "ungrouped" ? "bg-white/9 font-bold text-white" : "text-white/48 hover:bg-white/5 hover:text-white"}`}><Folder size={16} /><span className="lg:flex-1 lg:text-left">未分组</span><span className="text-xs opacity-45">{ungroupedCount}</span></button>
          {groups.map((group) => (
            <button key={group.id} type="button" onClick={() => setGroupFilter(group.id)} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition lg:w-full ${groupFilter === group.id ? "bg-white/9 font-bold text-white" : "text-white/48 hover:bg-white/5 hover:text-white"}`}><Folder size={16} /><span className="max-w-28 truncate lg:flex-1 lg:text-left">{group.name}</span><span className="text-xs opacity-45">{group.count}</span></button>
          ))}
        </nav>

        <div className="mt-5 hidden border-t border-white/8 pt-5 lg:block">
          <button type="button" onClick={() => setGroupsOpen(true)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/45 hover:bg-white/5 hover:text-white"><FolderCog size={16} />管理分组</button>
          <button type="button" onClick={() => importRef.current?.click()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/45 hover:bg-white/5 hover:text-white"><ArchiveRestore size={16} />导入备份</button>
          <button type="button" onClick={() => void exportArchive()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/45 hover:bg-white/5 hover:text-white"><Download size={16} />导出整库</button>
        </div>
        <button type="button" onClick={() => void logout()} className="mt-auto hidden w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/35 hover:bg-white/5 hover:text-white lg:absolute lg:bottom-5 lg:left-4 lg:flex lg:w-[calc(100%-2rem)]"><LogOut size={16} />退出登录</button>
      </aside>

      <main id="main-content" className="min-w-0 px-3 pb-32 pt-5 sm:px-5 lg:px-8 lg:pt-7 xl:px-10">
        <header className="relative z-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.24em] text-[#d7ff45]"><Sparkles size={12} /> Your divine collection</div>
              <h1 className="text-3xl font-black tracking-[-.045em] sm:text-4xl">{currentGroup?.name ?? (groupFilter === "ungrouped" ? "未分组" : "全部神图")}</h1>
              <p className="mt-2 text-sm text-white/38">{total} 张值得反复看的图</p>
            </div>
            <div className="flex items-center gap-2 lg:hidden">
              <button type="button" onClick={() => setGroupsOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-white/55" aria-label="管理分组"><FolderCog size={17} /></button>
              <button type="button" onClick={() => importRef.current?.click()} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-white/55" aria-label="导入备份"><ArchiveRestore size={17} /></button>
              <button type="button" onClick={() => void exportArchive()} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-white/55" aria-label="导出整库"><Download size={17} /></button>
            </div>
          </div>

          <div className="glass mt-6 rounded-2xl p-2 sm:flex sm:items-center sm:gap-2">
            <div className="relative min-w-0 flex-1">
              <div className="flex min-h-11 flex-wrap items-center gap-1.5 pl-3 pr-2">
                <Search size={18} className="mr-1 shrink-0 text-white/30" />
                {selectedKeywords.map((keyword) => (
                  <button key={keyword} type="button" onClick={() => setSelectedKeywords((items) => items.filter((item) => item !== keyword))} className="flex items-center gap-1 rounded-lg bg-[#d7ff45]/12 px-2 py-1 text-xs font-bold text-[#e2ff7b]">#{keyword}<X size={12} /></button>
                ))}
                <input className="min-w-28 flex-1 bg-transparent py-2 text-sm placeholder:text-white/25 focus:outline-none" aria-label="搜索关键字" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addKeyword(query); } if (event.key === "Backspace" && !query) setSelectedKeywords((items) => items.slice(0, -1)); }} placeholder={selectedKeywords.length ? "继续添加关键字…" : "输入关键字，按回车筛选…"} />
              </div>
              {query && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+.65rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#1c1d20]/95 p-1.5 shadow-2xl backdrop-blur-xl">
                  {suggestions.map((suggestion) => <button key={suggestion.name} type="button" onClick={() => addKeyword(suggestion.name)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-white/7"><Hash size={14} className="text-[#d7ff45]" /><span className="flex-1 font-bold">{suggestion.name}</span><span className="text-xs text-white/35">{suggestion.count}</span></button>)}
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-white/8 px-1 pt-2 sm:mt-0 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
              <button type="button" onClick={() => void selectAllFiltered()} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-white/50 hover:bg-white/5 hover:text-white"><CheckSquare2 size={15} />全选结果</button>
              {selectedKeywords.length > 0 && <button type="button" onClick={() => setSelectedKeywords([])} className="rounded-xl px-3 py-2 text-xs text-white/35 hover:text-white">清除筛选</button>}
            </div>
          </div>
        </header>

        {loading ? (
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => <div key={item} className="animate-pulse rounded-2xl bg-white/5" style={{ height: 160 + (item % 3) * 60 }} />)}
          </div>
        ) : images.length ? (
          <>
            <section className="masonry mt-7" aria-label="图片列表">
              {images.map((image, index) => {
                const checked = selected.has(image.id);
                return (
                  <article key={image.id} className={`masonry-card float-in group relative overflow-hidden rounded-2xl border bg-[#151619] transition ${checked ? "border-[#d7ff45] shadow-[0_0_0_2px_rgba(215,255,69,.18)]" : "border-white/8 hover:-translate-y-0.5 hover:border-white/20"}`} style={{ animationDelay: `${Math.min(index, 12) * 24}ms` }}>
                    <button type="button" onClick={() => toggleSelected(image.id)} className={`absolute left-2.5 top-2.5 z-10 grid h-8 w-8 place-items-center rounded-full border backdrop-blur transition ${checked ? "border-[#d7ff45] bg-[#d7ff45] text-black" : "border-white/20 bg-black/45 text-white/70 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"}`} aria-label={`${checked ? "取消选择" : "选择"}${image.originalName}`} aria-pressed={checked}>{checked ? <Check size={16} strokeWidth={3} /> : <Square size={15} />}</button>
                    <button type="button" onClick={() => setActiveImage(image)} className="block w-full text-left" aria-label={`查看 ${image.originalName}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.thumbnailUrl} alt={[image.originalName, ...image.keywords].join("，")} width={image.width} height={image.height} loading="lazy" className="h-auto w-full bg-white/[0.025] object-cover transition duration-500 group-hover:scale-[1.018]" />
                    </button>
                    {(image.keywords.length > 0 || image.group) && (
                      <div className="absolute inset-x-0 bottom-0 pointer-events-none bg-gradient-to-t from-black/90 via-black/45 to-transparent px-3 pb-3 pt-12 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                        {image.group && <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold text-white/65"><Folder size={11} />{image.group.name}</div>}
                        <div className="flex flex-wrap gap-1">{image.keywords.slice(0, 5).map((keyword) => <span key={keyword} className="rounded-md bg-white/12 px-1.5 py-0.5 text-[10px] font-bold text-white/80">#{keyword}</span>)}</div>
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
            {nextCursor && <div className="mt-8 flex justify-center"><button type="button" onClick={() => void fetchImages(nextCursor, true)} disabled={loadingMore} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.025] px-6 py-3 text-sm font-bold text-white/55 hover:bg-white/5 hover:text-white disabled:opacity-50">{loadingMore && <LoaderCircle className="animate-spin" size={16} />}再来一页</button></div>}
          </>
        ) : (
          <section className="mt-8 grid min-h-[52vh] place-items-center rounded-[2rem] border border-dashed border-white/10 bg-white/[0.018] p-8 text-center">
            <div><span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-white/5 text-white/25"><ImageIcon size={28} /></span><h2 className="mt-5 text-xl font-black">这里还空空如也</h2><p className="mt-2 text-sm text-white/38">{selectedKeywords.length || groupFilter !== "all" ? "换个关键字或分组看看" : "从你今天看到的第一张神图开始"}</p>{!selectedKeywords.length && groupFilter === "all" && <button type="button" onClick={() => setUploadOpen(true)} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#d7ff45] px-5 py-3 text-sm font-black text-black"><Upload size={16} />添加图片</button>}</div>
          </section>
        )}
      </main>

      <input ref={importRef} type="file" accept=".zip,application/zip" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importArchive(file); }} />

      {selected.size > 0 && (
        <div className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-5xl rounded-[1.4rem] border border-white/12 bg-[#202125]/95 p-2.5 shadow-2xl backdrop-blur-xl sm:bottom-5 sm:flex sm:items-center sm:gap-2">
          <div className="flex shrink-0 items-center justify-between px-2 py-1 sm:justify-start sm:gap-2"><span className="grid h-7 min-w-7 place-items-center rounded-lg bg-[#d7ff45] px-1.5 text-xs font-black text-black">{selected.size}</span><span className="text-xs font-bold text-white/65">已选择</span><button type="button" onClick={() => setSelected(new Set())} className="ml-2 text-white/35 hover:text-white" aria-label="清除选择"><X size={15} /></button></div>
          <div className="mt-2 flex min-w-0 flex-1 flex-wrap gap-2 sm:mt-0">
            <input aria-label="批量关键字" className="min-w-32 flex-1 rounded-xl border border-white/8 bg-black/25 px-3 py-2 text-xs" value={batchKeywords} onChange={(event) => setBatchKeywords(event.target.value)} placeholder="批量关键字，逗号分隔" />
            <button type="button" disabled={batchBusy || !keywordValues(batchKeywords).length} onClick={() => void runBulk({ action: "addKeywords", keywords: keywordValues(batchKeywords) }, "关键字已批量添加")} className="rounded-xl bg-white/8 px-3 py-2 text-xs font-bold hover:bg-white/12 disabled:opacity-35">+ 关键词</button>
            <button type="button" disabled={batchBusy || !keywordValues(batchKeywords).length} onClick={() => void runBulk({ action: "removeKeywords", keywords: keywordValues(batchKeywords) }, "关键字已批量移除")} className="rounded-xl bg-white/8 px-3 py-2 text-xs font-bold hover:bg-white/12 disabled:opacity-35">− 关键词</button>
            <select aria-label="批量移动到分组" className="min-w-28 rounded-xl border border-white/8 bg-[#17181b] px-3 py-2 text-xs" value={batchGroup} onChange={(event) => setBatchGroup(event.target.value)}><option value="">未分组</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
            <button type="button" disabled={batchBusy} onClick={() => void runBulk({ action: "moveGroup", groupId: batchGroup || null }, "图片已移动")} className="rounded-xl bg-white/8 px-3 py-2 text-xs font-bold hover:bg-white/12 disabled:opacity-35">移动</button>
            <button type="button" disabled={batchBusy} onClick={() => void exportArchive(Array.from(selected))} className="grid h-9 w-9 place-items-center rounded-xl bg-white/8 hover:bg-white/12" aria-label="导出所选"><Download size={15} /></button>
            <button type="button" disabled={batchBusy} onClick={() => { if (window.confirm(`永久删除选中的 ${selected.size} 张图片？`)) void runBulk({ action: "delete" }, "所选图片已删除"); }} className="grid h-9 w-9 place-items-center rounded-xl text-red-300 hover:bg-red-500/12" aria-label="删除所选"><Trash2 size={15} /></button>
          </div>
          {batchBusy && <LoaderCircle className="mx-2 hidden shrink-0 animate-spin text-[#d7ff45] sm:block" size={17} />}
        </div>
      )}

      {notice && <div className={`fixed right-4 top-4 z-[80] max-w-sm rounded-2xl border px-4 py-3 text-sm font-bold shadow-2xl backdrop-blur-xl ${notice.kind === "success" ? "border-[#d7ff45]/25 bg-[#1e2415]/95 text-[#e5ff8d]" : "border-red-400/25 bg-[#2a1717]/95 text-red-200"}`} role="status">{notice.message}</div>}

      <UploadDialog open={uploadOpen} onClose={() => { setUploadOpen(false); setUploadSeed([]); }} groups={groups} seedFiles={uploadSeed} onComplete={(message) => void refresh(message)} />
      <GroupManager open={groupsOpen} onClose={() => setGroupsOpen(false)} groups={groups} onChanged={async (message) => refresh(message)} />
      <ImageLightbox image={activeImage} groups={groups} hasPrevious={activeIndex > 0} hasNext={activeIndex >= 0 && activeIndex < images.length - 1} onClose={() => setActiveImage(null)} onNavigate={(direction) => { const next = images[activeIndex + direction]; if (next) setActiveImage(next); }} onUpdated={(updated) => { setImages((items) => items.map((item) => item.id === updated.id ? updated : item)); setActiveImage(updated); setNotice({ kind: "success", message: "图片信息已保存" }); void loadGroups(); }} onDeleted={() => { setActiveImage(null); void refresh("图片已删除"); }} />
    </div>
  );
}
