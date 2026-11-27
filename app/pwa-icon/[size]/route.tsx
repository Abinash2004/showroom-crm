import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const ALLOWED = new Set([192, 512]);

const INK = "#1b1c1e";
const GREEN = "#5ccf87";

/** The app logo wheel (same drawing as components/layout/busy.tsx and app/favicon.ico), as a 32x32 SVG. */
const WHEEL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<circle cx="16" cy="16" r="12.5" fill="none" stroke="#f5f5f0" stroke-width="3.5"/>
<circle cx="16" cy="16" r="12.5" fill="none" stroke="${INK}" stroke-width="3.5" stroke-dasharray="1.4 3.5" opacity="0.55"/>
<circle cx="16" cy="16" r="8.6" fill="none" stroke="${GREEN}" stroke-width="1.4"/>
${[0, 72, 144, 216, 288]
  .map((d) => `<line x1="16" y1="16" x2="16" y2="8" stroke="${GREEN}" stroke-width="1.8" stroke-linecap="round" transform="rotate(${d} 16 16)"/>`)
  .join("")}
<circle cx="16" cy="16" r="2.6" fill="${GREEN}"/>
<circle cx="16" cy="16" r="1" fill="${INK}"/>
</svg>`;
const WHEEL_SRC = `data:image/svg+xml;base64,${Buffer.from(WHEEL_SVG).toString("base64")}`;

export async function GET(request: NextRequest, ctx: { params: Promise<{ size: string }> }): Promise<Response> {
  const { size: raw } = await ctx.params;
  const size = Number(raw);
  if (!ALLOWED.has(size)) return new Response("Not found", { status: 404 });
  // Maskable: full-bleed Obsidian, wheel kept inside Android's 80% safe zone so circle/squircle crops never cut the tyre.
  const maskable = request.nextUrl.searchParams.get("maskable") === "1";
  const wheel = Math.round(size * (maskable ? 0.62 : 0.8));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: INK,
          borderRadius: maskable ? 0 : size * 0.22,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG by ImageResponse, not the browser */}
        <img src={WHEEL_SRC} width={wheel} height={wheel} alt="" />
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
}
