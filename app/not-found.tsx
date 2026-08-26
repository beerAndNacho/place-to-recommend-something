import Link from "next/link";
import { ArrowIcon, PinIcon } from "@/components/icons";

export default function NotFound() {
  return (
    <main className="not-found">
      <span className="not-found__icon"><PinIcon /></span>
      <p>404</p>
      <h1>이 장소는 아직 등록되지 않았어요</h1>
      <span>현재 제공 중인 서울 장소 목록에서 다시 찾아보세요.</span>
      <Link href="/crowd">장소 탐색으로 돌아가기 <ArrowIcon /></Link>
    </main>
  );
}
