"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { FileImage, LoaderCircle, Plus, UploadCloud, X } from "lucide-react";
import { Modal } from "@/components/modal";
import type { GroupItem } from "@/lib/types";

const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function Preview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => {
    return () => URL.revokeObjectURL(url);
  }, [url]);
  return (
    <li className="group relative overflow-hidden rounded-2xl border border-white/8 bg-black/25">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="aspect-square w-full object-cover" src={url} alt={file.name} />
      ) : (
        <div className="grid aspect-square place-items-center"><FileImage /></div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/75 text-white"
        aria-label={`移除 ${file.name}`}
      >
        <X size={14} />
      </button>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-2.5 pb-2 pt-8">
        <div className="truncate text-[11px] font-medium">{file.name}</div>
        <div className="text-[10px] text-white/45">{(file.size / 1024 / 1024).toFixed(1)} MB</div>
      </div>
    </li>
  );
}

export function UploadDialog({
  open,
  onClose,
  groups,
  seedFiles,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  groups: GroupItem[];
  seedFiles: File[];
  onComplete: (message: string) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [keywords, setKeywords] = useState("");
  const [groupId, setGroupId] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(incoming: File[]) {
    const valid = incoming.filter((file) => ACCEPT.includes(file.type));
    setFiles((current) => [...current, ...valid].slice(0, 200));
    if (valid.length !== incoming.length) setError("已忽略不支持的文件格式");
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Consume files supplied by paste/drop when the dialog opens.
    if (open && seedFiles.length) addFiles(seedFiles);
  }, [open, seedFiles]);

  useEffect(() => {
    if (!open) return;
    const paste = (event: ClipboardEvent) => {
      const pasted = Array.from(event.clipboardData?.files ?? []);
      if (pasted.length) {
        event.preventDefault();
        addFiles(pasted);
      }
    };
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  }, [open]);

  async function upload() {
    if (!files.length) {
      setError("请先添加图片");
      return;
    }
    setLoading(true);
    setError("");
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    form.append(
      "keywords",
      JSON.stringify(
        keywords
          .split(/[,，\n]/)
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    );
    form.append("groupId", groupId);
    try {
      const response = await fetch("/api/images", { method: "POST", body: form });
      const body = (await response.json()) as {
        created?: unknown[];
        errors?: Array<{ file: string; reason: string }>;
        error?: string;
      };
      if (!response.ok && !body.created?.length) throw new Error(body.error || body.errors?.[0]?.reason || "上传失败");
      const count = body.created?.length ?? 0;
      const failed = body.errors?.length ?? 0;
      setFiles([]);
      setKeywords("");
      setGroupId("");
      onClose();
      onComplete(`已收藏 ${count} 张图片${failed ? `，${failed} 张失败` : ""}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "上传失败");
    } finally {
      setLoading(false);
    }
  }

  function drop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <Modal open={open} onClose={onClose} title="收一批神图" description="选择、拖拽或直接粘贴图片" wide>
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.4fr_.8fr]">
        <section>
          <button
            type="button"
            className={`grid min-h-52 w-full place-items-center rounded-3xl border border-dashed p-6 text-center transition ${dragging ? "border-[#d7ff45] bg-[#d7ff45]/8" : "border-white/15 bg-black/20 hover:border-white/30"}`}
            onClick={() => inputRef.current?.click()}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={drop}
          >
            <div>
              <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#d7ff45] text-black">
                <UploadCloud size={26} />
              </span>
              <div className="font-black">把图片扔到这里</div>
              <div className="mt-2 text-xs leading-5 text-white/40">JPEG / PNG / WebP / GIF · 单张不超过 50MB<br />也可以在此窗口按 Ctrl + V</div>
            </div>
          </button>
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept={ACCEPT.join(",")}
            multiple
            onChange={(event) => addFiles(Array.from(event.target.files ?? []))}
          />
          {files.length > 0 && (
            <>
              <div className="mb-3 mt-5 flex items-center justify-between text-sm">
                <span className="font-bold">待上传 · {files.length}</span>
                <button className="text-xs text-white/45 hover:text-white" type="button" onClick={() => setFiles([])}>清空</button>
              </div>
              <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
                {files.map((file, index) => (
                  <Preview key={`${file.name}-${file.size}-${file.lastModified}-${index}`} file={file} onRemove={() => setFiles((items) => items.filter((_, itemIndex) => itemIndex !== index))} />
                ))}
                <li>
                  <button type="button" onClick={() => inputRef.current?.click()} className="grid aspect-square w-full place-items-center rounded-2xl border border-dashed border-white/12 text-white/35 hover:border-white/30 hover:text-white">
                    <Plus size={22} /><span className="sr-only">继续添加</span>
                  </button>
                </li>
              </ul>
            </>
          )}
        </section>
        <aside className="rounded-3xl border border-white/8 bg-white/[0.025] p-5">
          <h3 className="text-sm font-black">为这一批统一整理</h3>
          <label className="mt-5 block text-xs font-bold text-white/55">
            关键字
            <textarea
              className="mt-2 min-h-28 w-full resize-y rounded-2xl border border-white/10 bg-black/25 p-3.5 text-sm font-normal text-white placeholder:text-white/20"
              value={keywords}
              onChange={(event) => setKeywords(event.target.value)}
              placeholder="沙雕，猫猫，聊天表情…\n用逗号或换行分隔"
            />
          </label>
          <label className="mt-5 block text-xs font-bold text-white/55">
            分组
            <select className="mt-2 w-full rounded-2xl border border-white/10 bg-[#121315] px-3.5 py-3 text-sm text-white" value={groupId} onChange={(event) => setGroupId(event.target.value)}>
              <option value="">未分组</option>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </label>
          <div className="mt-5 min-h-10 text-xs leading-5 text-[#ff8b73]" role="alert">{error}</div>
          <button type="button" onClick={upload} disabled={loading || !files.length} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#d7ff45] px-4 py-3.5 font-black text-black transition hover:bg-[#e5ff82] disabled:opacity-40">
            {loading && <LoaderCircle className="animate-spin" size={17} />}
            收藏 {files.length || ""} 张图片
          </button>
        </aside>
      </div>
    </Modal>
  );
}
