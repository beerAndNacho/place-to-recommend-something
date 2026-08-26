import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "지금어디 | 서울 실시간 혼잡도 장소 추천",
    template: "%s | 지금어디",
  },
  description:
    "서울 주요 장소의 혼잡도, 예상 인구, 목적 적합도를 비교해 지금 방문하기 좋은 곳을 찾아보세요.",
  applicationName: "지금어디",
  keywords: ["서울 실시간 혼잡도", "서울 실시간 인구", "서울 데이트", "서울 갈만한 곳", "장소 추천"],
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "지금어디",
    title: "지금어디 | 서울 실시간 혼잡도 장소 추천",
    description: "혼잡도와 목적을 함께 비교해 지금 갈 곳을 빠르게 선택하세요.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f7fb",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <AppHeader />
        {children}
        <footer className="site-footer">
          <p>서울 열린데이터광장 연동을 고려한 MVP · 실시간 데이터는 집계 및 캐시로 지연될 수 있습니다.</p>
        </footer>
      </body>
    </html>
  );
}
