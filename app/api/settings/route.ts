import { type NextRequest, NextResponse } from "next/server";
import { PLACE_DEFINITIONS, getMockPlace } from "@/data/places";
import {
  SEOUL_API_KEY_COOKIE,
  SEOUL_API_KEY_COOKIE_MAX_AGE,
  isPlausibleSeoulApiKey,
  normalizeSeoulApiKey,
  resolveApiKeySource,
} from "@/lib/api-key-settings";
import { fetchLivePlace } from "@/lib/seoul-api";

export const dynamic = "force-dynamic";

function settingsStatus(browserKey?: string | null) {
  const environmentKeyConfigured = Boolean(process.env.SEOUL_API_KEY?.trim());
  const browserKeyConfigured = Boolean(browserKey?.trim());
  return {
    environmentKeyConfigured,
    browserKeyConfigured,
    activeSource: resolveApiKeySource(browserKey),
    browserKeyExpiresInDays: browserKeyConfigured ? 7 : null,
  };
}

export async function GET(request: NextRequest) {
  const browserKey = request.cookies.get(SEOUL_API_KEY_COOKIE)?.value;
  return NextResponse.json(settingsStatus(browserKey), {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { apiKey?: unknown } | null;
  const apiKey = normalizeSeoulApiKey(body?.apiKey);

  if (!isPlausibleSeoulApiKey(apiKey)) {
    return NextResponse.json(
      { message: "공백 없이 발급받은 서울 열린데이터광장 인증키를 입력하세요." },
      { status: 400 },
    );
  }

  const definition =
    PLACE_DEFINITIONS.find((place) => place.apiAreaName.includes("광화문"))
    ?? PLACE_DEFINITIONS[0];
  const fallback = definition ? getMockPlace(definition.slug) : undefined;

  if (!definition || !fallback) {
    return NextResponse.json(
      { message: "인증키 검증에 사용할 장소 데이터를 찾지 못했습니다." },
      { status: 500 },
    );
  }

  try {
    const validatedPlace = await fetchLivePlace(definition, fallback, apiKey, 60);
    const response = NextResponse.json({
      message: `${validatedPlace.name} 실시간 데이터 호출에 성공했습니다.`,
      ...settingsStatus(apiKey),
      validatedPlace: validatedPlace.name,
    });
    response.cookies.set({
      name: SEOUL_API_KEY_COOKIE,
      value: apiKey,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SEOUL_API_KEY_COOKIE_MAX_AGE,
    });
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  } catch (error) {
    console.warn(
      `[settings] Seoul API key validation failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    return NextResponse.json(
      {
        message:
          "인증키로 실시간 데이터를 불러오지 못했습니다. 키가 정확한지와 서울 열린데이터광장 사용 상태를 확인하세요.",
      },
      { status: 422 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({
    message: "이 브라우저에 저장된 인증키를 삭제했습니다.",
    ...settingsStatus(null),
  });
  response.cookies.set({
    name: SEOUL_API_KEY_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
