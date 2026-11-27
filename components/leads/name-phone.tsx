import { formatPhone } from "@/lib/format";

/**
 * Card title row: "Name | 98863 58887". The phone sits beside the name when both fit and wraps below it
 * when they don't; a name longer than the row truncates. Each item draws its "|" in its left padding, and
 * the row is shifted left by that padding inside an overflow-hidden box, so the separator is clipped away
 * at the start of a line (no dangling "|" after a wrap). Lines are 24px, the status tag's height.
 */
export function NamePhone({ name, phone }: { name: string; phone: string }) {
  return (
    <div className="min-w-0 flex-1 overflow-hidden">
      <div className="-ml-6 flex flex-wrap items-center gap-y-0.5 [&>*]:relative [&>*]:pl-6 [&>*]:before:absolute [&>*]:before:left-2.5 [&>*]:before:font-normal [&>*]:before:text-muted/60 [&>*]:before:content-['|']">
        <h2 className="max-w-full truncate text-[1.0625rem] font-semibold leading-6">{name}</h2>
        <p className="h-6 shrink-0 whitespace-nowrap text-[0.9375rem] font-semibold leading-6 tabular-nums tracking-wide">{formatPhone(phone)}</p>
      </div>
    </div>
  );
}
