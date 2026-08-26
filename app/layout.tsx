import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import "./radar.css";
import { AppHeader } from "@/components/AppHeader";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "서울 인파레이더 | 지금어디",
    template: "%s | 지금어디",
  },
  description: "서울 주요 장소의 실시간 혼잡도와 예상 인구를 지도와 목록에서 한눈에 확인하세요.",
  applicationName: "지금어디 인파레이더",
  keywords: ["서울 인파레이더", "서울 실시간 혼잡도", "서울 실시간 인구", "서울 사람 많은 곳", "장소 추천"],
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "지금어디",
    title: "서울 인파레이더 | 지금어디",
    description: "지도와 촘촘한 장소 목록으로 서울 혼잡도를 빠르게 비교하세요.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbfbfa",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
