import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Pure parsing logic lives in statementParser.js (unit-tested in Node).
export {
  parseTransactions,
  findDuplicates,
  analyzeSpending,
  detectStatementPeriod,
  tryParseDate,
  tryParseAmount,
  categorize,
} from "./statementParser.js";

if (pdfjsWorkerUrl) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
}

const PDF_OPTS = { useSystemFonts: true, disableAutoFetch: true, isEvalSupported: false };

async function loadPDF(arrayBuffer) {
  try {
    return await pdfjsLib.getDocument({ data: arrayBuffer, ...PDF_OPTS }).promise;
  } catch (_) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "";
    return await pdfjsLib.getDocument({ data: arrayBuffer, ...PDF_OPTS }).promise;
  }
}

// Returns the PDF as an array of "rows"; each row is an array of { text, x, y, w }
// cells grouped by vertical position and ordered left→right.
export async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await loadPDF(arrayBuffer);

  const allRows = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const items = content.items
      .filter((it) => it.str && it.str.trim())
      .map((it) => ({
        text: it.str.trim(),
        x: Math.round(it.transform[4]),
        y: Math.round(it.transform[5]),
        w: it.width || 0,
      }));

    const rowMap = {};
    for (const item of items) {
      const yKey = Math.round(item.y / 4) * 4;
      if (!rowMap[yKey]) rowMap[yKey] = [];
      rowMap[yKey].push(item);
    }

    const sortedYs = Object.keys(rowMap).map(Number).sort((a, b) => b - a);
    for (const y of sortedYs) {
      const row = rowMap[y].sort((a, b) => a.x - b.x);
      allRows.push(row);
    }
  }
  return allRows;
}
