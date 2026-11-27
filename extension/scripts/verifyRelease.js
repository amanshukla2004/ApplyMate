/**
 * HapplyMate Production Release Verification Script
 * Validates manifest, build artifacts, icons, bundle budgets, and ZIP structure.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const extensionRoot = path.resolve(__dirname, '..');
const distDir = path.resolve(extensionRoot, 'dist');

let passedChecks = 0;
let failedChecks = 0;

function logPass(msg) {
  console.log(`  \x1b[32m✔\x1b[0m ${msg}`);
  passedChecks++;
}

function logFail(msg) {
  console.error(`  \x1b[31m✖\x1b[0m ${msg}`);
  failedChecks++;
}

function parseZipEntries(zipBuffer) {
  const entries = [];
  // Scan backwards for End of Central Directory (EOCD) signature 0x06054b50
  let eocdOffset = -1;
  for (let i = zipBuffer.length - 22; i >= Math.max(0, zipBuffer.length - 65557); i--) {
    if (zipBuffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error('Invalid ZIP archive: End of Central Directory record not found.');
  }

  const totalEntries = zipBuffer.readUInt16LE(eocdOffset + 10);
  const cdOffset = zipBuffer.readUInt32LE(eocdOffset + 16);

  let cur = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (zipBuffer.readUInt32LE(cur) !== 0x02014b50) {
      break;
    }
    const compressedSize = zipBuffer.readUInt32LE(cur + 20);
    const uncompressedSize = zipBuffer.readUInt32LE(cur + 24);
    const fnLen = zipBuffer.readUInt16LE(cur + 28);
    const extraLen = zipBuffer.readUInt16LE(cur + 30);
    const commentLen = zipBuffer.readUInt16LE(cur + 32);

    const filename = zipBuffer.toString('utf8', cur + 46, cur + 46 + fnLen);
    entries.push({ filename, compressedSize, uncompressedSize });

    cur += 46 + fnLen + extraLen + commentLen;
  }

  return entries;
}

console.log('\n\x1b[1m\x1b[34m========================================\x1b[0m');
console.log('\x1b[1m\x1b[34m     happlied Release Verification      \x1b[0m');
console.log('\x1b[1m\x1b[34m========================================\x1b[0m\n');

// 1. Verify dist directory exists
if (!fs.existsSync(distDir)) {
  logFail(`Distribution directory does not exist: ${distDir}`);
  process.exit(1);
} else {
  logPass('Distribution directory (dist/) exists');
}

// 2. Verify dist/manifest.json
const manifestPath = path.join(distDir, 'manifest.json');
let manifest = null;
if (!fs.existsSync(manifestPath)) {
  logFail('dist/manifest.json is missing');
} else {
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    manifest = JSON.parse(raw);
    logPass('dist/manifest.json is valid JSON');

    // Manifest V3 check
    if (manifest.manifest_version === 3) {
      logPass('Manifest version is 3 (MV3 compliant)');
    } else {
      logFail(`Expected manifest_version: 3, found ${manifest.manifest_version}`);
    }

    // Version format
    if (/^\d+\.\d+\.\d+$/.test(manifest.version)) {
      logPass(`Version string is valid semver: ${manifest.version}`);
    } else {
      logFail(`Invalid version format: ${manifest.version}`);
    }

    // Name & Description
    if (
      manifest.name &&
      (manifest.name.toLowerCase().includes('happlied') ||
        manifest.name.toLowerCase().includes('happlymate') ||
        manifest.name.toLowerCase().includes('applymate'))
    ) {
      logPass(`Name matches brand identity: "${manifest.name}"`);
    } else {
      logFail(`Manifest name does not match happlied / HapplyMate: "${manifest.name}"`);
    }

    // Content Security Policy
    if (manifest.content_security_policy?.extension_pages) {
      logPass('Declared explicit extension_pages CSP');
    } else {
      logFail('Missing extension_pages CSP in manifest.json');
    }

    // Icons check
    const iconSizes = ['16', '32', '48', '128'];
    let allIconsExist = true;
    for (const size of iconSizes) {
      const relPath = manifest.icons?.[size];
      if (!relPath) {
        logFail(`Manifest icons.${size} is not declared`);
        allIconsExist = false;
        continue;
      }
      const fullIconPath = path.join(distDir, relPath);
      if (!fs.existsSync(fullIconPath) || fs.statSync(fullIconPath).size === 0) {
        logFail(`Icon file missing or empty: ${relPath}`);
        allIconsExist = false;
      }
    }
    if (allIconsExist) {
      logPass('All required icons (16, 32, 48, 128) exist in dist/ and are non-empty');
    }

    // Entry points check
    const entryPoints = [
      { name: 'Background service worker', path: manifest.background?.service_worker },
      { name: 'Sidepanel page', path: manifest.side_panel?.default_path },
      { name: 'Popup page', path: manifest.action?.default_popup },
      { name: 'Options page', path: manifest.options_ui?.page },
    ];
    for (const ep of entryPoints) {
      if (!ep.path) {
        logFail(`Manifest missing declaration for: ${ep.name}`);
      } else {
        const fullPath = path.join(distDir, ep.path);
        if (fs.existsSync(fullPath)) {
          logPass(`${ep.name} exists: ${ep.path}`);
        } else {
          logFail(`${ep.name} points to non-existent file: ${ep.path}`);
        }
      }
    }

    // Content scripts
    if (Array.isArray(manifest.content_scripts) && manifest.content_scripts.length > 0) {
      const csFiles = manifest.content_scripts[0].js || [];
      for (const cs of csFiles) {
        const fullPath = path.join(distDir, cs);
        if (fs.existsSync(fullPath)) {
          const stats = fs.statSync(fullPath);
          logPass(`Content script exists: ${cs} (${(stats.size / 1024).toFixed(1)} kB)`);
        } else {
          logFail(`Content script file missing: ${cs}`);
        }
      }
    } else {
      logFail('No content_scripts declared in manifest.json');
    }
  } catch (err) {
    logFail(`Failed to parse dist/manifest.json: ${err.message}`);
  }
}

// 3. Scan dist/ for leaks (no .ts, .tsx, .map, node_modules)
function scanDir(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(scanDir(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

const allDistFiles = scanDir(distDir);
const leakedFiles = allDistFiles.filter((f) => {
  const ext = path.extname(f).toLowerCase();
  return ext === '.ts' || ext === '.tsx' || ext === '.map' || f.includes('node_modules');
});

if (leakedFiles.length === 0) {
  logPass(`Zero source code leaks in dist/ (${allDistFiles.length} files scanned)`);
} else {
  logFail(`Development files leaked into dist/: ${leakedFiles.join(', ')}`);
}

// 4. Verify ZIP packages if they exist
const zipNames = ['happlied.zip', 'happlymate.zip', 'applymate.zip'];
for (const zipName of zipNames) {
  const zipPath = path.join(extensionRoot, zipName);
  if (fs.existsSync(zipPath)) {
    const stats = fs.statSync(zipPath);
    const sizeMB = stats.size / (1024 * 1024);
    if (sizeMB < 5.0) {
      logPass(`${zipName} package size is optimal: ${sizeMB.toFixed(2)} MB (< 5.0 MB limit)`);
    } else {
      logFail(`${zipName} package size exceeds 5.0 MB: ${sizeMB.toFixed(2)} MB`);
    }

    try {
      const buf = fs.readFileSync(zipPath);
      const entries = parseZipEntries(buf);
      const rootManifest = entries.find((e) => e.filename === 'manifest.json' || e.filename === './manifest.json');
      const nestedManifest = entries.find((e) => e.filename === 'dist/manifest.json');

      if (rootManifest && !nestedManifest) {
        logPass(`${zipName} has manifest.json directly at root (Chrome Web Store compliant)`);
      } else if (nestedManifest) {
        logFail(`${zipName} has manifest.json inside dist/ folder instead of root`);
      } else {
        logFail(`${zipName} does not contain manifest.json at root`);
      }

      // Check for leaked files inside the zip
      const leakedZipEntries = entries.filter((e) => {
        const lower = e.filename.toLowerCase();
        return lower.endsWith('.ts') || lower.endsWith('.tsx') || lower.endsWith('.map') || lower.includes('.git');
      });
      if (leakedZipEntries.length === 0) {
        logPass(`${zipName} contains zero source code leaks (${entries.length} entries verified)`);
      } else {
        logFail(`${zipName} contains leaked files: ${leakedZipEntries.map((e) => e.filename).join(', ')}`);
      }
    } catch (err) {
      logFail(`Failed to inspect ${zipName} ZIP headers: ${err.message}`);
    }
  } else {
    console.log(`  \x1b[33mℹ\x1b[0m Note: ${zipName} not generated yet. Run 'npm run package' to test ZIP integrity.`);
  }
}

// Summary
console.log('\n----------------------------------------');
console.log(`Result: \x1b[32m${passedChecks} passed\x1b[0m, \x1b[${failedChecks > 0 ? '31' : '32'}m${failedChecks} failed\x1b[0m`);
console.log('----------------------------------------\n');

if (failedChecks > 0) {
  process.exit(1);
} else {
  console.log('\x1b[32m✔ Extension is 100% production-ready for Chrome Web Store release!\x1b[0m\n');
  process.exit(0);
}
