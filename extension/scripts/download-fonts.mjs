import fs from 'fs';
import path from 'path';

const outDir = path.resolve('src/styles/fonts');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const url = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap';
const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  console.log('Fetching Google Fonts CSS...');
  const res = await fetch(url, { headers: { 'User-Agent': ua } });
  const css = await res.text();
  console.log('CSS fetched, length:', css.length);

  // Parse font blocks
  const fontFaceRegex = /@font-face\s*{([^}]+)}/g;
  let match;
  let fontIndex = 0;
  let localCss = '';

  while ((match = fontFaceRegex.exec(css)) !== null) {
    const block = match[1];
    const familyMatch = block.match(/font-family:\s*['"]?([^'";]+)['"]?/);
    const weightMatch = block.match(/font-weight:\s*(\d+)/);
    const urlMatch = block.match(/url\((https:\/\/[^)]+\.woff2)\)/);
    const unicodeMatch = block.match(/unicode-range:\s*([^;]+);/);

    if (familyMatch && weightMatch && urlMatch) {
      const family = familyMatch[1].trim();
      const weight = weightMatch[1].trim();
      const fontUrl = urlMatch[1].trim();
      const unicodeRange = unicodeMatch ? unicodeMatch[1].trim() : null;

      // Filter to latin / standard ranges if multiple, or download specific
      const safeName = `${family.replace(/\s+/g, '-')}-${weight}-${fontIndex++}.woff2`;
      const outPath = path.join(outDir, safeName);

      console.log(`Downloading ${family} (${weight}) from ${fontUrl}...`);
      const fontRes = await fetch(fontUrl);
      const buffer = Buffer.from(await fontRes.arrayBuffer());
      fs.writeFileSync(outPath, buffer);

      localCss += `@font-face {\n  font-family: '${family}';\n  font-style: normal;\n  font-weight: ${weight};\n  font-display: swap;\n  src: url('./fonts/${safeName}') format('woff2');\n${unicodeRange ? `  unicode-range: ${unicodeRange};\n` : ''}}\n\n`;
    }
  }

  fs.writeFileSync(path.join(outDir, 'fonts.css'), localCss);
  console.log('Finished downloading fonts and wrote fonts.css');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
