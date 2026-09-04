import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

/**
 * Generates the source brand assets that @capacitor/assets expands into every
 * platform size.
 *
 * The mark is drawn as geometry rather than set as type, deliberately: rendering
 * text through sharp depends on whichever fonts happen to be installed on the
 * build machine, so a CI box without Barlow Condensed would silently ship a
 * different icon. Vector paths render identically everywhere.
 *
 * Run with: npm run brand
 */

const OUT = path.resolve('assets');

const PITCH = '#0a0f13';
const SIGNAL = '#00e87a';

/**
 * The mark: a hard angular W that doubles as a reaction trace — the same
 * zigzag a response-time chart draws. Stroked rather than filled so the weight
 * stays even at every size.
 */
function markPath(size, { inset = 0.245, weightRatio = 0.092 } = {}) {
  const left = size * inset;
  const right = size * (1 - inset);
  const width = right - left;

  // Slightly above optical centre; a W is bottom-heavy so it needs lifting.
  const top = size * 0.33;
  const bottom = size * 0.675;
  const midPeak = top + (bottom - top) * 0.24;

  const points = [
    [left, top],
    [left + width * 0.25, bottom],
    [size / 2, midPeak],
    [right - width * 0.25, bottom],
    [right, top],
  ];

  const d = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');

  return `<path d="${d}" fill="none" stroke="${SIGNAL}" stroke-width="${(
    size * weightRatio
  ).toFixed(1)}" stroke-linecap="butt" stroke-linejoin="miter" />`;
}

/** A single pool of signal light, the same treatment the share card uses. */
function glow(size, id = 'glow', opacity = 0.5) {
  return `
    <defs>
      <radialGradient id="${id}" cx="50%" cy="46%" r="52%">
        <stop offset="0%" stop-color="${SIGNAL}" stop-opacity="${opacity}" />
        <stop offset="100%" stop-color="${SIGNAL}" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#${id})" />`;
}

function iconSvg(size, { withBackground = true, inset = 0.22 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${withBackground ? `<rect width="${size}" height="${size}" fill="${PITCH}" />` : ''}
  ${withBackground ? glow(size, 'glow', 0.42) : ''}
  ${markPath(size, { inset })}
</svg>`;
}

function splashSvg(width, height, { light = false } = {}) {
  // The mark sits small and centred; a splash is a held breath, not a poster.
  const markBox = Math.min(width, height) * 0.26;
  const x = (width - markBox) / 2;
  const y = (height - markBox) / 2;
  const ground = light ? '#f3f6f8' : PITCH;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${ground}" />
  ${
    light
      ? ''
      : `<defs>
      <radialGradient id="sglow" cx="50%" cy="50%" r="34%">
        <stop offset="0%" stop-color="${SIGNAL}" stop-opacity="0.16" />
        <stop offset="100%" stop-color="${SIGNAL}" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#sglow)" />`
  }
  <g transform="translate(${x} ${y})">
    ${markPath(markBox, { inset: 0.04, weightRatio: 0.13 })}
  </g>
</svg>`;
}

async function render(svg, file, width, height = width) {
  const target = path.join(OUT, file);
  await sharp(Buffer.from(svg)).resize(width, height).png().toFile(target);
  return `${file}  ${width}x${height}`;
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const written = [];

  // Full-bleed icon — iOS and the square Android fallback.
  written.push(await render(iconSvg(1024), 'icon.png', 1024));
  written.push(await render(iconSvg(1024), 'icon-only.png', 1024));

  // Android adaptive icons composite two layers and crop hard, so the mark is
  // inset further to survive a circular or squircle mask.
  written.push(
    await render(iconSvg(1024, { withBackground: false, inset: 0.3 }), 'icon-foreground.png', 1024)
  );
  written.push(
    await render(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
         <rect width="1024" height="1024" fill="${PITCH}" />
         ${glow(1024, 'bgglow', 0.3)}
       </svg>`,
      'icon-background.png',
      1024
    )
  );

  written.push(await render(splashSvg(2732, 2732), 'splash.png', 2732));
  written.push(await render(splashSvg(2732, 2732), 'splash-dark.png', 2732));

  // A wide social card for the store listing and link previews.
  written.push(await render(splashSvg(1200, 630), 'og-image.png', 1200, 630));

  console.log('Brand assets written to assets/');
  for (const line of written) console.log('  ' + line);

  // Keep an editable master beside the output.
  await writeFile(path.join(OUT, 'icon.svg'), iconSvg(1024), 'utf8');
  console.log('  icon.svg  (editable master)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
