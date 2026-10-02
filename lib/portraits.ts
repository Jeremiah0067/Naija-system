import data from '../content/portraits.json';

export interface Portrait {
  /** Wikimedia Commons file name without the "File:" prefix. The easiest option. */
  file?: string;
  /** Any other image URL, or a path under /public such as /people/aminu-kano.jpg */
  url?: string;
  credit: string;
  license: string;
  /** Page where the licence can be checked, such as the Commons file page. */
  source: string;
}

const entries = ((data as unknown) as { portraits?: Record<string, Portrait> }).portraits ?? {};

// Only openly licensed images are ever shown. NC and ND licences are not accepted.
const ALLOWED = /^(public domain|cc0( 1\.0)?|cc by( [1-4]\.\d)?|cc by-sa( [1-4]\.\d)?)$/i;

export function licenseAllowed(license: string): boolean {
  return ALLOWED.test((license ?? '').trim());
}

export function getPortrait(id: string): Portrait | null {
  const p = entries[id];
  if (!p || !p.credit || !p.source || !licenseAllowed(p.license)) return null;
  if (!p.file && !p.url) return null;
  return p;
}

export function portraitUrl(p: Portrait, width = 640): string {
  if (p.file) {
    const name = encodeURIComponent(p.file.trim().replace(/ /g, '_'));
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${name}?width=${width}`;
  }
  return (p.url ?? '').trim();
}
