/**
 * Build 32-page PDF from story plan (same layout as frontend).
 * Uses sharp for crop/split of 16:9 scenes, jsPDF for PDF.
 */
import sharp from 'sharp';
import { jsPDF } from 'jspdf';

const PAGE_W = 576;
const PAGE_H = 1024;
const COVER_SIZE = 576;
const COVER_Y = (PAGE_H - COVER_SIZE) / 2;

/**
 * Crop 16:9 image to 2:1 (center crop) then split into [left, right] 1:1.
 * @param {Buffer} imageBuffer
 * @returns {Promise<[string, string]>} base64 JPEG data URLs for left and right
 */
async function cropAndSplitToPages(imageBuffer) {
  const meta = await sharp(imageBuffer).metadata();
  const w = meta.width || 1024;
  const h = meta.height || 576;
  const targetRatio = 2;
  let cropW = w;
  let cropH = h;
  let left = 0;
  let top = 0;
  if (w / h > targetRatio) {
    cropW = Math.round(h * targetRatio);
    left = Math.round((w - cropW) / 2);
  } else {
    cropH = Math.round(w / targetRatio);
    top = Math.round((h - cropH) / 2);
  }
  const cropped = await sharp(imageBuffer)
    .extract({ left, top, width: cropW, height: cropH })
    .jpeg({ quality: 95 })
    .toBuffer();
  const halfW = Math.floor(cropW / 2);
  const leftBuf = await sharp(cropped)
    .extract({ left: 0, top: 0, width: halfW, height: cropH })
    .jpeg({ quality: 95 })
    .toBuffer();
  const rightBuf = await sharp(cropped)
    .extract({ left: halfW, top: 0, width: halfW, height: cropH })
    .jpeg({ quality: 95 })
    .toBuffer();
  return [
    'data:image/jpeg;base64,' + leftBuf.toString('base64'),
    'data:image/jpeg;base64,' + rightBuf.toString('base64'),
  ];
}

function dataUrlToBase64(dataUrl) {
  if (!dataUrl) return null;
  const i = dataUrl.indexOf(',');
  return i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
}

/**
 * @param {object} plan - { synopsis, scenes: [{ imageUrl, splitImages?, ... }] }
 * @param {string} buyerName - for filename
 * @param {boolean} isRTL - e.g. language === 'Arabic'
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function buildPdf(plan, buyerName = 'Livre', isRTL = false) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [PAGE_W, PAGE_H],
  });

  const scenes = plan.scenes || [];
  if (scenes.length < 17) throw new Error('Plan must have 17 scenes');

  // Page 1: Front cover (scene 0)
  const frontCover = scenes[0].imageUrl;
  if (frontCover) {
    doc.addImage(dataUrlToBase64(frontCover), 'JPEG', 0, COVER_Y, COVER_SIZE, COVER_SIZE);
  }

  // Pages 2-31: Scenes 1-15, each split into left + right
  for (let i = 1; i <= 15; i++) {
    const scene = scenes[i];
    let leftImg = null;
    let rightImg = null;
    if (scene.splitImages && scene.splitImages.length === 2) {
      leftImg = scene.splitImages[0];
      rightImg = scene.splitImages[1];
    } else if (scene.imageUrl) {
      const buf = Buffer.from(dataUrlToBase64(scene.imageUrl), 'base64');
      const [left, right] = await cropAndSplitToPages(buf);
      leftImg = left;
      rightImg = right;
    }
    if (leftImg && rightImg) {
      doc.addPage([PAGE_W, PAGE_H]);
      if (isRTL) {
        doc.addImage(dataUrlToBase64(rightImg), 'JPEG', 0, COVER_Y, COVER_SIZE, COVER_SIZE);
        doc.addPage([PAGE_W, PAGE_H]);
        doc.addImage(dataUrlToBase64(leftImg), 'JPEG', 0, COVER_Y, COVER_SIZE, COVER_SIZE);
      } else {
        doc.addImage(dataUrlToBase64(leftImg), 'JPEG', 0, COVER_Y, COVER_SIZE, COVER_SIZE);
        doc.addPage([PAGE_W, PAGE_H]);
        doc.addImage(dataUrlToBase64(rightImg), 'JPEG', 0, COVER_Y, COVER_SIZE, COVER_SIZE);
      }
    }
  }

  // Page 32: Back cover (scene 16)
  doc.addPage([PAGE_W, PAGE_H]);
  const backCover = scenes[16].imageUrl;
  if (backCover) {
    doc.addImage(dataUrlToBase64(backCover), 'JPEG', 0, COVER_Y, COVER_SIZE, COVER_SIZE);
  }

  return Buffer.from(doc.output('arraybuffer'));
}
