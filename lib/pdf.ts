import fs from "fs";
import { fromPath } from "pdf2pic";
import Tesseract from "tesseract.js";
import PDFDocument from "pdfkit";

// ESM FIX for pdf-parse
import * as pdfParse from "pdf-parse";

export type PDF2PicPage = {
  name: string;
  size: number;
  path: string;
};

async function convertPageToImage(filePath: string, tempDir: string, pageNumber: number): Promise<PDF2PicPage> {
  const storeAsImage = fromPath(filePath, { density: 150, savePath: tempDir });
  const rawPage = await storeAsImage(pageNumber);

  return {
    path: rawPage.path ?? "",
    name: rawPage.name ?? `page-${pageNumber}.png`,
    size: typeof rawPage.size === "number" ? rawPage.size : 0
  };
}

export async function extractTextFromPDF(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);

  // Correct ESM call
  const data = await (pdfParse as any)(buffer);

  let text = data.text?.trim() ?? "";

  // If PDF text too short → fallback to OCR
  if (!text || text.length < 20) {
    const tempDir = "./temp_images";
    fs.mkdirSync(tempDir, { recursive: true });

    text = "";
    const pageCount = typeof data.numpages === "number" ? data.numpages : 1;

    for (let i = 1; i <= pageCount; i++) {
      const page = await convertPageToImage(filePath, tempDir, i);

      const {
        data: { text: ocrText },
      } = await Tesseract.recognize(page.path, "eng");

      text += ocrText + "\n";
    }

    fs.rmSync(tempDir, { recursive: true, force: true });
    text = text.trim();
  }

  return text;
}

export async function generateSummaryPDF(summaryText: string, fileName: string): Promise<string> {
  const dir = "public/summaries";
  fs.mkdirSync(dir, { recursive: true });
  const filePath = `${dir}/${fileName}-summary.pdf`;

  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(filePath));
  doc.fontSize(12).text(summaryText, { lineGap: 4 });
  doc.end();

  return `/summaries/${fileName}-summary.pdf`;
}
