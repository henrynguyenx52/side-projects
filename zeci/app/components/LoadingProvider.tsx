"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";

export default function LoadingProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Configure NProgress
    NProgress.configure({
      showSpinner: false,
      minimum: 0.3,
      easing: "ease",
      speed: 800,
    });
  }, []);

  useEffect(() => {
    // Complete the progress bar when navigation ends
    const timer = setTimeout(() => {
      NProgress.done();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [pathname, searchParams]);

  useEffect(() => {
    // Start progress for internal navigation to a different URL (skip same-page)
    const onPointerDown = (e: PointerEvent) => {
      let el = e.target as HTMLElement | null;
      while (el && el !== document.body && el.tagName !== "A")
        el = el.parentElement;
      const anchor = (el as HTMLAnchorElement) || null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      )
        return;

      // New tab/window or modified clicks: ignore
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = anchor.getAttribute("target");
      const rel = anchor.getAttribute("rel") || "";
      if ((target && target !== "_self") || rel.includes("external")) return;

      const nextUrl = new URL(href, window.location.href);
      if (nextUrl.origin !== window.location.origin) return; // external

      // Skip if navigating to the same page (same pathname+search)
      const currentKey = window.location.pathname + window.location.search;
      const nextKey = nextUrl.pathname + nextUrl.search;
      if (currentKey === nextKey) return;

      NProgress.start();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, []);

  return <>{children}</>;
}
