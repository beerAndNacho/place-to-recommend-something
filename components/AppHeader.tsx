import Link from "next/link";
import { ExternalIcon, PinIcon } from "@/components/icons";

export function AppHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand" aria-label="지금어디 홈">
          <span className="brand__mark"><PinIcon /></span>
          <span className="brand__word">지금어디</span>
        </Link>

        <nav className="site-nav" aria-label="주요 메뉴">
          <Link href="/crowd">실시간 탐색</Link>
          <a
            href="https://github.com/beerAndNacho/place-to-recommend-something"
            target="_blank"
            rel="noreferrer"
          >
            GitHub <ExternalIcon />
          </a>
        </nav>
      </div>
    </header>
  );
}
