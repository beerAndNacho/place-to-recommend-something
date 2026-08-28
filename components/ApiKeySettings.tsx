"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "./ApiKeySettings.module.css";

type ApiKeySource = "browser" | "environment" | "none";

type SettingsStatus = {
  environmentKeyConfigured: boolean;
  browserKeyConfigured: boolean;
  activeSource: ApiKeySource;
  browserKeyExpiresInDays: number | null;
  message?: string;
  validatedPlace?: string;
};

const sourceLabels: Record<ApiKeySource, string> = {
  browser: "현재 브라우저 인증키",
  environment: "Vercel 환경변수",
  none: "데모 데이터",
};

export function ApiKeySettings({ vercelSettingsUrl }: { vercelSettingsUrl: string }) {
  const [status, setStatus] = useState<SettingsStatus>();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string }>();

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/settings", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setStatus((await response.json()) as SettingsStatus);
    } catch {
      setFeedback({ kind: "error", text: "설정 상태를 불러오지 못했습니다." });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const saveKey = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(undefined);
    setIsSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const payload = (await response.json()) as SettingsStatus & { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "인증키 저장에 실패했습니다.");
      setStatus(payload);
      setApiKey("");
      setShowKey(false);
      setFeedback({
        kind: "success",
        text: payload.message ?? "인증키를 검증하고 저장했습니다.",
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "인증키 저장에 실패했습니다.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteBrowserKey = async () => {
    setFeedback(undefined);
    setIsDeleting(true);
    try {
      const response = await fetch("/api/settings", { method: "DELETE" });
      const payload = (await response.json()) as SettingsStatus & { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "인증키 삭제에 실패했습니다.");
      setStatus(payload);
      setFeedback({ kind: "success", text: payload.message ?? "인증키를 삭제했습니다." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "인증키 삭제에 실패했습니다.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.shell}>
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>DATA CONNECTION</span>
          <h1>서울 API 인증키 설정</h1>
          <p>
            발급받은 인증키를 검증한 뒤 현재 브라우저에서 실시간 인구 데이터를 확인하거나,
            Vercel 환경변수로 등록해 모든 방문자에게 적용할 수 있습니다.
          </p>
        </div>
        <Link href="/" className={styles.backLink}>← 인파레이더로 돌아가기</Link>
      </div>

      <section className={styles.statusGrid} aria-label="인증키 연결 상태">
        <article className={styles.statusCard}>
          <span>현재 데이터 소스</span>
          <strong className={status?.activeSource === "none" ? styles.warningText : styles.successText}>
            {isLoading ? "확인 중" : sourceLabels[status?.activeSource ?? "none"]}
          </strong>
          <small>대시보드에서 실제로 우선 사용하는 설정입니다.</small>
        </article>
        <article className={styles.statusCard}>
          <span>브라우저 테스트 키</span>
          <strong className={status?.browserKeyConfigured ? styles.successText : ""}>
            {isLoading ? "확인 중" : status?.browserKeyConfigured ? "등록됨" : "미등록"}
          </strong>
          <small>{status?.browserKeyConfigured ? "7일 후 자동 만료" : "현재 기기에만 적용"}</small>
        </article>
        <article className={styles.statusCard}>
          <span>Vercel 운영 키</span>
          <strong className={status?.environmentKeyConfigured ? styles.successText : ""}>
            {isLoading ? "확인 중" : status?.environmentKeyConfigured ? "등록됨" : "미등록"}
          </strong>
          <small>사이트의 모든 방문자에게 적용됩니다.</small>
        </article>
      </section>

      {feedback && (
        <div className={`${styles.feedback} ${feedback.kind === "success" ? styles.feedbackSuccess : styles.feedbackError}`} role="status">
          {feedback.text}
        </div>
      )}

      <div className={styles.contentGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHeading}>
            <span className={styles.step}>01</span>
            <div>
              <h2>이 브라우저에서 바로 테스트</h2>
              <p>배포를 다시 하지 않고 인증키가 정상인지 먼저 확인합니다.</p>
            </div>
          </div>

          <form onSubmit={saveKey} className={styles.form}>
            <label htmlFor="seoul-api-key">SEOUL_API_KEY</label>
            <div className={styles.inputRow}>
              <input
                id="seoul-api-key"
                name="seoul-api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="서울 열린데이터광장에서 발급받은 인증키"
                autoComplete="off"
                spellCheck={false}
                required
                minLength={5}
                maxLength={200}
              />
              <button type="button" className={styles.secondaryButton} onClick={() => setShowKey((current) => !current)}>
                {showKey ? "숨기기" : "표시"}
              </button>
            </div>
            <ul className={styles.securityNotes}>
              <li>저장 전에 서울 실시간 인구 API 호출로 키를 검증합니다.</li>
              <li>키는 GitHub와 화면 코드에 기록되지 않습니다.</li>
              <li>Secure·HttpOnly 쿠키로 현재 브라우저에만 7일간 보관됩니다.</li>
            </ul>
            <div className={styles.buttonRow}>
              <button type="submit" className={styles.primaryButton} disabled={isSaving || apiKey.trim().length < 5}>
                {isSaving ? "검증 중…" : "검증하고 저장"}
              </button>
              {status?.browserKeyConfigured && (
                <button type="button" className={styles.dangerButton} onClick={deleteBrowserKey} disabled={isDeleting}>
                  {isDeleting ? "삭제 중…" : "브라우저 키 삭제"}
                </button>
              )}
            </div>
          </form>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeading}>
            <span className={styles.step}>02</span>
            <div>
              <h2>운영 사이트 전체에 적용</h2>
              <p>Vercel 환경변수에 등록하면 모든 방문자가 실데이터를 봅니다.</p>
            </div>
          </div>

          <div className={styles.envBlock}>
            <div><span>변수 이름</span><code>SEOUL_API_KEY</code></div>
            <div><span>적용 범위</span><code>Production · Preview · Development</code></div>
            <div><span>권장 캐시</span><code>SEOUL_API_CACHE_SECONDS=900</code></div>
            <div><span>실데이터 호출 수</span><code>SEOUL_LIVE_PLACE_LIMIT=10</code></div>
          </div>

          <ol className={styles.steps}>
            <li>Vercel 프로젝트의 Settings → Environment Variables로 이동합니다.</li>
            <li><code>SEOUL_API_KEY</code>에 발급받은 키를 저장합니다.</li>
            <li>Production을 포함한 원하는 환경을 선택하고 Redeploy합니다.</li>
          </ol>

          <a href={vercelSettingsUrl} target="_blank" rel="noreferrer" className={styles.vercelButton}>
            Vercel 환경변수 설정 열기 ↗
          </a>
        </section>
      </div>

      <section className={styles.priorityNote}>
        <strong>적용 우선순위</strong>
        <span>현재 브라우저 키 → Vercel 환경변수 → 데모 데이터</span>
        <p>브라우저 키를 삭제하면 Vercel 운영 키가 자동으로 사용됩니다.</p>
      </section>
    </div>
  );
}
