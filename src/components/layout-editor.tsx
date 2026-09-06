/**
 * Editor denah venue (F10) — palet + kanvas + keyboard. Satu jalur kode untuk
 * mouse dan sentuhan via Pointer Events + `touch-none` di sumber seret;
 * tidak ada dependency drag-and-drop (HTML5 DnD bawaan rusak di sentuh,
 * dan sentuh berbobot 15% penilaian).
 *
 * Alur: seret dari palet (atau klik untuk mode taruh), seret kotak untuk
 * pindah, gagang kanan-bawah untuk ubah ukuran, klik untuk pilih, Del untuk
 * hapus, panah keyboard untuk geser. Ghost putus-putus menunjukkan validitas
 * SEBELUM drop — kolisi ditolak diam-diam, tidak menimpa.
 */
"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Accessibility,
  Armchair,
  Bath,
  Cross,
  DoorOpen,
  Lightbulb,
  PersonStanding,
  Recycle,
  Sofa,
  Speaker,
  Square,
  Star,
  Store,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react";
import {
  BOX_SPECS,
  DEFAULT_LAYOUT,
  GRID_LIMITS,
  LAYOUT_BOX_TYPES,
  clampBoxToGrid,
  countByType,
  createBox,
  deriveLayoutPatch,
  isFree,
  type LayoutBox,
  type LayoutBoxType,
  type VenueLayout,
} from "@/lib/layout";
import { ACCESSIBILITY } from "@/lib/coefficients";
import { WASTE_BINS_LABELS } from "@/lib/labels";
import { decimal } from "@/lib/format";
import type { AccessibilityFeature, WasteBins } from "@/lib/engine";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ICONS: Record<LayoutBoxType, LucideIcon> = {
  stage: Star,
  seating: Armchair,
  booth: Store,
  entrance: DoorOpen,
  generic: Square,
  lighting: Lightbulb,
  sound: Speaker,
  wasteStation: Recycle,
  restroom: Bath,
  ramp: Accessibility,
  accessibleToilet: PersonStanding,
  prioritySeating: Sofa,
  firstAid: Cross,
};

interface LayoutEditorProps {
  layout: VenueLayout;
  /** Dipanggil hanya untuk edit pengguna (seret/taruh/hapus/keyboard). */
  onChange: (next: VenueLayout) => void;
  /** Konteks skenario untuk saran denah — editor tak pernah menulis form langsung. */
  participants: number;
  wasteBins: WasteBins;
  accessibility: AccessibilityFeature[];
  onApplyWaste: (bins: WasteBins) => void;
  onApplyAccess: (feature: AccessibilityFeature) => void;
}

interface Ghost {
  x: number;
  y: number;
  w: number;
  h: number;
  valid: boolean;
  label: string;
}

type Drag =
  | { kind: "new"; type: LayoutBoxType; startClientX: number; startClientY: number; moved: boolean; pointerId: number }
  | {
      kind: "move";
      id: string;
      dx: number;
      dy: number;
      startCellX: number;
      startCellY: number;
      pointerId: number;
    }
  | { kind: "resize"; id: string; ox: number; oy: number; pointerId: number }
  /**
   * Geser tampilan ala draw.io: seret latar kosong untuk pan (scroll region),
   * bukan scroll thumb. Tanpa commit — murni navigasi.
   */
  | {
      kind: "pan";
      pointerId: number;
      startClientX: number;
      startClientY: number;
      startSL: number;
      startST: number;
      moved: boolean;
    };

type Cell = { x: number; y: number; w: number; h: number };

const sameCell = (a: Cell, b: Cell) =>
  a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

/**
 * Zoom pratinjau + presisi seret. Sel dasar MENGIKUTI lebar region (fit-width):
 * 100% selalu memenuhi kartu — tidak ada area mati raksasa di layar lebar,
 * tidak ada scroll di ponsel. BASE_CELL_PX hanya fallback pra-ukur.
 * Zoom mengalikan sel fit, bukan skala transform — matematika sel dari
 * getBoundingClientRect tetap benar di semua level tanpa koreksi.
 */
const BASE_CELL_PX = 16;
// Zoom hanya ke dalam: lantai 100% (= pas memenuhi layar), plafon 300%.
// Tak ada zoom-out di bawah fit — seluruh masalah dead-space selesai struktural.
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
// 0,25 diadik — roundtrip zoom float-exact tanpa drift.
const ZOOM_STEP = 0.25;
// Epsilon ceil — cegah artefak float bikin kolom/baris lebih satu sel.
const EPS_CEIL = 1e-9;
const clampZoom = (z: number) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 100) / 100));

export const LayoutEditor = memo(function LayoutEditor({
  layout,
  onChange,
  participants,
  wasteBins,
  accessibility,
  onApplyWaste,
  onApplyAccess,
}: LayoutEditorProps) {
  const { boxes } = layout;
  const [armed, setArmed] = useState<LayoutBoxType | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [notice, setNotice] = useState("");
  const [noticeKey, setNoticeKey] = useState(0);
  const [zoom, setZoom] = useState(1);
  // Cermin zoom untuk handler stabil (window listener subscribe sekali).
  const zoomRef = useRef(1);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  // Koreksi scroll tertunda agar titik di bawah kursor diam saat zoom.
  const pendingAnchorRef = useRef<{ dx: number; dy: number; ratio: number } | null>(null);
  // True saat pan-drag aktif — kursor grabbing.
  const [panning, setPanning] = useState(false);
  // Ukuran viewport region (px) — dasar grid mengisi layar. Diukur di efek bawah.
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  // Akar editor — zoom (roda + keyboard) berlaku di seluruh editor, bukan
  // hanya di atas grid. Kalau tidak, pointer di palet/hint malah men-zoom
  // halaman browser dan rasanya rusak-sebentar-bisa.
  const rootRef = useRef<HTMLDivElement>(null);
  // Region scroll pembungkus — jangkar fokus + wheel agar kanvas tak rebut halaman.
  const regionRef = useRef<HTMLDivElement>(null);
  // Akumulator pinch trackpad — tahan delta kecil sampai layak satu langkah zoom.
  const pinchAccRef = useRef(0);

  // Listener window butuh state terbaru tanpa re-subscribe tiap render.
  // Disinkron di efek SETELAH dimensi tampil dihitung (lihat bawah).
  // Handler grid selalu memakai DIMENSI TAMPIL, bukan venue tersimpan.
  const liveRef = useRef({ layout, viewCols: layout.cols, viewRows: layout.rows, onChange, armed, selectedId });
  const dragRef = useRef<Drag | null>(null);
  // Cermin ghost untuk pointercancel; onUp hitung ulang dari koordinat.
  const ghostRef = useRef<Ghost | null>(null);
  // Klik palet setelah drop diabaikan via tenggat waktu, bukan boolean.
  const suppressUntilRef = useRef(0);

  // Ukur viewport region sekali + saat resize — dasar grid mengisi layar.
  useEffect(() => {
    const el = regionRef.current;
    if (!el) return;
    // Guard kesetaraan — cegah loop RO (scrollbar muncul → ukur → render).
    const measure = () =>
      setViewport((prev) => {
        const next = { w: el.clientWidth, h: el.clientHeight };
        return prev.w === next.w && prev.h === next.h ? prev : next;
      });
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /**
   * Grid tampil = venue + perluasan viewport. Sel fit mengikuti LEBAR VENUE
   * pada zoom 100%; zoom-out menumbuhkan kolom/baris (batas GRID_LIMITS)
   * supaya SELURUH layar adalah sel sungguhan yang bisa ditaruh kotak —
   * tak ada area dekoratif. Tak pernah menyusut di bawah venue (lindungi kotak).
   *
   * Basis fit DIBEKUKAN (fitCols): tumbuhnya venue saat commit TAK BOLEH
   * mengecilkan sel — kalau tidak, menaruh kotak di tepi saat zoom-out
   * me-reset seluruh skala tampilan (rug-pull). Sinkron ulang hanya saat
   * denah kosong (mount/reset/hapus-terakhir): tak ada kotak yang terganggu.
   */
  const [fitCols, setFitCols] = useState(layout.cols);
  useEffect(() => {
    if (layout.boxes.length === 0) setFitCols(layout.cols);
  }, [layout.boxes.length, layout.cols]);
  const cellPx =
    (viewport.w > 0 ? viewport.w / fitCols : BASE_CELL_PX) * zoom;
  const viewCols = Math.min(
    GRID_LIMITS.cols.max,
    Math.max(
      layout.cols,
      viewport.w > 0 ? Math.ceil(viewport.w / cellPx - EPS_CEIL) : layout.cols,
    ),
  );
  const viewRows = Math.min(
    GRID_LIMITS.rows.max,
    Math.max(
      layout.rows,
      viewport.h > 0 ? Math.ceil(viewport.h / cellPx - EPS_CEIL) : layout.rows,
    ),
  );
  const canvasW = viewCols * cellPx;
  const canvasH = viewRows * cellPx;

  // ORDER-SENSITIVE: sinkron liveRef dulu, efek window di bawah membacanya.
  // useLayoutEffect agar handler se-tick tak baca ref basi.
  useLayoutEffect(() => {
    liveRef.current = { layout, viewCols, viewRows, onChange, armed, selectedId };
  }, [layout, viewCols, viewRows, onChange, armed, selectedId]);

  // Reset pilihan basi saat denah kosong (reset simulator / hapus kotak terakhir).
  useEffect(() => {
    if (layout.boxes.length === 0) {
      setSelectedId(null);
      setArmed(null);
      setGhost(null);
    }
  }, [layout.boxes.length]);

  // Umumkan ke screen reader; key naik agar pesan sama dibaca ulang.
  const announce = (msg: string) => {
    setNotice(msg);
    setNoticeKey((k) => k + 1);
  };

  /**
   * Zoom berjangkar kursor ala draw.io: titik konten di bawah pointer diam
   * di tempat — kanvas tumbuh ke semua arah, bukan melar ke kanan-bawah.
   * Scroll dikoreksi di efek [zoom] setelah render (konten sudah berukuran
   * baru). Stabil via ref — aman dipakai listener window subscribe-sekali.
   * Didefinisikan sebelum efek roda/keyboard yang memakainya.
   */
  const zoomAt = useCallback((clientX: number, clientY: number, next: number) => {
    const region = regionRef.current;
    const cur = zoomRef.current;
    const clamped = clampZoom(next);
    if (!region || clamped === cur) {
      setZoom(clamped);
      return;
    }
    const rect = region.getBoundingClientRect();
    pendingAnchorRef.current = {
      dx: clientX - rect.left,
      dy: clientY - rect.top,
      ratio: clamped / cur,
    };
    setZoom(clamped);
  }, []);

  // Zoom ke tengah region (tombol toolbar + keyboard) — cursor tak ada.
  const zoomToCenter = useCallback(
    (next: number) => {
      const rect = regionRef.current?.getBoundingClientRect();
      if (!rect) {
        setZoom(clampZoom(next));
        return;
      }
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, next);
    },
    [zoomAt],
  );

  // Terapkan jangkar setelah zoom commit. Konsumsi sekali (StrictMode-aman).
  useEffect(() => {
    const p = pendingAnchorRef.current;
    pendingAnchorRef.current = null;
    if (!p) return;
    const region = regionRef.current;
    if (!region) return;
    region.scrollLeft = p.ratio * (region.scrollLeft + p.dx) - p.dx;
    region.scrollTop = p.ratio * (region.scrollTop + p.dy) - p.dy;
  }, [zoom]);

  /**
   * Ctrl+roda = zoom editor (bukan zoom halaman). Disadap di window dan
   * digerbang ke dalam editor: pointer di palet, toolbar, atau hint ikut
   * men-zoom kanvas. React tidak bisa preventDefault dari onWheel sintetis
   * (listener pasif), jadi dipasang manual dengan { passive: false }.
   * setZoom fungsional stabil — subscribe sekali saat mount.
   *
   * Normalisasi deltaMode: Firefox mengirim garis (mode 1, ~3/garis), bukan
   * piksel — tanpa ini butuh belasan notch untuk satu langkah. Ambang 60px:
   * satu notch mouse (~100-120) = 1-2 langkah, cubit trackpad mengalir.
   */
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (!rootRef.current?.contains(e.target as Node)) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 800 : 1;
      const delta = e.deltaY * unit;
      if (delta === 0) return;
      // Kumpulkan delta kecil trackpad; satu langkah tiap ambang.
      pinchAccRef.current += delta;
      const steps = Math.trunc(pinchAccRef.current / 60);
      if (steps === 0) return;
      pinchAccRef.current -= steps * 60;
      const next = zoomRef.current - steps * ZOOM_STEP;
      // Berjangkar kursor — titik di bawah pointer tidak bergeser.
      // clampZoom di zoomAt mentok lantai 100%: zoom hanya ke dalam.
      zoomAt(e.clientX, e.clientY, next);
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  /**
   * Ctrl+±/0 di mana saja di dalam editor (palet, toolbar, kotak) —
   * digerbang via activeElement supaya tidak membajak halaman.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (!["-", "_", "=", "+", "0"].includes(e.key)) return;
      if (!rootRef.current?.contains(document.activeElement)) return;
      e.preventDefault();
      if (e.key === "0") zoomToCenter(1);
      else if (e.key === "-" || e.key === "_") zoomToCenter(zoomRef.current - ZOOM_STEP);
      else zoomToCenter(zoomRef.current + ZOOM_STEP);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomToCenter]);

  // (zoomAt/zoomToCenter/anchor sudah didefinisikan di atas efek roda —
  // blok duplikat di sini dibuang agar satu sumber kebenaran.)
  // Fokus kotak untuk lanjutan keyboard; aman bila CSS.escape tak ada.
  const focusBox = (id: string) => {
    requestAnimationFrame(() => {
      try {
        const safe =
          typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(id) : id;
        document
          .querySelector<HTMLElement>(`[data-box-id="${safe}"]`)
          ?.focus({ preventScroll: true });
      } catch {
        // Abaikan — fokus hanya peningkatan, bukan fungsi inti.
      }
    });
  };

  const commit = (next: LayoutBox[], note: string) => {
    // Venue tersimpan tumbuh SECUKUPNYA menampung kotak (tak pernah susut,
    // tak ikut viewport). Perluasan viewport murni tampil — zoom tak menulis model.
    // Tumbuh dibatasi GRID_LIMITS agar venue tak meledak.
    const stored = liveRef.current.layout;
    const grown: VenueLayout = {
      ...stored,
      boxes: next,
      cols: Math.min(GRID_LIMITS.cols.max, Math.max(stored.cols, 0, ...next.map((b) => b.x + b.w))),
      rows: Math.min(GRID_LIMITS.rows.max, Math.max(stored.rows, 0, ...next.map((b) => b.y + b.h))),
    };
    // Tulis optimistis agar seret kunci cepat baca layout terbaru.
    liveRef.current.layout = grown;
    liveRef.current.onChange(grown);
    if (note) announce(note);
  };

  const cellFromClient = (clientX: number, clientY: number) => {
    const el = canvasRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    // Selalu dimensi TAMPIL — kanvas render viewCols/viewRows.
    const c = liveRef.current.viewCols;
    const r = liveRef.current.viewRows;
    const nx = ((clientX - rect.left) / rect.width) * c;
    const ny = ((clientY - rect.top) / rect.height) * r;
    // Di luar kanvas = null, jangan jepit ke tepi.
    if (nx < 0 || ny < 0 || nx >= c || ny >= r) return null;
    // EPS cegah batas float jatuh ke sel sebelumnya.
    const EPS = 1e-6;
    return { x: Math.min(c - 1, Math.floor(nx + EPS)), y: Math.min(r - 1, Math.floor(ny + EPS)) };
  };

  // Kandidat ghost dari posisi pointer sesuai mode seret.
  const candidateFor = (drag: Drag, cell: { x: number; y: number }) => {
    // Pan murni navigasi — tak pernah membangun ghost.
    if (drag.kind === "pan") return null;
    const list = liveRef.current.layout.boxes;
    const c = liveRef.current.viewCols;
    const r = liveRef.current.viewRows;
    if (drag.kind === "new") {
      const spec = BOX_SPECS[drag.type];
      return {
        cand: clampBoxToGrid(
          { x: cell.x - Math.floor(spec.defaultW / 2), y: cell.y - Math.floor(spec.defaultH / 2), w: spec.defaultW, h: spec.defaultH },
          c,
          r,
        ),
        ignoreId: undefined,
        label: spec.label,
      };
    }
    const box = list.find((b) => b.id === drag.id);
    if (!box) return null;
    if (drag.kind === "move") {
      return {
        cand: clampBoxToGrid({ x: cell.x - drag.dx, y: cell.y - drag.dy, w: box.w, h: box.h }, c, r),
        ignoreId: drag.id,
        label: BOX_SPECS[box.type].label,
      };
    }
    return {
      cand: clampBoxToGrid({ x: box.x, y: box.y, w: cell.x - drag.ox + 1, h: cell.y - drag.oy + 1 }, c, r),
      ignoreId: drag.id,
      label: BOX_SPECS[box.type].label,
    };
  };

  useEffect(() => {
    const buildGhost = (drag: Drag, clientX: number, clientY: number): Ghost | null => {
      const cell = cellFromClient(clientX, clientY);
      if (!cell) return null;
      const built = candidateFor(drag, cell);
      if (!built) return null;
      const list = liveRef.current.layout.boxes;
      const c = liveRef.current.viewCols;
      const r = liveRef.current.viewRows;
      return {
        ...built.cand,
        valid: isFree({ cols: c, rows: r, boxes: list }, built.cand, built.ignoreId),
        label: built.label,
      };
    };

    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      // Tolak pointer lain apa pun — ID harus cocok dengan yang memulai seret.
      if (e.pointerId !== drag.pointerId) return;
      if (drag.kind === "pan") {
        const dx = e.clientX - drag.startClientX;
        const dy = e.clientY - drag.startClientY;
        if (!drag.moved) {
          if (Math.hypot(dx, dy) < 4) return;
          drag.moved = true;
          setPanning(true);
        }
        const region = regionRef.current;
        if (region) {
          region.scrollLeft = drag.startSL - dx;
          region.scrollTop = drag.startST - dy;
        }
        return;
      }
      if (drag.kind === "new" && !drag.moved) {
        const threshold = e.pointerType === "touch" ? 10 : 6;
        if (Math.hypot(e.clientX - drag.startClientX, e.clientY - drag.startClientY) < threshold) return;
        drag.moved = true;
      }
      const next = buildGhost(drag, e.clientX, e.clientY);
      // Tulis sinkron agar onUp se-tick tak baca ref basi.
      ghostRef.current = next;
      setGhost(next);
    };

    const onUp = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (e.pointerId !== drag.pointerId) return;
      dragRef.current = null;
      ghostRef.current = null;
      setGhost(null);
      // Pan murni navigasi — tanpa commit, tanpa notice.
      if (drag.kind === "pan") {
        setPanning(false);
        return;
      }

      if (drag.kind === "new") {
        // Klik tanpa gerak: biarkan event click di tombol palet yang mengatur
        // mode taruh. Kalau di-arm di sini, click yang menyusul justru
        // men-toggle-nya mati (preventDefault pointerdown tidak meniadakan
        // click), dan tombol yang sama tak bisa dipakai men-toggle off.
        if (!drag.moved) return;
        // Jalur drop sungguhan — abaikan klik palet berikutnya.
        suppressUntilRef.current = Date.now() + 500;
        // Hitung segar dari koordinat lepas, jangan percaya ref.
        const g = buildGhost(drag, e.clientX, e.clientY);
        if (g?.valid) {
          const base = createBox(drag.type, g.x, g.y);
          const box = { ...base, w: g.w, h: g.h };
          commit([...liveRef.current.layout.boxes, box], `${BOX_SPECS[drag.type].label} ditambahkan.`);
          setSelectedId(box.id);
          focusBox(box.id);
        } else if (!g) {
          announce("Lepas di dalam kanvas.");
        } else {
          announce(`${BOX_SPECS[drag.type].label} tidak muat di sini — sel terisi.`);
        }
        return;
      }
      const box = liveRef.current.layout.boxes.find((b) => b.id === drag.id);
      if (!box) return;
      // Satu sumber kebenaran: kandidat segar, bukan sel mentah.
      const g = buildGhost(drag, e.clientX, e.clientY);
      if (!g || !g.valid || sameCell(g, box)) {
        setSelectedId(box.id);
        if (g && !g.valid) announce(`${BOX_SPECS[box.type].label} tidak muat di sini — sel terisi.`);
        focusBox(box.id);
        return;
      }
      commit(
        liveRef.current.layout.boxes.map((b) => (b.id === box.id ? { ...b, x: g.x, y: g.y, w: g.w, h: g.h } : b)),
        `${BOX_SPECS[box.type].label} dipindah ke kolom ${g.x + 1} baris ${g.y + 1}.`,
      );
      setSelectedId(box.id);
      focusBox(box.id);
    };

    // Batal murni: tanpa commit, tanpa suppress.
    const onCancel = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      ghostRef.current = null;
      setGhost(null);
      setPanning(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("blur", onCancel);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("blur", onCancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    ghostRef.current = ghost;
  }, [ghost]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (dragRef.current) {
        // Batalkan seret saja, pertahankan pilihan dan mode taruh.
        dragRef.current = null;
        ghostRef.current = null;
        setGhost(null);
        setPanning(false);
        suppressUntilRef.current = Date.now() + 500;
        return;
      }
      if (liveRef.current.armed) {
        setArmed(null);
        suppressUntilRef.current = Date.now() + 500;
        return;
      }
      if (liveRef.current.selectedId) setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const startPaletteDrag = (e: React.PointerEvent, type: LayoutBoxType) => {
    e.preventDefault();
    suppressUntilRef.current = 0;
    setArmed(null);
    setSelectedId(null);
    dragRef.current = { kind: "new", type, startClientX: e.clientX, startClientY: e.clientY, moved: false, pointerId: e.pointerId };
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // Abaikan — capture hanya best-effort.
    }
  };

  const onCanvasPointerDown = (e: React.PointerEvent) => {
    // Kunci fokus ke region agar keyboard langsung aktif.
    regionRef.current?.focus({ preventScroll: true });
    suppressUntilRef.current = 0;
    // Gagang dan kotak didahulukan; mode taruh hanya untuk sel kosong.
    const handle = (e.target as HTMLElement).closest("[data-resize]");
    const boxEl = (e.target as HTMLElement).closest("[data-box-id]");
    const cell = cellFromClient(e.clientX, e.clientY);

    if (handle) {
      // Gagang melayang di atas kotak terpilih (bukan di dalamnya — tombol
      // tidak boleh bersarang), jadi id diambil dari state, bukan DOM.
      if (!selected || !cell) return;
      e.preventDefault();
      e.stopPropagation();
      if (armed) setArmed(null);
      dragRef.current = { kind: "resize", id: selected.id, ox: selected.x, oy: selected.y, pointerId: e.pointerId };
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {
        // Abaikan — capture hanya best-effort.
      }
      return;
    }

    if (boxEl) {
      const id = boxEl.getAttribute("data-box-id")!;
      // Baca live agar seret beruntun tak pakai closure basi.
      const box = liveRef.current.layout.boxes.find((b) => b.id === id);
      if (!box || !cell) return;
      e.preventDefault();
      if (armed) setArmed(null);
      dragRef.current = { kind: "move", id, dx: cell.x - box.x, dy: cell.y - box.y, startCellX: cell.x, startCellY: cell.y, pointerId: e.pointerId };
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {
        // Abaikan — capture hanya best-effort.
      }
      return;
    }

    if (armed && cell) {
      e.preventDefault();
      // Baca live agar taruh beruntun tak menimpa kotak sebelumnya.
      const liveBoxes = liveRef.current.layout.boxes;
      const spec = BOX_SPECS[armed];
      const cand = clampBoxToGrid(
        { x: cell.x - Math.floor(spec.defaultW / 2), y: cell.y - Math.floor(spec.defaultH / 2), w: spec.defaultW, h: spec.defaultH },
        viewCols,
        viewRows,
      );
      if (isFree({ cols: viewCols, rows: viewRows, boxes: liveBoxes }, cand)) {
        const base = createBox(armed, cand.x, cand.y);
        const box = { ...base, w: cand.w, h: cand.h };
        commit([...liveBoxes, box], `${spec.label} ditambahkan.`);
        setSelectedId(box.id);
        setArmed(null);
        focusBox(box.id);
      } else {
        announce(`${spec.label} tidak muat di sini — sel terisi.`);
      }
      return;
    }
    if (armed && !cell) {
      announce("Lepas di dalam kanvas.");
      return;
    }

    // Latar kosong, tak bersenjata: mulai pan ala draw.io (scroll region).
    // Sentuh dikecualikan — scroll bawaan browser yang menang; pan-drag
    // hanya untuk mouse/pen. Klik tanpa gerak tetap = batal pilih.
    setSelectedId(null);
    if (e.pointerType === "touch") return;
    if (e.button === 1) e.preventDefault();
    const region = regionRef.current;
    dragRef.current = {
      kind: "pan",
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startSL: region?.scrollLeft ?? 0,
      startST: region?.scrollTop ?? 0,
      moved: false,
    };
  };

  const moveSelected = (dx: number, dy: number) => {
    // Baca live agar tekan panah cepat tak menimpa hasil sebelumnya.
    const liveBoxes = liveRef.current.layout.boxes;
    const box = liveBoxes.find((b) => b.id === selectedId);
    if (!box) return;
    const label = BOX_SPECS[box.type].label;
    const cand = clampBoxToGrid({ x: box.x + dx, y: box.y + dy, w: box.w, h: box.h }, viewCols, viewRows);
    if (sameCell(cand, box)) return;
    if (!isFree({ cols: viewCols, rows: viewRows, boxes: liveBoxes }, cand, box.id)) {
      announce(`${label} tidak muat di sini — sel terisi.`);
      return;
    }
    commit(liveBoxes.map((b) => (b.id === box.id ? { ...b, ...cand } : b)), `${label} ke kolom ${cand.x + 1} baris ${cand.y + 1}.`);
  };

  const resizeSelected = (dw: number, dh: number) => {
    // Baca live agar ubah ukuran beruntun tak pakai closure basi.
    const liveBoxes = liveRef.current.layout.boxes;
    const box = liveBoxes.find((b) => b.id === selectedId);
    if (!box) return;
    const label = BOX_SPECS[box.type].label;
    const cand = clampBoxToGrid({ x: box.x, y: box.y, w: box.w + dw, h: box.h + dh }, viewCols, viewRows);
    if (sameCell(cand, box)) return;
    if (!isFree({ cols: viewCols, rows: viewRows, boxes: liveBoxes }, cand, box.id)) {
      announce(`${label} tidak muat di sini — sel terisi.`);
      return;
    }
    commit(liveBoxes.map((b) => (b.id === box.id ? { ...b, ...cand } : b)), `${label} ke kolom ${cand.x + 1} baris ${cand.y + 1}.`);
  };

  const deleteSelected = () => {
    // Baca live; venue menyusut ikut sisa kotak (lantai DEFAULT_LAYOUT).
    const stored = liveRef.current.layout;
    const box = stored.boxes.find((b) => b.id === selectedId);
    if (!box) return;
    const rest = stored.boxes.filter((b) => b.id !== box.id);
    const shrunk: VenueLayout = {
      ...stored,
      boxes: rest,
      cols: Math.max(DEFAULT_LAYOUT.cols, 0, ...rest.map((b) => b.x + b.w)),
      rows: Math.max(DEFAULT_LAYOUT.rows, 0, ...rest.map((b) => b.y + b.h)),
    };
    liveRef.current.layout = shrunk;
    liveRef.current.onChange(shrunk);
    announce(`${BOX_SPECS[box.type].label} dihapus.`);
    setSelectedId(null);
    // Kembalikan fokus ke region.
    requestAnimationFrame(() => {
      regionRef.current?.focus({ preventScroll: true });
    });
  };

  const onBoxKeyDown = (e: React.KeyboardEvent, id: string) => {
    const box = boxes.find((b) => b.id === id);
    if (!box) return;
    // Shift+panah = ubah ukuran, panah biasa = geser.
    const resize = e.shiftKey;
    const step = (dx: number, dy: number) => {
      if (resize) resizeSelected(dx, dy);
      else moveSelected(dx, dy);
    };
    if (e.key === "ArrowLeft") { e.preventDefault(); setSelectedId(id); step(-1, 0); }
    else if (e.key === "ArrowRight") { e.preventDefault(); setSelectedId(id); step(1, 0); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedId(id); step(0, -1); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setSelectedId(id); step(0, 1); }
    else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); setSelectedId(id); deleteSelected(); }
  };

  const selected = boxes.find((b) => b.id === selectedId) ?? null;

  /**
   * Gagang ubah-ukuran mengikuti ukuran blok (~35% sisi terkecil, 12–24px)
   * dan disembunyikan bila blok lebih kecil dari 40px — gagang 24px di atas
   * kotak 1×1 menutupi seluruh isi. Keyboard (Shift+panah) tetap bisa.
   */
  const selectedMinPx = selected
    ? Math.min(selected.w, selected.h) * cellPx
    : 0;
  const handlePx =
    selectedMinPx >= 40
      ? Math.min(24, Math.max(12, Math.round(selectedMinPx * 0.35)))
      : 0;

  /**
   * Kopling denah→engine. Beban listrik sudah mengalir otomatis (lihat
   * simulator); yang tampil di sini hanya SARAN sampah + akses yang butuh
   * persetujuan eksplisit — editor tidak menulis form di belakang pengguna.
   */
  const patch = useMemo(
    () => deriveLayoutPatch(layout, participants),
    [layout, participants],
  );
  const counts = useMemo(() => countByType(layout), [layout]);
  const wasteSuggestion =
    patch.suggestedWasteBins !== null && patch.suggestedWasteBins !== wasteBins
      ? patch.suggestedWasteBins
      : null;
  const WASTE_RANK: Record<WasteBins, number> = {
    none: 0,
    mixed: 1,
    segregated: 2,
  };
  const isWasteDowngrade =
    wasteSuggestion !== null && WASTE_RANK[wasteSuggestion] < WASTE_RANK[wasteBins];
  const accessSuggestions = patch.suggestedAccessibility.filter(
    (f) => !accessibility.includes(f),
  );
  const hasLoad = patch.extraLightingKw > 0 || patch.extraSoundKw > 0;
  // Sel grid statis per dimensi tampil — memo agar zoom/seret tak bangun ulang.
  const gridCells = useMemo(
    () =>
      Array.from({ length: viewCols * viewRows }, (_, i) => (
        <div key={i} className="border-border/40 border" />
      )),
    [viewCols, viewRows],
  );

  return (
    <div ref={rootRef} className="grid gap-3">
      {/* Palet — seret ke kanvas, atau klik untuk mode taruh. */}
      <div role="group" aria-label="Palet kotak denah" className="flex flex-wrap gap-1.5">
        {LAYOUT_BOX_TYPES.map((type) => {
          const spec = BOX_SPECS[type];
          const Icon = ICONS[type];
          const active = armed === type;
          return (
            <Button
              key={type}
              type="button"
              variant={active ? "default" : "outline"}
              size="sm"
              aria-pressed={active}
              onPointerDown={(e) => startPaletteDrag(e, type)}
              onClick={() => {
                if (Date.now() < suppressUntilRef.current) {
                  suppressUntilRef.current = 0;
                  return;
                }
                setArmed((prev) => (prev === type ? null : type));
                setSelectedId(null);
              }}
              className="touch-none"
            >
              <Icon aria-hidden="true" />
              {spec.label}
            </Button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {armed
          ? `Mode taruh: klik sel kosong untuk ${BOX_SPECS[armed].label.toLowerCase()} — Esc batal.`
          : "Seret kotak dari palet ke kanvas, atau klik palet lalu klik sel. Seret latar untuk menggeser tampilan."}
      </p>

      {/* Zoom pratinjau — berlaku juga untuk presisi seret. */}
      <div className="flex items-center gap-1" role="group" aria-label="Zoom denah">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Perkecil denah (Ctrl+-)"
          onClick={() => zoomToCenter(zoomRef.current - ZOOM_STEP)}
          disabled={zoom <= MIN_ZOOM + 1e-9}
        >
          <ZoomOut aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Kembalikan zoom ke 100% (Ctrl+0)"
          onClick={() => zoomToCenter(1)}
          className="min-w-14 tabular-nums"
        >
          {Math.round(zoom * 100)}%
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Perbesar denah (Ctrl++)"
          onClick={() => zoomToCenter(zoomRef.current + ZOOM_STEP)}
          disabled={zoom >= MAX_ZOOM}
        >
          <ZoomIn aria-hidden="true" />
        </Button>
        <span className="ml-1 text-xs text-muted-foreground">
          Ctrl+roda atau Ctrl+± untuk zoom
        </span>
      </div>

      {/* Kanvas interaktif — seluruh sel tampil adalah sel sungguhan. */}
      <div
        ref={regionRef}
        role="region"
        aria-label={`Denah venue ${layout.cols} kali ${layout.rows} sel, bisa diedit — tampilan diperluas ke ${viewCols} kali ${viewRows} sel untuk mengisi layar.`}
        aria-describedby="layout-box-list"
        tabIndex={0}
        onKeyDown={(e) => {
          // Zoom ditangani listener window (berlaku di seluruh editor).
          if (e.key !== "Escape") return;
          if (dragRef.current) {
            dragRef.current = null;
            ghostRef.current = null;
            setGhost(null);
            setPanning(false);
            suppressUntilRef.current = Date.now() + 500;
          } else if (armed) {
            setArmed(null);
            suppressUntilRef.current = Date.now() + 500;
          } else {
            setSelectedId(null);
          }
          e.stopPropagation();
        }}
        className="max-h-[75vh] max-h-[75svh] overflow-auto rounded-lg border border-border [scrollbar-gutter:stable] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <div
          ref={canvasRef}
          onPointerDown={onCanvasPointerDown}
          className={cn(
            "relative touch-pan-x touch-pan-y overflow-hidden select-none",
            armed && "cursor-crosshair",
            ghost || panning ? "cursor-grabbing" : "cursor-grab",
          )}
          style={{ width: canvasW, height: canvasH }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 grid"
            style={{
              gridTemplateColumns: `repeat(${viewCols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${viewRows}, minmax(0, 1fr))`,
            }}
          >
            {gridCells}
          </div>

          <div className="absolute inset-0">
            {boxes.map((box) => {
              const spec = BOX_SPECS[box.type];
              const accent = box.type === "stage" || spec.binding !== "none";
              const Icon = ICONS[box.type];
              const isSelected = box.id === selectedId;
              return (
                <button
                  key={box.id}
                  type="button"
                  data-box-id={box.id}
                  aria-label={`${spec.label}, kolom ${box.x + 1} baris ${box.y + 1}, ${box.w} kali ${box.h} sel. Panah geser, Shift panah ubah ukuran, Delete hapus.`}
                  onFocus={() => setSelectedId(box.id)}
                  onKeyDown={(e) => onBoxKeyDown(e, box.id)}
                  className={cn(
                    "absolute flex touch-none items-center justify-center gap-0.5 overflow-hidden rounded-sm border px-0.5",
                    accent ? "box-accent" : "border-dashed",
                    // Outline selalu tampil (bukan hanya saat fokus/terpilih);
                    // yang terpilih tampil lebih tegas.
                    isSelected
                      ? "outline-2 outline-offset-1 outline-ring"
                      : "outline-1 outline-offset-0 outline-ring/40",
                  )}
                  style={{
                    left: `${(box.x / viewCols) * 100}%`,
                    top: `${(box.y / viewRows) * 100}%`,
                    width: `${(box.w / viewCols) * 100}%`,
                    height: `${(box.h / viewRows) * 100}%`,
                    borderColor: accent ? spec.colorVar : undefined,
                    ["--box-color" as string]: spec.colorVar,
                  }}
                >
                  <Icon aria-hidden="true" className="size-3 shrink-0" />
                  {box.w * box.h > 1 && (
                    <span className="truncate text-[0.6875rem] leading-none font-medium">
                      {spec.label}
                    </span>
                  )}
                </button>
              );
            })}

            {ghost && (
              <div
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute rounded-sm border-2 border-dashed",
                  ghost.valid ? "border-success" : "border-destructive",
                )}
                style={{
                  left: `${(ghost.x / viewCols) * 100}%`,
                  top: `${(ghost.y / viewRows) * 100}%`,
                  width: `${(ghost.w / viewCols) * 100}%`,
                  height: `${(ghost.h / viewRows) * 100}%`,
                }}
              />
            )}
          </div>

          {/* Gagang ubah-ukuran — di luar <button> kotak (HTML melarang tombol bersarang). */}
          {selected && handlePx > 0 && (
            <span
              data-resize
              role="presentation"
              aria-hidden="true"
              title="Seret untuk ubah ukuran"
              className="absolute z-10 touch-none rounded-sm rounded-tl-none border-2 border-background bg-foreground"
              style={{
                width: handlePx,
                height: handlePx,
                left: `calc(${((selected.x + selected.w) / viewCols) * 100}% - ${handlePx}px)`,
                top: `calc(${((selected.y + selected.h) / viewRows) * 100}% - ${handlePx}px)`,
                cursor: "nwse-resize",
              }}
            />
          )}
        </div>
      </div>

      {/* Dampak + saran denah — jujur soal apa yang otomatis vs butuh klik. */}
      {(hasLoad || wasteSuggestion || accessSuggestions.length > 0) && (
        <div className="grid gap-1.5 text-xs" role="group" aria-label="Dampak dan saran denah">
          {hasLoad && (
            <p className="text-muted-foreground tabular-nums">
              Denah menambah beban listrik: {counts.lighting > 0 && `${counts.lighting} menara (+${decimal(patch.extraLightingKw)} kW)`}
              {counts.lighting > 0 && counts.sound > 0 && " · "}
              {counts.sound > 0 && `${counts.sound} titik sound (+${decimal(patch.extraSoundKw)} kW)`} — sudah masuk hitungan energi; bersifat menambah di atas slider.
            </p>
          )}
          {wasteSuggestion && (
            <div className="flex flex-wrap items-center gap-2">
              <span>
                {isWasteDowngrade
                  ? `Cakupan stasiun kurang (${counts.wasteStation}×150 < ${participants} peserta) — denah menyarankan turun ke ${WASTE_BINS_LABELS[wasteSuggestion].toLowerCase()}.`
                  : `Denah menyarankan: ${WASTE_BINS_LABELS[wasteSuggestion].toLowerCase()}.`}
              </span>
              <Button type="button" variant="outline" size="sm" onClick={() => onApplyWaste(wasteSuggestion)}>
                Terapkan
              </Button>
            </div>
          )}
          {accessSuggestions.map((feature) => (
            <div key={feature} className="flex flex-wrap items-center gap-2">
              <span>
                {ACCESSIBILITY[feature].label} ada di denah — belum dicentang di form.
              </span>
              <Button type="button" variant="outline" size="sm" onClick={() => onApplyAccess(feature)}>
                Terapkan
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Bilah kotak terpilih. */}
      {selected && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium">{BOX_SPECS[selected.type].label}</span>
          <span className="text-muted-foreground tabular-nums">
            kolom {selected.x + 1} · baris {selected.y + 1} · {selected.w}×{selected.h} sel
          </span>
          <Button type="button" variant="outline" size="sm" onClick={deleteSelected} className="text-destructive">
            Hapus
          </Button>
          <span className="w-full text-muted-foreground sm:w-auto">
            Seret untuk pindah · panah keyboard · Shift+panah ubah ukuran · Del hapus · Esc lepas
          </span>
        </div>
      )}

      <p className="sr-only" role="status" key={noticeKey}>
        {notice}
      </p>
      <ul id="layout-box-list" className="sr-only">
        {boxes.map((box) => (
          <li key={box.id}>
            {BOX_SPECS[box.type].label} di kolom {box.x + 1} baris {box.y + 1}, lebar {box.w} tinggi {box.h} sel.
          </li>
        ))}
      </ul>
    </div>
  );
});
