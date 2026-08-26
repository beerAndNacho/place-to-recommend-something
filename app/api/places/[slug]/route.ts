import { NextResponse } from "next/server";
import { getPlaceBySlug } from "@/lib/place-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const { place, payload } = await getPlaceBySlug(slug);
  if (!place) {
    return NextResponse.json({ message: "장소를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(
    { place, mode: payload.mode, notice: payload.notice, updatedAt: payload.updatedAt },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
