// Renders public/og.png (1200x630), the social preview image. Run with `npm run generate:og`.
// Colours mirror the @theme tokens in src/styles/global.css.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import cv from '../cv.json' with { type: 'json' };

const PAGE = '#11110f';
const INK = '#eceae2';
const INK_2 = '#a9a79c';
const ACCENT = '#f0a93a';

const WIDTH = 1200;
const HEIGHT = 630;

const name = cv.basics.name;
const role = '.NET Developer & AWS Solutions Architect';
const host = new URL(cv.basics.url || 'https://brylex-it.pl').hostname;

const escapeXml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${PAGE}"/>
  <rect x="80" y="150" width="64" height="8" rx="2" fill="${ACCENT}"/>
  <text x="80" y="290" font-family="Chakra Petch, Segoe UI, Arial, sans-serif" font-size="96" font-weight="600" fill="${INK}">${escapeXml(name)}</text>
  <text x="80" y="370" font-family="Chakra Petch, Segoe UI, Arial, sans-serif" font-size="40" fill="${INK_2}">${escapeXml(role)}</text>
  <text x="80" y="560" font-family="JetBrains Mono, Consolas, monospace" font-size="26" letter-spacing="3" fill="${ACCENT}">${escapeXml(host.toUpperCase())}</text>
</svg>`;

const output = fileURLToPath(new URL('../public/og.png', import.meta.url));
writeFileSync(output, await sharp(Buffer.from(svg)).png().toBuffer());
console.log(`Wrote ${output}`);
