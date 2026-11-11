// Generates the app icons from the mark in src/components/logo.tsx.
// Run: npm i --no-save sharp && node scripts/make-icons.mjs
import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const shapes = `
    <path d="M1.5 28 L11.2 5.2 Q11.6 4.2 12.7 4.2 H17.1 Q18.2 4.2 18.7 5.2 L22.3 12.5 L18.5 15.2 L15.2 9.4 L7.6 28 Z" fill="#f3f8f5"/>
    <path d="M10.6 28 C13.6 21.4 20.4 15.6 30.5 13.6" fill="none" stroke="#e9a23b" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M15.2 25 L18.2 23.3 V28 H15.2 Z M19.9 22.3 L22.9 20.6 V28 H19.9 Z M24.6 19.7 L27.6 18.2 V28 H24.6 Z" fill="#f3f8f5"/>`;

// The mark is 30 wide and 23.8 tall on its grid; centre it at the given scale.
const mark = (maskable) => {
  const scale = maskable ? 8.6 : 11;
  const x = (512 - 30 * scale) / 2 - 1.5 * scale;
  const y = (512 - 23.8 * scale) / 2 - 4.2 * scale;
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${maskable ? 0 : 112}" fill="#124a3c"/>
  <g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scale})">${shapes}
  </g>
</svg>`;
};

await writeFile("src/app/icon.svg", mark(false).trim() + "\n");
await sharp(Buffer.from(mark(false))).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(Buffer.from(mark(false))).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(Buffer.from(mark(true))).resize(512, 512).png().toFile("public/icons/icon-maskable-512.png");
await sharp(Buffer.from(mark(true))).resize(180, 180).png().toFile("src/app/apple-icon.png");
console.log("icons written");
