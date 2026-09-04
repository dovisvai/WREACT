import { mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

/**
 * Copies the flag SVGs the app can actually display into public/flags/.
 *
 * Why these ship at all: Windows has no flag emoji glyphs, and a handful of
 * Linux setups don't either. The app's whole visual premise is that the UI stays
 * monochrome so 190 national flags carry the colour — on those platforms that
 * premise collapses into a wall of grey country codes, and shared challenge
 * links land in desktop browsers more often than anywhere else.
 *
 * Only the countries the app lists are copied, and only fetched at runtime when
 * the platform has no emoji flags, so phones — where emoji render natively —
 * download none of this.
 *
 * Run with: npm run flags
 */

const SOURCE = path.resolve('node_modules/country-flag-icons/3x2');
const OUT = path.resolve('public/flags');

/** Country codes the app offers, read from the source of truth. */
async function appCountryCodes() {
  const src = await readFile(path.resolve('src/utils/countries.ts'), 'utf8');
  const codes = new Set();
  for (const match of src.matchAll(/code:\s*'([A-Z]{2})'/g)) codes.add(match[1]);
  return codes;
}

async function main() {
  const wanted = await appCountryCodes();
  const available = new Set(
    (await readdir(SOURCE)).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4))
  );

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  let copied = 0;
  let bytes = 0;
  const missing = [];

  for (const code of wanted) {
    if (!available.has(code)) {
      missing.push(code);
      continue;
    }
    const svg = await readFile(path.join(SOURCE, `${code}.svg`), 'utf8');
    await writeFile(path.join(OUT, `${code}.svg`), svg, 'utf8');
    copied += 1;
    bytes += Buffer.byteLength(svg);
  }

  console.log(`Flags written to public/flags/`);
  console.log(`  ${copied} of ${wanted.size} countries, ${(bytes / 1024).toFixed(0)} KB total`);
  if (missing.length) {
    // Not a failure: these fall back to the country-code chip, which is legible.
    console.log(`  no artwork for: ${missing.sort().join(', ')}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
