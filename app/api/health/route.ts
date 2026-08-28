import { type NextRequest, NextResponse } from "next/server";
import { SEOUL_API_KEY_COOKIE, resolveApiKeySource } from "@/lib/api-key-settings";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const browserKey = request.cookies.get(SEOUL_API_KEY_COOKIE)?.value;
  const keySource = resolveApiKeySource(browserKey);
  return NextResponse.json(
    {
      status: "ok",
      service: "place-to-recommend-something",
      dataMode:
        keySource === "browser"
          ? "browser-key-enabled"
          : keySource === "environment"
            ? "live-enabled"
            : "mock",
      keySource,
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
