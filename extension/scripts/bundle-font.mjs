import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const extRoot = path.resolve(__dirname, '..');

const fontPath = path.join(extRoot, 'src/styles/fonts/DancingScript-700.woff2');
if (!fs.existsSync(fontPath)) {
  console.error('Font not found at', fontPath);
  process.exit(1);
}

const fontBuf = fs.readFileSync(fontPath);
const b64 = fontBuf.toString('base64');
console.log('DancingScript woff2 size:', fontBuf.length, 'bytes. Base64 length:', b64.length);

const outContent = `// Auto-generated self-contained Dancing Script font for Shadow DOM content script
export const DANCING_SCRIPT_BASE64 = '${b64}';
`;

const outPath = path.join(extRoot, 'src/content/dancingScriptBase64.ts');
fs.writeFileSync(outPath, outContent);
console.log('Successfully wrote', outPath);
