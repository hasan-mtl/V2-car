import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ORIGIN = 'https://topauto.innov8up.com/';
const SITE_HOST = new URL(ORIGIN).hostname;
const OUT_DIR = process.cwd();
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

const allowedHosts = new Set([
  SITE_HOST,
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.trustindex.io',
  'lh3.googleusercontent.com',
  's.w.org',
]);

const textLike = new Set([
  '.css',
  '.html',
  '.htm',
  '.js',
  '.json',
  '.mjs',
  '.svg',
  '.txt',
  '.xml',
]);

const extensionByType = [
  [/text\/html/i, '.html'],
  [/text\/css/i, '.css'],
  [/(application|text)\/(x-)?javascript/i, '.js'],
  [/application\/json/i, '.json'],
  [/image\/svg\+xml/i, '.svg'],
  [/image\/jpeg/i, '.jpg'],
  [/image\/png/i, '.png'],
  [/image\/webp/i, '.webp'],
  [/image\/gif/i, '.gif'],
  [/video\/mp4/i, '.mp4'],
  [/font\/woff2/i, '.woff2'],
  [/font\/woff/i, '.woff'],
  [/application\/font-woff2/i, '.woff2'],
  [/application\/font-woff/i, '.woff'],
  [/application\/octet-stream/i, '.bin'],
];

const downloadInfo = new Map();
const localPathOwners = new Map();
const queue = [];
const queued = new Set();
const failures = [];

const runtimeAssets = [
  '/wp-content/plugins/elementor/assets/js/lightbox.570c05c5a283cfb6b223.bundle.min.js',
  '/wp-content/plugins/elementor/assets/js/397f2d183c19202777d6.bundle.min.js',
  '/wp-content/plugins/elementor/assets/js/shared-frontend-handlers.03caa53373b56d3bab67.bundle.min.js',
  '/wp-content/plugins/elementor/assets/js/text-editor.45609661e409413f1cef.bundle.min.js',
  '/wp-content/plugins/elementor/assets/js/counter.12335f45aaa79d244f24.bundle.min.js',
  '/wp-content/plugins/elementor/assets/lib/dialog/dialog.min.js?ver=4.9.3',
  '/wp-content/plugins/elementor/assets/lib/share-link/share-link.min.js?ver=4.0.5',
  '/wp-content/plugins/elementor/assets/css/conditionals/dialog.min.css?ver=4.0.5',
  '/wp-content/plugins/elementor/assets/css/conditionals/lightbox.min.css?ver=4.0.5',
  '/wp-content/plugins/pro-elements/assets/js/nav-menu.8521a0597c50611efdc6.bundle.min.js',
  '/wp-content/plugins/pro-elements/assets/js/gallery.06be1c07b9901f53d709.bundle.min.js',
  '/wp-content/plugins/pro-elements/assets/js/nested-carousel.db797a097fdc5532ef4a.bundle.min.js',
  '/wp-content/plugins/pro-elements/assets/js/popup.f7b15b2ca565b152bf98.bundle.min.js',
  '/wp-content/plugins/pro-elements/assets/js/form.71055747203b48a65a24.bundle.min.js',
];

function hash(value) {
  return createHash('sha1').update(value).digest('hex').slice(0, 10);
}

function decodeEntities(value) {
  return value
    .replace(/&#0*38;/gi, '&')
    .replace(/&amp;/gi, '&')
    .replace(/&#x2F;/gi, '/')
    .replace(/&#47;/g, '/')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}

function cleanCandidate(value) {
  const decoded = decodeEntities(value).replace(/\\\//g, '/').replace(/^['"\s]+/, '');
  const stop = decoded.search(/["'<>\s)]/);
  const clipped = stop > 0 ? decoded.slice(0, stop) : decoded;
  return clipped.replace(/[,;}\]]+$/g, '');
}

function normalizeUrl(value, base = ORIGIN) {
  if (!value) return null;
  const raw = cleanCandidate(value);
  if (
    !raw ||
    raw.startsWith('#') ||
    raw.startsWith('data:') ||
    raw.startsWith('mailto:') ||
    raw.startsWith('tel:') ||
    raw.startsWith('javascript:')
  ) {
    return null;
  }

  try {
    const url = new URL(raw, base);
    url.hash = '';
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url;
  } catch {
    return null;
  }
}

function shouldDownload(url) {
  if (!allowedHosts.has(url.hostname)) return false;

  if (url.hostname === SITE_HOST) {
    if (url.pathname === '/' || url.pathname === '') return !url.search;
    if (url.pathname.endsWith('/')) return false;
    if (url.pathname.includes('/revisions')) return false;

    const decodedPath = decodeURIComponent(url.pathname);
    if (/[{},$+]/.test(decodedPath)) return false;

    const ext = path.posix.extname(decodedPath);
    if (
      (url.pathname.startsWith('/wp-content/') ||
        url.pathname.startsWith('/wp-includes/') ||
        url.pathname.startsWith('/wp-admin/')) &&
      !ext
    ) {
      return false;
    }

    return (
      url.pathname.startsWith('/wp-content/') ||
      url.pathname.startsWith('/wp-includes/') ||
      url.pathname.startsWith('/wp-json/wp/v2/pages/11') ||
      url.pathname.startsWith('/wp-admin/images/')
    );
  }

  if (url.hostname === 'fonts.googleapis.com') return url.pathname === '/css';
  if (url.hostname === 'fonts.gstatic.com') return true;
  if (url.hostname === 'lh3.googleusercontent.com') return true;
  if (url.hostname === 's.w.org') return !url.pathname.endsWith('/');
  if (url.hostname === 'cdn.trustindex.io') {
    return url.pathname === '/loader.js' || url.pathname.startsWith('/assets/');
  }

  return true;
}

function canonical(url) {
  const next = new URL(url.toString());
  next.hash = '';
  return next.toString();
}

function enqueue(url, base) {
  const normalized = typeof url === 'string' ? normalizeUrl(url, base) : url;
  if (!normalized || !shouldDownload(normalized)) return;

  const key = canonical(normalized);
  if (queued.has(key)) return;
  queued.add(key);
  queue.push(normalized);
}

function safePathSegment(segment) {
  return segment
    .replace(/[<>:"|?*\u0000-\u001F]/g, '_')
    .replace(/\\/g, '_')
    .replace(/\s+/g, '%20');
}

function extensionFromContentType(contentType) {
  for (const [pattern, ext] of extensionByType) {
    if (pattern.test(contentType)) return ext;
  }
  return '';
}

function localPathFor(url, contentType) {
  const extFromType = extensionFromContentType(contentType || '');
  let pathname = decodeURIComponent(url.pathname);

  if (url.hostname === SITE_HOST && (pathname === '/' || pathname === '')) {
    return 'index.html';
  }

  if (url.hostname === 'fonts.googleapis.com') {
    return `external/fonts.googleapis.com/css/${hash(url.search || pathname)}.css`;
  }

  const hostPrefix = url.hostname === SITE_HOST ? '' : `external/${url.hostname}/`;
  if (pathname.endsWith('/')) pathname += 'index';
  if (!pathname || pathname === '/') pathname = '/index';

  const parts = pathname
    .replace(/^\/+/, '')
    .split('/')
    .filter(Boolean)
    .map(safePathSegment);

  let filename = parts.pop() || 'index';
  let ext = path.posix.extname(filename);

  if (!ext && extFromType) {
    filename += extFromType;
    ext = extFromType;
  }

  const queryKey = url.search && !/^(\?ver=|\?v=|\?display=)/i.test(url.search) ? `__${hash(url.search)}` : '';
  if (queryKey) {
    if (ext) filename = `${filename.slice(0, -ext.length)}${queryKey}${ext}`;
    else filename = `${filename}${queryKey}`;
  }

  return path.posix.join(hostPrefix, ...parts, filename);
}

function uniqueLocalPath(basePath, key) {
  const owner = localPathOwners.get(basePath);
  if (!owner || owner === key) {
    localPathOwners.set(basePath, key);
    return basePath;
  }

  const ext = path.posix.extname(basePath);
  const withHash = ext
    ? `${basePath.slice(0, -ext.length)}__${hash(key)}${ext}`
    : `${basePath}__${hash(key)}`;
  localPathOwners.set(withHash, key);
  return withHash;
}

function isTextFile(localPath, contentType) {
  return (
    /^(text\/|application\/(json|javascript)|image\/svg\+xml)/i.test(contentType || '') ||
    textLike.has(path.posix.extname(localPath).toLowerCase())
  );
}

function extractUrls(text, baseUrl) {
  const urls = new Set();
  const source = decodeEntities(text).replace(/\\\//g, '/');
  const baseExt = path.posix.extname(new URL(baseUrl).pathname).toLowerCase();

  const absolute = /https?:\/\/[^"'<>\\\s)]+/gi;
  for (const match of source.matchAll(absolute)) {
    const url = normalizeUrl(match[0], baseUrl);
    if (url) urls.add(url.toString());
  }

  if (!['.js', '.mjs'].includes(baseExt)) {
    const cssUrl = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
    for (const match of source.matchAll(cssUrl)) {
      const url = normalizeUrl(match[2], baseUrl);
      if (url) urls.add(url.toString());
    }
  }

  const attrUrl = /\b(src|href|poster|data-imgurl|data-src|data-bg|data-background|data-lazy-src|srcset|data-srcset)\s*=\s*(['"])(.*?)\2/gi;
  for (const match of source.matchAll(attrUrl)) {
    const attr = match[1].toLowerCase();
    const values = attr.includes('srcset') ? match[3].split(/\s*,\s*/) : [match[3]];
    for (const value of values) {
      const url = normalizeUrl(value.split(/\s+/)[0], baseUrl);
      if (url) urls.add(url.toString());
    }
  }

  return [...urls].map(value => new URL(value));
}

async function fetchWithRetry(url, attempts = 3) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'user-agent': USER_AGENT,
          accept: '*/*',
        },
      });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
    }
  }
  throw lastError;
}

async function download(url) {
  const key = canonical(url);
  if (downloadInfo.has(key)) return downloadInfo.get(key);

  const response = await fetchWithRetry(url);
  const contentType = response.headers.get('content-type') || '';
  const localPath = uniqueLocalPath(localPathFor(url, contentType), key);
  const absolutePath = path.join(OUT_DIR, localPath);
  const buffer = Buffer.from(await response.arrayBuffer());

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);

  const info = {
    key,
    url: url.toString(),
    baseUrl: url.toString(),
    localPath,
    absolutePath,
    contentType,
    text: isTextFile(localPath, contentType),
  };
  downloadInfo.set(key, info);

  if (info.text) {
    const text = buffer.toString('utf8');
    for (const next of extractUrls(text, url.toString())) enqueue(next);
  }

  return info;
}

function relativeUrl(fromLocalPath, toLocalPath) {
  let rel = path.posix.relative(path.posix.dirname(fromLocalPath), toLocalPath);
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel;
}

function replacementFor(rawUrl, fromLocalPath) {
  const url = normalizeUrl(rawUrl);
  if (!url) return null;

  const exact = downloadInfo.get(canonical(url));
  if (exact) return relativeUrl(fromLocalPath, exact.localPath);

  if (url.hostname === SITE_HOST) {
    if (url.pathname === '/' || url.pathname === '') return relativeUrl(fromLocalPath, 'index.html');

    const directoryish = url.pathname.endsWith('/');
    if (
      directoryish ||
      url.pathname.startsWith('/wp-content/') ||
      url.pathname.startsWith('/wp-includes/') ||
      url.pathname.startsWith('/wp-json/') ||
      url.pathname.startsWith('/wp-admin/')
    ) {
      const local = url.pathname.replace(/^\/+/, '');
      let rel = relativeUrl(fromLocalPath, local);
      if (directoryish && !rel.endsWith('/')) rel += '/';
      return rel;
    }
  }

  return null;
}

function rewriteText(text, fromLocalPath) {
  let out = text;
  const absoluteUrl = /https?:\\?\/\\?\/(?:(?!&quot;|&#0*34;|&#x22;)[^"'<>\\\s)]|\\\/)+/gi;

  out = out.replace(absoluteUrl, match => {
    const replacement = replacementFor(match, fromLocalPath);
    if (!replacement) return match;
    return match.includes('\\/') ? replacement.replace(/\//g, '\\/') : replacement;
  });

  out = out.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (full, quote, value) => {
    const replacement = replacementFor(value, fromLocalPath);
    return replacement ? `url(${quote}${replacement}${quote})` : full;
  });

  out = out
    .replace(/\.\/index\.html\/(wp-content|wp-includes|wp-json|wp-admin)\//g, './$1/')
    .replace(/\.\\\/index\.html\\\/(wp-content|wp-includes|wp-json|wp-admin)\\\//g, '.\\/$1\\/');

  return out;
}

function injectStaticHelpers(html) {
  if (html.includes('data-local-clone-helper')) return html;

  const helper = `
<script data-local-clone-helper>
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('trustindex-image').forEach(function (node) {
    if (node.querySelector('img')) return;
    var img = document.createElement('img');
    img.src = node.getAttribute('data-imgurl') || '';
    img.alt = node.getAttribute('alt') || '';
    img.loading = node.getAttribute('loading') || 'lazy';
    ['width', 'height', 'class'].forEach(function (name) {
      var value = node.getAttribute(name);
      if (value) img.setAttribute(name, value);
    });
    node.replaceWith(img);
  });
});
</script>`;

  return html.replace('</body>', `${helper}\n</body>`);
}

async function rewriteDownloadedTextFiles() {
  for (const info of downloadInfo.values()) {
    if (!info.text) continue;
    let text = await readFile(info.absolutePath, 'utf8');
    text = rewriteText(text, info.localPath);

    if (info.localPath === 'index.html') {
      text = injectStaticHelpers(text);
    }

    await writeFile(info.absolutePath, text);
  }
}

async function main() {
  for (const target of [
    'index.html',
    'wp-content',
    'wp-includes',
    'wp-json',
    'wp-admin',
    'external',
  ]) {
    try {
      await rm(path.join(OUT_DIR, target), { recursive: true, force: true });
    } catch {}
  }

  enqueue(new URL(ORIGIN));
  for (const asset of runtimeAssets) enqueue(new URL(asset, ORIGIN));

  while (queue.length) {
    const url = queue.shift();
    try {
      const info = await download(url);
      console.log(`saved ${info.localPath}`);
    } catch (error) {
      failures.push(`${url.toString()} -> ${error.message}`);
      console.warn(`failed ${url.toString()} (${error.message})`);
    }
  }

  await rewriteDownloadedTextFiles();

  const totals = { files: downloadInfo.size, failures: failures.length };
  try {
    const rootStat = await stat(path.join(OUT_DIR, 'index.html'));
    totals.indexBytes = rootStat.size;
  } catch {}

  await writeFile(
    path.join(OUT_DIR, 'scrape-manifest.json'),
    JSON.stringify(
      {
        source: ORIGIN,
        createdAt: new Date().toISOString(),
        totals,
        files: [...downloadInfo.values()].map(({ url, localPath, contentType }) => ({
          url,
          localPath,
          contentType,
        })),
        failures,
      },
      null,
      2,
    ),
  );

  console.log(JSON.stringify(totals, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
