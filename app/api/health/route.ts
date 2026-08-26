import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "place-to-recommend-something",
    dataMode: process.env.SEOUL_API_KEY?.trim() ? "live-enabled" : "mock",
    timestamp: new Date().toISOString(),
  });
}
