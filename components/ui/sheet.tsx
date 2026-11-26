"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CloseIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

interface SheetProps {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Override where focus lands when the sheet opens (default: first focusable element). */
  onOpenAutoFocus?: (event: Event) => void;
  children: React.ReactNode;
}

/** Accessible modal (focus trap, Esc, aria labelling by Radix) presented as a bottom sheet on phones. */
export function Sheet({ trigger, title, description, open, onOpenChange, onOpenAutoFocus, children }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content
          onOpenAutoFocus={onOpenAutoFocus}
          className={cn(
            "sheet-content fixed z-50 flex max-h-[90dvh] flex-col bg-surface text-fg shadow-sheet",
            "inset-x-0 bottom-0 rounded-t-sheet pb-[env(safe-area-inset-bottom)]",
            "md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-sheet md:pb-0",
          )}
        >
          <div className="flex items-start justify-between gap-4 p-5 pb-2">
            <div>
              <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
              <Dialog.Description className={description ? "mt-1 text-sm text-muted" : "sr-only"}>
                {description ?? title}
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="press -mr-2 -mt-1 inline-flex size-12 shrink-0 items-center justify-center rounded-full"
            >
              <CloseIcon />
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto p-5 pt-2">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}