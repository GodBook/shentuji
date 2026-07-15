"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/modal";
import type { GroupItem } from "@/lib/types";

export function GroupManager({
  open,
  onClose,
  groups,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  groups: GroupItem[];
  onChanged: (message: string) => Promise<void>;
}) {
  const [newName, setNewName] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Refresh editable drafts when server groups change.
    setDrafts(Object.fromEntries(groups.map((group) => [group.id, group.name])));
  }, [groups]);

  async function request(url: string, method: string, body?: unknown) {
    setError("");
    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(result.error || "操作失败");
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!newName.trim()) return;
    setBusy("new");
    try {
      await request("/api/groups", "POST", { name: newName });
      setNewName("");
      await onChanged("分组已创建");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "创建失败");
    } finally {
      setBusy("");
    }
  }

  async function rename(group: GroupItem) {
    const name = drafts[group.id]?.trim();
    if (!name || name === group.name) return;
    setBusy(group.id);
    try {
      await request(`/api/groups/${group.id}`, "PATCH", { name });
      await onChanged("分组已重命名");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "重命名失败");
    } finally {
      setBusy("");
    }
  }

  async function remove(group: GroupItem) {
    if (!window.confirm(`删除分组“${group.name}”？其中图片会回到“未分组”。`)) return;
    setBusy(group.id);
    try {
      await request(`/api/groups/${group.id}`, "DELETE");
      await onChanged("分组已删除，图片已移到未分组");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "删除失败");
    } finally {
      setBusy("");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="管理分组" description="一张图片只能属于一个分组">
      <div className="p-5 sm:p-6">
        <form className="flex gap-2" onSubmit={create}>
          <label className="sr-only" htmlFor="new-group">新分组名称</label>
          <input id="new-group" className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm" value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={40} placeholder="例如：聊天表情" />
          <button className="flex items-center gap-2 rounded-2xl bg-[#d7ff45] px-4 py-3 text-sm font-black text-black disabled:opacity-40" disabled={!newName.trim() || busy === "new"}>
            {busy === "new" ? <LoaderCircle className="animate-spin" size={16} /> : <Plus size={16} />} 新建
          </button>
        </form>
        <div className="mt-5 min-h-5 text-xs text-[#ff8b73]" role="alert">{error}</div>
        <ul className="mt-2 space-y-2">
          {groups.map((group) => (
            <li key={group.id} className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.025] p-2">
              <input aria-label={`${group.name} 的名称`} className="min-w-0 flex-1 rounded-xl bg-transparent px-2 py-2 text-sm font-bold" value={drafts[group.id] ?? group.name} maxLength={40} onChange={(event) => setDrafts((current) => ({ ...current, [group.id]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void rename(group); } }} />
              <span className="shrink-0 text-xs text-white/35">{group.count} 张</span>
              <button className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-white/55 hover:bg-white/10 hover:text-white disabled:opacity-40" type="button" disabled={busy === group.id || drafts[group.id]?.trim() === group.name} onClick={() => void rename(group)} aria-label={`保存 ${group.name}`}>
                {busy === group.id ? <LoaderCircle className="animate-spin" size={15} /> : <Check size={15} />}
              </button>
              <button className="grid h-9 w-9 place-items-center rounded-xl text-white/35 hover:bg-red-500/10 hover:text-red-300" type="button" onClick={() => void remove(group)} aria-label={`删除 ${group.name}`}>
                <Trash2 size={15} />
              </button>
            </li>
          ))}
          {!groups.length && <li className="py-10 text-center text-sm text-white/35">还没有分组</li>}
        </ul>
      </div>
    </Modal>
  );
}
