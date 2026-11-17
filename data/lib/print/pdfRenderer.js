"use client";

const RENDERED_CACHE = new Map();
const IN_FLIGHT = new Map();

let pdfjsPromise = null;

const PDFJS_CDN_BASE = "https://unpkg.com/pdfjs-dist@4.10.38/";

async function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist/build/pdf.mjs").then((pdfjs) => {

      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

export function getFileSourceUrl(file) {
  if (file?.key) {
    return `/api/files/proxy?key=${encodeURIComponent(file.key)}`;
  }
  return file?.url || "";
}

export function isPdfCached(file) {
  return RENDERED_CACHE.has(file?.url || file?.key || "");
}

export function clearPdfRenderCache() {
  RENDERED_CACHE.clear();
}

export async function renderPdfPagesToImages(file, { maxPages = 30 } = {}) {
  const cacheKey = file?.url || file?.key || "";
  if (!cacheKey) throw new Error("File has no URL or key");

  if (RENDERED_CACHE.has(cacheKey)) return RENDERED_CACHE.get(cacheKey);
  if (IN_FLIGHT.has(cacheKey)) return IN_FLIGHT.get(cacheKey);

  const promise = (async () => {
    const pdfjs = await loadPdfJs();
    const sourceUrl = getFileSourceUrl(file);

    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file (${response.status})`);
    }
    const data = new Uint8Array(await response.arrayBuffer());

    const pdf = await pdfjs.getDocument({
      data,
      isEvalSupported: false,
      standardFontDataUrl: `${PDFJS_CDN_BASE}standard_fonts/`,
      cMapUrl: `${PDFJS_CDN_BASE}cmaps/`,
      cMapPacked: true,
    }).promise;

    const pages = [];
    const totalPages = Math.min(pdf.numPages, maxPages);
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);

      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(
        2,
        Math.max(1, 2000 / Math.max(base.width, base.height)),
      );
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      const context = canvas.getContext("2d");
      await page.render({
        canvasContext: context,
        viewport,
        background: "#ffffff",
      }).promise;

      pages.push(canvas.toDataURL("image/jpeg", 0.8));
    }

    RENDERED_CACHE.set(cacheKey, pages);
    return pages;
  })();

  IN_FLIGHT.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    IN_FLIGHT.delete(cacheKey);
  }
}

