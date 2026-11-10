// Generates the app icons from one SVG. Run: node scripts/make-icons.mjs
import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const mark = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${pad ? 0 : 112}" fill="#124a3c"/>
  <g transform="translate(${pad ? 136 : 112} ${pad ? 136 : 112}) scale(${pad ? 7.5 : 9})" fill="none" stroke-linecap="round" stroke-width="3">
    <circle cx="7" cy="25" r="3" fill="#f3f8f5"/>
    <path d="M7 14.5A10.5 10.5 0 0 1 17.5 25" stroke="#f3f8f5"/>
    <path d="M7 6.5A18.5 18.5 0 0 1 25.5 25" stroke="#e9a23b"/>
  </g>
</svg>`;

await writeFile("src/app/icon.svg", mark(false).trim() + "\n");
await sharp(Buffer.from(mark(false))).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(Buffer.from(mark(false))).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(Buffer.from(mark(true))).resize(512, 512).png().toFile("public/icons/icon-maskable-512.png");
await sharp(Buffer.from(mark(true))).resize(180, 180).png().toFile("src/app/apple-icon.png");
console.log("icons written");
