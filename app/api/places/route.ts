import { type NextRequest, NextResponse } from "next/server";
import { SEOUL_API_KEY_COOKIE } from "@/lib/api-key-settings";
import { getPlacesPayload } from "@/lib/place-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const browserApiKey = request.cookies.get(SEOUL_API_KEY_COOKIE)?.value;
  const payload = await getPlacesPayload(browserApiKey);
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": browserApiKey
        ? "private, no-store, max-age=0"
        : "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
