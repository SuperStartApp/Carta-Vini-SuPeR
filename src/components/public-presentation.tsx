"use client";

import { useCallback, useState } from "react";

export type Language = "it" | "en";

export function translated(italian: string | undefined, english: string | null | undefined, lang: Language) {
  return (lang === "en" ? english?.trim() : undefined) || italian?.trim() || "";
}

export function safeImage(url?: string) {
  return url && /^https?:\/\/[^\s]+$/i.test(url) ? url : undefined;
}

export function ExternalImage({ url, alt, className, fallback }: { url: string; alt: string; className: string; fallback?: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  const detectFailedLoad = useCallback((image: HTMLImageElement | null) => {
    if (image?.complete && image.naturalWidth === 0) setFailed(true);
  }, []);
  if (failed) return fallback ?? null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={detectFailedLoad} src={url} alt={alt} className={className} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}
