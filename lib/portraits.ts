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
const WIKIDATA_API = process.env.WIKIDATA_API_BASE ?? 'https://www.wikidata.org/w/api.php';
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
    const timer = setTimeout(() => ctrl.abort(), 6000);
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

/** The photo shown at the top of the person's Wikipedia article. */
async function leadImage(title: string, ua: string): Promise<string | null> {
  const url = `${WIKI_API}?action=query&format=json&redirects=1&prop=pageimages&piprop=name&titles=${encodeURIComponent(title)}`;
  return (firstPage(await fetchJson(url, ua))?.pageimage as string | undefined) ?? null;
}

/** The main image Wikidata lists for the person (always a Wikimedia Commons file). */
async function wikidataImage(title: string, ua: string): Promise<string | null> {
  const url = `${WIKIDATA_API}?action=wbgetentities&format=json&sites=enwiki&normalize=1&props=claims&titles=${encodeURIComponent(title)}`;
  const json = await fetchJson(url, ua);
  const entity: any = json?.entities ? Object.values(json.entities)[0] : null;
  const claims = entity?.claims?.P18;
  if (!Array.isArray(claims) || claims.length === 0) return null;
  const best = claims.find((c: any) => c.rank === 'preferred') ?? claims[0];
  const value = best?.mainsnak?.datavalue?.value;
  return typeof value === 'string' ? value : null;
}

/** Checks the file is on Commons (files that are not free are not) and that its licence is allowed. */
async function commonsCheck(file: string, width: number, ua: string): Promise<ResolvedPortrait | null> {
  const commons =
    `${COMMONS_API}?action=query&format=json&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=${width}` +
    `&iiextmetadatafilter=LicenseShortName%7CArtist&titles=${encodeURIComponent('File:' + file)}`;
  const info = firstPage(await fetchJson(commons, ua))?.imageinfo?.[0];
  if (!info) return null;

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

/** Tries the Wikipedia lead photo first, then the Wikidata main image. First openly licensed one wins. */
async function autoLookup(title: string, width: number, ua: string): Promise<ResolvedPortrait | null> {
  const [lead, main] = await Promise.all([leadImage(title, ua), wikidataImage(title, ua)]);
  const files = [lead, main].filter((f, i, all): f is string => Boolean(f) && all.indexOf(f) === i);
  for (const file of files) {
    const ok = await commonsCheck(file, width, ua);
    if (ok) return ok;
  }
  return null;
}

const cache = new Map<string, ResolvedPortrait>();
export function clearPortraitCache() {
  cache.clear();
}

/**
 * Order of preference: disabled -> nothing; manual entry -> that photo; otherwise automatic lookup.
 * Only successes are remembered, so a slow or failed lookup is tried again next time.
 */
export async function resolvePortrait(id: string, name: string, width: number, ua: string): Promise<ResolvedPortrait | null> {
  const entry = entries[id];
  if (entry?.disabled) return null;

  const manual = manualPortrait(id);
  if (manual) {
    return { imageUrl: portraitUrl(manual, width), credit: manual.credit, license: manual.license, source: manual.source };
  }

  const title = entry?.wikipedia ?? name;
  const key = `${title}|${width}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const found = await autoLookup(title, width, ua);
  if (found) cache.set(key, found);
  return found;
}
