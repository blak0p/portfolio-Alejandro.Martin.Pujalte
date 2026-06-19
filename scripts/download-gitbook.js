import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env token
let token = process.env.GITHUB_TOKEN;
if (!token) {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/^GITHUB_TOKEN=(.*)$/m);
    if (match) {
      token = match[1].trim();
    }
  }
}

if (!token) {
  console.error('Error: GITHUB_TOKEN is not set in environment or .env file.');
  process.exit(1);
}

// Target directories
const dataDir = path.join(process.cwd(), 'src/data/gitbook');
const assetsDir = path.join(process.cwd(), 'public/gitbook-assets');

async function downloadAndExtract() {
  console.log('Downloading GitBook repository zipball...');
  try {
    const response = await fetch('https://api.github.com/repos/blak0p/gitbook/zipball/main', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'portfolio-gitbook-downloader',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download zipball: ${response.status} ${response.statusText}`);
    }

    console.log('Unpacking zipball...');
    const buffer = Buffer.from(await response.arrayBuffer());
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    if (zipEntries.length === 0) {
      throw new Error('Zipball is empty');
    }

    // Determine the dynamic root folder name (e.g. blak0p-gitbook-xxxxxx/)
    const firstEntryName = zipEntries[0].entryName;
    const rootDirName = firstEntryName.split('/')[0];
    console.log(`Resolved dynamic root folder: ${rootDirName}`);

    // Clean target directories if they exist
    if (fs.existsSync(dataDir)) {
      console.log(`Cleaning ${dataDir}...`);
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
    if (fs.existsSync(assetsDir)) {
      console.log(`Cleaning ${assetsDir}...`);
      fs.rmSync(assetsDir, { recursive: true, force: true });
    }

    fs.mkdirSync(dataDir, { recursive: true });
    fs.mkdirSync(assetsDir, { recursive: true });

    let mdCount = 0;
    let assetCount = 0;

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;

      // Extract relative path within the repo
      const entryRelativePath = entry.entryName.substring(rootDirName.length + 1);
      if (!entryRelativePath) continue;

      // Skip dot files unless they are inside .gitbook/assets/
      if (path.basename(entryRelativePath).startsWith('.')) {
        if (!entryRelativePath.startsWith('.gitbook/')) {
          continue;
        }
      }

      if (entryRelativePath.endsWith('.md')) {
        const destPath = path.join(dataDir, entryRelativePath);
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.writeFileSync(destPath, entry.getData());
        mdCount++;
      } else {
        const destPath = path.join(assetsDir, entryRelativePath);
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.writeFileSync(destPath, entry.getData());
        assetCount++;
      }
    }

    console.log(`Success! Extracted ${mdCount} markdown files to ${dataDir} and ${assetCount} assets/files to ${assetsDir}.`);
  } catch (error) {
    console.error('Extraction failed:', error);
    process.exit(1);
  }
}

downloadAndExtract();
