"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const cancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    dialog.addEventListener("cancel", cancel);
    return () => dialog.removeEventListener("cancel", cancel);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className={`m-auto max-h-[92vh] w-[calc(100%-1.5rem)] overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#17181b] p-0 text-white shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-md ${wide ? "max-w-5xl" : "max-w-xl"}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="flex max-h-[92vh] flex-col">
        <header className="flex shrink-0 items-start justify-between border-b border-white/8 px-5 py-4 sm:px-6">
          <div>
            <h2 id={titleId} className="text-lg font-black tracking-tight">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-white/45">
                {description}
              </p>
            )}
          </div>
          <button
            className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
            type="button"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto">{children}</div>
      </div>
    </dialog>
  );
}
