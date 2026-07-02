"use client";

/**
 * MindAR image-tracking stage (CDN-loaded A-Frame + MindAR, no npm deps).
 * When the printed Al Fahidi marker enters the camera view, a low-poly 3D
 * barjeel and an old-photo alignment card anchor to it.
 *
 * Degrades gracefully: if the compiled `.mind` target or the CDN engine is
 * unavailable, the visitor gets a clear note plus the marker download link
 * and returns to magic-window mode — the demo never dies.
 */

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Download } from "lucide-react";
import { colors } from "@/lib/theme";
import { MARKER_MIND_SRC, MARKER_PNG_SRC } from "./arData";

const AFRAME_SRC = "https://aframe.io/releases/1.5.0/aframe.min.js";
const MINDAR_SRC =
  "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js";

type StageStatus = "checking" | "loading" | "ready" | "missing" | "failed";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`,
    );
    if (existing) {
      if (existing.dataset.loaded === "true") return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error(src)));
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    });
    script.addEventListener("error", () => reject(new Error(src)));
    document.head.appendChild(script);
  });
}

/** A-Frame scene markup — colors come from theme tokens, never hardcoded. */
function sceneMarkup(): string {
  const sand = colors.sand;
  const gold = colors.gold;
  const night = colors["night-soft"];
  return `
<a-scene mindar-image="imageTargetSrc: ${MARKER_MIND_SRC}; uiLoading: yes; uiScanning: yes; uiError: no"
  embedded color-space="sRGB" renderer="colorManagement: true, physicallyCorrectLights"
  vr-mode-ui="enabled: false" device-orientation-permission-ui="enabled: false"
  style="width:100%;height:100%;">
  <a-assets>
    <img id="arx-old-photo" src="/images/old/creek-1964.jpg" crossorigin="anonymous" />
  </a-assets>
  <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
  <a-entity mindar-image-target="targetIndex: 0">
    <!-- old-photo alignment card -->
    <a-plane src="#arx-old-photo" position="0.75 0.15 0" width="0.95" height="0.55"></a-plane>
    <a-plane color="${night}" position="0.75 0.15 -0.01" width="1.01" height="0.61"></a-plane>
    <!-- stylized barjeel: shaft, stepped parapet, X-fins, gold cap -->
    <a-box color="${sand}" position="-0.55 0.25 0" width="0.34" depth="0.34" height="0.5"></a-box>
    <a-box color="${sand}" position="-0.55 0.53 0" width="0.42" depth="0.42" height="0.06"></a-box>
    <a-box color="${sand}" position="-0.55 0.6 0" width="0.34" depth="0.34" height="0.06"></a-box>
    <a-box color="${gold}" position="-0.55 0.25 0" width="0.05" depth="0.36" height="0.46" rotation="0 45 0"></a-box>
    <a-box color="${gold}" position="-0.55 0.25 0" width="0.05" depth="0.36" height="0.46" rotation="0 -45 0"></a-box>
    <a-cone color="${gold}" position="-0.55 0.68 0" radius-bottom="0.09" radius-top="0" height="0.12"></a-cone>
  </a-entity>
</a-scene>`;
}

export interface MarkerStageProps {
  onExit: () => void;
}

export default function MarkerStage({ onExit }: MarkerStageProps) {
  const t = useTranslations("arx");
  const [status, setStatus] = useState<StageStatus>("checking");
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const head = await fetch(MARKER_MIND_SRC, { method: "HEAD" });
        if (!head.ok) {
          if (!cancelled) setStatus("missing");
          return;
        }
        if (cancelled) return;
        setStatus("loading");
        await loadScript(AFRAME_SRC);
        await loadScript(MINDAR_SRC);
        if (cancelled || !mountRef.current) return;
        mountRef.current.innerHTML = sceneMarkup();
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("failed");
      }
    }

    void boot();
    const mount = mountRef.current;
    return () => {
      cancelled = true;
      if (mount) {
        // Stop MindAR's camera + renderer before tearing the DOM down.
        const scene = mount.querySelector("a-scene") as
          | (Element & {
              systems?: Record<string, { stop?: () => void } | undefined>;
            })
          | null;
        try {
          scene?.systems?.["mindar-image-system"]?.stop?.();
        } catch {
          /* already stopped */
        }
        mount.innerHTML = "";
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 z-20 bg-night">
      {/* MindAR sizes its injected <video> with inline px values that can
          misfit an embedded container — force a full-bleed cover fit. */}
      <div
        ref={mountRef}
        className="absolute inset-0 [&_video]:top-0! [&_video]:left-0! [&_video]:h-full! [&_video]:w-full! [&_video]:object-cover"
      />

      {status !== "ready" ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
          <div className="flex max-w-md flex-col items-center gap-4 rounded-md border border-line bg-night-soft/70 p-6 text-center text-sand backdrop-blur-md">
            <p className="text-sm leading-relaxed">
              {status === "missing"
                ? t("marker3d.missing")
                : status === "failed"
                  ? t("marker3d.failed")
                  : t("marker3d.loading")}
            </p>
            {status === "missing" || status === "failed" ? (
              <a
                href={MARKER_PNG_SRC}
                download
                className="inline-flex items-center gap-2 rounded-md border border-gold/60 px-4 py-2 text-sm text-gold-bright hover:bg-gold/10"
              >
                <Download className="size-4" aria-hidden />
                {t("marker3d.download")}
              </a>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="pointer-events-none absolute inset-x-0 top-16 z-10 mx-auto w-fit rounded-pill border border-line bg-night-soft/70 px-4 py-1.5 text-center text-xs text-sand/90 backdrop-blur-md">
          {t("marker3d.scan")}
        </p>
      )}

      <button
        type="button"
        onClick={onExit}
        className="absolute bottom-4 start-1/2 z-30 inline-flex -translate-x-1/2 items-center gap-2 rounded-pill border border-line bg-night-soft/70 px-4 py-2 text-xs text-sand backdrop-blur-md hover:border-gold hover:text-gold-bright rtl:translate-x-1/2"
      >
        <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden />
        {t("live.exitMarker")}
      </button>
    </div>
  );
}
