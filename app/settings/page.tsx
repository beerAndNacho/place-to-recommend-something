import type { Metadata } from "next";
import { ApiKeySettings } from "@/components/ApiKeySettings";

export const metadata: Metadata = {
  title: "서울 API 인증키 설정",
  description: "서울 열린데이터광장 인증키를 검증하고 브라우저 또는 Vercel 환경변수에 연결합니다.",
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  const vercelSettingsUrl =
    process.env.NEXT_PUBLIC_VERCEL_SETTINGS_URL
    ?? "https://vercel.com/dashboard";

  return (
    <main>
      <ApiKeySettings vercelSettingsUrl={vercelSettingsUrl} />
    </main>
  );
}
