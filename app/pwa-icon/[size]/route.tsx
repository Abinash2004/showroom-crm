import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const ALLOWED = new Set([192, 512]);

export async function GET(request: NextRequest, ctx: { params: Promise<{ size: string }> }): Promise<Response> {
  const { size: raw } = await ctx.params;
  const size = Number(raw);
  if (!ALLOWED.has(size)) return new Response("Not found", { status: 404 });
  const maskable = request.nextUrl.searchParams.get("maskable") === "1";
  const glyph = Math.round(size * (maskable ? 0.4 : 0.55));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1d4ed8",
          color: "#ffffff",
          fontSize: glyph,
          fontWeight: 800,
          borderRadius: maskable ? 0 : size * 0.22,
        }}
      >
        S
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
}
