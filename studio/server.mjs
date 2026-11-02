import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCaseStudy, serializeCaseStudy, parsePhotography, serializePhotography } from './parser.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SITE_DIR = path.resolve(__dirname, '..');
const ROOT_DIR = path.resolve(SITE_DIR, '..');
const PORT = process.env.STUDIO_PORT || 3333;

const PROJECT_DIRS = {
  'loyalty-and-strategy': { publicDir: 'lnp', rawDir: 'LNP', title: 'Omnichannel Loyalty & Strategy' },
  'point-of-sale': { publicDir: 'pos', rawDir: 'Point of Sale', title: 'Next-Gen Point of Sale' },
  'specialty-pharmacy': { publicDir: 'sprx', rawDir: 'SPRx', title: 'Specialty Pharmacy & Clinical AI' },
  'design-systems': { publicDir: 'dse', rawDir: 'DSE', title: 'Enterprise Design Systems' },
  'creative-direction': { publicDir: 'creative-direction', rawDir: 'Creative Direction', title: 'Creative Direction & Brand' },
  'furniture-design': { publicDir: 'furniture', rawDir: 'Furniture', title: 'Furniture & Object Design' },
  'photography': { publicDir: 'photography', rawDir: '', title: 'Photography Work' },
  'ux-research': { publicDir: 'uxr', rawDir: 'UXR', title: 'UX Research & Testing' },
};

const STAGED_FILE = path.join(SITE_DIR, '.studio_staged.json');
const STAGED_MD = path.join(ROOT_DIR, 'STAGED_CHANGES.md');

function loadStagedLog() {
  if (fs.existsSync(STAGED_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STAGED_FILE, 'utf8'));
    } catch (e) {
      return { updates: [] };
    }
  }
  return { updates: [] };
}

function recordStagedChange(entry) {
  const log = loadStagedLog();
  log.updates.unshift({
    timestamp: new Date().toISOString(),
    ...entry,
  });
  // Keep last 50 entries
  if (log.updates.length > 50) log.updates = log.updates.slice(0, 50);
  fs.writeFileSync(STAGED_FILE, JSON.stringify(log, null, 2), 'utf8');

  // Also write human-readable STAGED_CHANGES.md for easy review
  let md = `# Visual Studio - Staged Changes Log\n\n`;
  md += `*Last updated: ${new Date().toLocaleString()}*\n\n`;
  md += `These changes were made visually via the Studio interface and are ready for review or git commit.\n\n`;
  for (const u of log.updates.slice(0, 15)) {
    md += `### ${u.title || u.slug} (${new Date(u.timestamp).toLocaleTimeString()})\n`;
    md += `- **Slug:** \`${u.slug}\`\n`;
    md += `- **Action:** ${u.summary || 'Image layout updated'}\n`;
    if (u.imageCount) md += `- **Total Images:** ${u.imageCount}\n`;
    md += `\n`;
  }
  fs.writeFileSync(STAGED_MD, md, 'utf8');
}

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Scan image files in a folder recursively or shallowly
function scanImagesInDir(dirPath, maxDepth = 2, currentDepth = 0) {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const results = [];
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dirPath, e.name);
    if (e.isDirectory() && currentDepth < maxDepth) {
      results.push(...scanImagesInDir(full, maxDepth, currentDepth + 1));
    } else if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].includes(ext)) {
        const stat = fs.statSync(full);
        results.push({
          name: e.name,
          fullPath: full,
          ext,
          size: stat.size,
          mtime: stat.mtime,
        });
      }
    }
  }
  return results;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Enable CORS for local convenience
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- API: List Projects ---
  if (method === 'GET' && pathname === '/api/projects') {
    const projectsDir = path.join(SITE_DIR, 'src/pages/projects');
    const files = fs.readdirSync(projectsDir).filter((f) => f.endsWith('.astro'));
    const list = files.map((file) => {
      const slug = file.replace('.astro', '');
      const meta = PROJECT_DIRS[slug] || { title: slug };
      const raw = fs.readFileSync(path.join(projectsDir, file), 'utf8');

      let imageCount = 0;
      let groupCount = 0;
      if (slug === 'photography') {
        const photoData = parsePhotography(raw);
        imageCount = photoData.photos.length;
        groupCount = 1;
      } else {
        const parsed = parseCaseStudy(raw);
        const imgGroups = (parsed.blocks || []).filter((s) => s.type === 'image-group');
        groupCount = imgGroups.length;
        imageCount = imgGroups.reduce((acc, g) => acc + g.images.length, 0);
      }

      return {
        slug,
        title: meta.title || slug,
        publicDir: meta.publicDir || '',
        rawDir: meta.rawDir || '',
        imageCount,
        groupCount,
      };
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, projects: list }));
    return;
  }

  // --- API: Get Single Project Content ---
  if (method === 'GET' && pathname.startsWith('/api/project/')) {
    const slug = pathname.replace('/api/project/', '').trim();
    const filePath = path.join(SITE_DIR, 'src/pages/projects', `${slug}.astro`);
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Project not found' }));
      return;
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const meta = PROJECT_DIRS[slug] || { title: slug };

    if (slug === 'photography') {
      const parsed = parsePhotography(raw);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: true,
          slug,
          isPhotography: true,
          title: meta.title,
          photos: parsed.photos,
        })
      );
      return;
    }

    const parsed = parseCaseStudy(raw);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        slug,
        isPhotography: false,
        title: meta.title,
        blocks: parsed.blocks,
      })
    );
    return;
  }

  // --- API: Save Project Content ---
  if (method === 'POST' && pathname.startsWith('/api/project/') && pathname.endsWith('/save')) {
    const slug = pathname.replace('/api/project/', '').replace('/save', '').trim();
    const filePath = path.join(SITE_DIR, 'src/pages/projects', `${slug}.astro`);

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Project not found' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const originalRaw = fs.readFileSync(filePath, 'utf8');
        let newContent = '';

        if (slug === 'photography') {
          newContent = serializePhotography(originalRaw, payload.photos || []);
          recordStagedChange({
            slug,
            title: PROJECT_DIRS[slug]?.title || slug,
            summary: `Updated photography gallery (${payload.photos?.length || 0} photos)`,
            imageCount: payload.photos?.length || 0,
          });
        } else {
          const parsed = parseCaseStudy(originalRaw);
          const blocks = payload.blocks || payload.sections || [];
          newContent = serializeCaseStudy(parsed.wrapperStart, parsed.wrapperEnd, blocks);
          const imgCount = blocks
            .filter((s) => s.type === 'image-group')
            .reduce((acc, g) => acc + (g.images?.length || 0), 0);
          recordStagedChange({
            slug,
            title: PROJECT_DIRS[slug]?.title || slug,
            summary: `Updated ${blocks.length} blocks (${imgCount} images)`,
            imageCount: imgCount,
          });
        }

        // Write backup before saving
        const backupDir = path.join(SITE_DIR, '.studio_backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        fs.writeFileSync(path.join(backupDir, `${slug}.${Date.now()}.bak.astro`), originalRaw, 'utf8');

        // Write new content to project page
        fs.writeFileSync(filePath, newContent, 'utf8');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, message: `Successfully saved ${slug}.astro` }));
      } catch (err) {
        console.error('Save error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // --- API: Browse Assets (Workspace folders + Site images) ---
  if (method === 'GET' && pathname === '/api/assets') {
    const rawFolders = [
      'Creative Direction',
      'Point of Sale',
      'LNP',
      'DSE',
      'Furniture',
      'Headshots',
      'SPRx',
      'UXR',
    ];

    const assets = [];

    // Scan raw root folders
    for (const folder of rawFolders) {
      const folderPath = path.join(ROOT_DIR, folder);
      if (fs.existsSync(folderPath)) {
        const imgs = scanImagesInDir(folderPath);
        for (const img of imgs) {
          const relPath = path.relative(ROOT_DIR, img.fullPath);
          assets.push({
            name: img.name,
            folder,
            category: 'Raw Workspace Assets',
            relPath,
            previewUrl: `/api/raw-image?path=${encodeURIComponent(relPath)}`,
            isRaw: true,
            size: img.size,
          });
        }
      }
    }

    // Scan site/public/images/
    const publicImagesDir = path.join(SITE_DIR, 'public/images');
    if (fs.existsSync(publicImagesDir)) {
      const publicImgs = scanImagesInDir(publicImagesDir);
      for (const img of publicImgs) {
        const relToPublic = path.relative(path.join(SITE_DIR, 'public'), img.fullPath);
        assets.push({
          name: img.name,
          folder: path.dirname(relToPublic).replace(/^images\/?/, '') || 'root',
          category: 'Site Public Library',
          relPath: relToPublic,
          publicUrl: `/${relToPublic}`,
          previewUrl: `/${relToPublic}`,
          isRaw: false,
          size: img.size,
        });
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, assets }));
    return;
  }

  // --- API: Serve Raw Image for Preview ---
  if (method === 'GET' && pathname === '/api/raw-image') {
    const relPath = parsedUrl.searchParams.get('path');
    if (!relPath) {
      res.writeHead(400);
      res.end('Missing path');
      return;
    }
    const safePath = path.resolve(ROOT_DIR, relPath);
    if (!safePath.startsWith(ROOT_DIR) || !fs.existsSync(safePath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(safePath).pipe(res);
    return;
  }

  // --- API: Upload or Copy Asset to Site ---
  if (method === 'POST' && pathname === '/api/upload') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { project, filename, base64Data, rawPath } = payload;
        const projectMeta = PROJECT_DIRS[project] || { publicDir: 'general' };
        const destDir = path.join(SITE_DIR, 'public/images', projectMeta.publicDir || 'general');
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

        const safeFilename = (filename || 'image.png').replace(/[^a-zA-Z0-9._-]/g, '_');
        const destPath = path.join(destDir, safeFilename);

        if (base64Data) {
          const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
          fs.writeFileSync(destPath, buffer);
        } else if (rawPath) {
          const srcPath = path.resolve(ROOT_DIR, rawPath);
          if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, destPath);
          } else {
            throw new Error(`Source raw file not found: ${rawPath}`);
          }
        } else {
          throw new Error('No data provided to upload');
        }

        const publicUrl = `/images/${projectMeta.publicDir || 'general'}/${safeFilename}`;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, src: publicUrl, filename: safeFilename }));
      } catch (err) {
        console.error('Upload error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // --- API: Get Staged Changes ---
  if (method === 'GET' && pathname === '/api/staged') {
    const log = loadStagedLog();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, ...log }));
    return;
  }

  // --- Static Files: Serve Public Images directly if requested ---
  if (pathname.startsWith('/images/')) {
    const publicPath = path.join(SITE_DIR, 'public', pathname);
    if (fs.existsSync(publicPath) && fs.statSync(publicPath).isFile()) {
      const ext = path.extname(publicPath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      fs.createReadStream(publicPath).pipe(res);
      return;
    }
  }

  // --- Serve Studio UI from site/studio/public ---
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/html' });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // Fallback to index.html for SPA
  const indexHtml = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(indexHtml).pipe(res);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🎨 CharlieHV Portfolio Visual Studio is live!`);
  console.log(`👉 Open: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
