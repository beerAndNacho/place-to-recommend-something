import { NextResponse } from "next/server";
import { getPlacesPayload } from "@/lib/place-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await getPlacesPayload();
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
