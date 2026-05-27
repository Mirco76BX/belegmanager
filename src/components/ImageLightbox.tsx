import { useState, useRef, useEffect } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { createPortal } from "react-dom";

/**
 * Vollbild-Lightbox für Beleg-Fotos.
 *
 * Capacitor WebView blockiert nativen Pinch-Zoom (viewport user-scalable=no
 * ist in vielen Capacitor-Setups gesetzt). Deshalb implementieren wir
 * Zoom hier explizit per CSS-Transform mit Buttons und Drag-Pan.
 *
 * Renderziel ist document.body via createPortal — damit ist die Lightbox
 * NICHT in irgendwelchen Dialog-/Stacking-Containern gefangen.
 */
export default function ImageLightbox({
  src,
  onClose,
  closeLabel = "Close",
}: {
  src: string;
  onClose: () => void;
  closeLabel?: string;
}) {
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; baseX: number; baseY: number }>({
    active: false, startX: 0, startY: 0, baseX: 0, baseY: 0,
  });

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const reset = () => { setZoom(1); setPos({ x: 0, y: 0 }); };
  const zoomIn = () => setZoom((z) => Math.min(z + 0.5, 5));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.5, 1));

  // Drag-pan when zoomed in
  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      baseX: pos.x,
      baseY: pos.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    setPos({
      x: dragRef.current.baseX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.baseY + (e.clientY - dragRef.current.startY),
    });
  };
  const onPointerUp = () => {
    dragRef.current.active = false;
  };

  const lightboxJsx = (
    <div
      className="fixed inset-0 z-[9999] bg-black flex flex-col"
      role="dialog"
      aria-modal="true"
    >
      {/* Top bar — Close-Button. Großer Tap-Bereich, Safe-Area-Top. */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= 1}
            className="h-11 w-11 rounded-full bg-white/15 text-white flex items-center justify-center backdrop-blur-sm active:bg-white/30 disabled:opacity-40"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= 5}
            className="h-11 w-11 rounded-full bg-white/15 text-white flex items-center justify-center backdrop-blur-sm active:bg-white/30 disabled:opacity-40"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={zoom === 1 && pos.x === 0 && pos.y === 0}
            className="h-11 w-11 rounded-full bg-white/15 text-white flex items-center justify-center backdrop-blur-sm active:bg-white/30 disabled:opacity-40"
            aria-label="Reset zoom"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <span className="text-white/70 text-xs font-mono ml-1">{Math.round(zoom * 100)}%</span>
        </div>

        {/* Close-Button — XL Tap-Target. Wichtiges: HOHE z-index UND eigenes Pointer-Events. */}
        <button
          type="button"
          onClick={onClose}
          className="h-12 px-4 rounded-full bg-white/20 text-white flex items-center gap-2 backdrop-blur-sm active:bg-white/35 font-medium"
          aria-label={closeLabel}
        >
          <X className="h-5 w-5" />
          <span className="text-sm">{closeLabel}</span>
        </button>
      </div>

      {/* Image area — clips. Tap outside image (on backdrop) closes. */}
      <div
        className="flex-1 overflow-hidden flex items-center justify-center relative"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <img
          src={src}
          alt="Receipt"
          draggable={false}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            transition: dragRef.current.active ? "none" : "transform 0.15s ease-out",
            cursor: zoom > 1 ? "grab" : "default",
            touchAction: "none",
            userSelect: "none",
          }}
        />
      </div>

      {/* Bottom-Hinweis */}
      <div
        className="text-center text-white/60 text-[11px] pb-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
      >
        {zoom > 1 ? "Drag to pan · Reset to fit" : "Zoom +/− to enlarge"}
      </div>
    </div>
  );

  return createPortal(lightboxJsx, document.body);
}
