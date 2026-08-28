import { type NextRequest, NextResponse } from "next/server";
import { SEOUL_API_KEY_COOKIE } from "@/lib/api-key-settings";
import { getPlaceBySlug } from "@/lib/place-service";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const browserApiKey = request.cookies.get(SEOUL_API_KEY_COOKIE)?.value;
  const { place, payload } = await getPlaceBySlug(slug, browserApiKey);
  if (!place) {
    return NextResponse.json({ message: "장소를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(
    { place, mode: payload.mode, notice: payload.notice, updatedAt: payload.updatedAt },
    {
      headers: {
        "Cache-Control": browserApiKey
          ? "private, no-store, max-age=0"
          : "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
