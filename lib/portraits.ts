import data from '../content/portraits.json';

/** Optional per-person settings in content/portraits.json. Everything is optional. */
export interface PortraitEntry {
  /** Never show a photo for this person. */
  disabled?: boolean;
  /** Wikipedia article title to look up, when it differs from the person's name. */
  wikipedia?: string;
  /** Manual choice: a Wikimedia Commons file name, or any image URL or /public path. */
  file?: string;
  url?: string;
  credit?: string;
  license?: string;
  source?: string;
}

export interface ManualPortrait {
  file?: string;
  url?: string;
  credit: string;
  license: string;
  source: string;
}

export interface ResolvedPortrait {
  imageUrl: string;
  credit: string;
  license: string;
  source: string;
}

const entries = ((data as unknown) as { portraits?: Record<string, PortraitEntry> }).portraits ?? {};

const WIKI_API = process.env.WIKI_API_BASE ?? 'https://en.wikipedia.org/w/api.php';
const COMMONS_API = process.env.COMMONS_API_BASE ?? 'https://commons.wikimedia.org/w/api.php';

// Only openly licensed images are ever shown. NC and ND licences are not accepted.
const ALLOWED = /^(public domain.*|pd([- ].*)?|cc0.*|cc by(-sa)?( [1-4]\.\d)?( (igo|[a-z]{2}))?)$/i;

export function licenseAllowed(license: string): boolean {
  return ALLOWED.test((license ?? '').trim());
}

/** A manually entered photo. Needs credit, source and an allowed licence, or it is ignored. */
export function manualPortrait(id: string): ManualPortrait | null {
  const p = entries[id];
  if (!p || !p.credit || !p.source || !p.license || !licenseAllowed(p.license)) return null;
  if (!p.file && !p.url) return null;
  return { file: p.file, url: p.url, credit: p.credit, license: p.license, source: p.source };
}

export function portraitUrl(p: ManualPortrait, width = 640): string {
  if (p.file) {
    const name = encodeURIComponent(p.file.trim().replace(/ /g, '_'));
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${name}?width=${width}`;
  }
  return (p.url ?? '').trim();
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchJson(url: string, ua: string): Promise<any | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': ua, 'Api-User-Agent': ua },
      next: { revalidate: 86400 },
    } as RequestInit);
    clearTimeout(timer);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

const firstPage = (json: any): any => (json?.query?.pages ? Object.values(json.query.pages)[0] : null);

/**
 * Finds the Wikipedia lead photo for an article, then checks on Wikimedia Commons that the file
 * exists there (files that are not free are not on Commons) and that its licence is allowed.
 */
async function autoLookup(title: string, width: number, ua: string): Promise<ResolvedPortrait | null> {
  const wiki = `${WIKI_API}?action=query&format=json&redirects=1&prop=pageimages&piprop=name&titles=${encodeURIComponent(title)}`;
  const file: string | undefined = firstPage(await fetchJson(wiki, ua))?.pageimage;
  if (!file) return null;

  const commons =
    `${COMMONS_API}?action=query&format=json&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=${width}` +
    `&iiextmetadatafilter=LicenseShortName%7CArtist&titles=${encodeURIComponent('File:' + file)}`;
  const info = firstPage(await fetchJson(commons, ua))?.imageinfo?.[0];
  if (!info) return null; // not hosted on Commons, so it is not known to be free

  const license: string = info.extmetadata?.LicenseShortName?.value ?? '';
  if (!licenseAllowed(license)) return null;

  const author = stripHtml(info.extmetadata?.Artist?.value ?? '') || 'Wikimedia Commons';
  return {
    imageUrl: info.thumburl || info.url,
    credit: author,
    license,
    source: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}`,
  };
}

const cache = new Map<string, Promise<ResolvedPortrait | null>>();
export function clearPortraitCache() {
  cache.clear();
}

/**
 * Order of preference: disabled -> nothing; manual entry -> that photo; otherwise automatic lookup.
 * Results are remembered while the server instance is warm.
 */
export function resolvePortrait(id: string, name: string, width: number, ua: string): Promise<ResolvedPortrait | null> {
  const entry = entries[id];
  if (entry?.disabled) return Promise.resolve(null);

  const manual = manualPortrait(id);
  if (manual) {
    return Promise.resolve({ imageUrl: portraitUrl(manual, width), credit: manual.credit, license: manual.license, source: manual.source });
  }

  const title = entry?.wikipedia ?? name;
  const key = `${title}|${width}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = autoLookup(title, width, ua);
    cache.set(key, hit);
  }
  return hit;
}
}
