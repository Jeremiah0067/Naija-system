import test from 'node:test';
import assert from 'node:assert/strict';

test('portraits: diagnosis explains why a photo is or is not shown', async () => {
  const { diagnosePortrait } = await import('../lib/portraits');
  const realFetch = globalThis.fetch;
  const lead: Record<string, string> = { Good: 'Good.jpg', Locked: 'Locked.jpg', Local: 'Local.jpg' };
  const commons: Record<string, any> = {
    'File:Good.jpg': { imageinfo: [{ thumburl: 'https://x/g.jpg', extmetadata: { LicenseShortName: { value: 'Public domain' }, Artist: { value: 'Archive' } } }] },
    'File:Locked.jpg': { imageinfo: [{ thumburl: 'https://x/l.jpg', extmetadata: { LicenseShortName: { value: 'CC BY-NC 4.0' } } }] },
  };
  globalThis.fetch = (async (input: any) => {
    const u = new URL(String(input));
    const titles = u.searchParams.get('titles') ?? '';
    if (u.host.includes('wikidata')) return new Response(JSON.stringify({ entities: { '-1': { missing: '' } } }), { status: 200 });
    const body = u.host.includes('wikipedia')
      ? { query: { pages: { '1': { pageimage: lead[titles] } } } }
      : { query: { pages: { '2': commons[titles] ?? { missing: '' } } } };
    return new Response(JSON.stringify(body), { status: 200 });
  }) as any;
  try {
    const good = await diagnosePortrait('qq-1', 'Good', 300, 't');
    assert.equal(good.found?.license, 'Public domain');
    const locked = await diagnosePortrait('qq-2', 'Locked', 300, 't');
    assert.equal(locked.found, null);
    assert.match(locked.notes.join(' '), /not open enough/);
    const local = await diagnosePortrait('qq-3', 'Local', 300, 't');
    assert.match(local.notes.join(' '), /not on Wikimedia Commons/);
    const none = await diagnosePortrait('qq-4', 'Nobody', 300, 't');
    assert.match(none.notes.join(' '), /no article or no lead photo/);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('portraits: falls back to the Wikidata image when the Wikipedia lead photo is not free', async () => {
  const { resolvePortrait, clearPortraitCache } = await import('../lib/portraits');
  clearPortraitCache();
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: any) => {
    const u = new URL(String(input));
    const titles = u.searchParams.get('titles') ?? '';
    if (u.host.includes('wikidata')) {
      return new Response(JSON.stringify({ entities: { Q1: { claims: { P18: [{ mainsnak: { datavalue: { value: 'Free.jpg' } } }] } } } }), { status: 200 });
    }
    if (u.host.includes('wikipedia')) return new Response(JSON.stringify({ query: { pages: { '1': { pageimage: 'Locked.jpg' } } } }), { status: 200 });
    const pages: Record<string, any> = {
      'File:Locked.jpg': { imageinfo: [{ thumburl: 'https://x/l.jpg', extmetadata: { LicenseShortName: { value: 'CC BY-NC 4.0' } } }] },
      'File:Free.jpg': { imageinfo: [{ thumburl: 'https://x/f.jpg', extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' }, Artist: { value: 'Someone' } } }] },
    };
    return new Response(JSON.stringify({ query: { pages: { '2': pages[titles] ?? { missing: '' } } } }), { status: 200 });
  }) as any;
  try {
    const hit = await resolvePortrait('zz-1', 'Fallback Person', 300, 't');
    assert.equal(hit?.license, 'CC BY-SA 4.0');
    assert.equal(hit?.imageUrl, 'https://x/f.jpg');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('portraits: suggests free Commons files for people with no photo, and only free ones', async () => {
  const { findPortraitCandidates } = await import('../lib/portraits');
  const realFetch = globalThis.fetch;
  const infos: Record<string, any> = {
    'File:Okpara portrait.jpg': { imageinfo: [{ thumburl: 'https://x/o1.jpg', extmetadata: { LicenseShortName: { value: 'Public domain' }, Artist: { value: 'Archive' } } }] },
    'File:Okpara locked.jpg': { imageinfo: [{ thumburl: 'https://x/o2.jpg', extmetadata: { LicenseShortName: { value: 'CC BY-NC 4.0' } } }] },
  };
  globalThis.fetch = (async (input: any) => {
    const u = new URL(String(input));
    if (u.searchParams.get('list') === 'search') {
      const titles = ['File:Okpara portrait.jpg', 'File:Unrelated.jpg', 'File:Okpara document.pdf', 'File:Okpara locked.jpg'];
      return new Response(JSON.stringify({ query: { search: titles.map((title) => ({ title })) } }), { status: 200 });
    }
    const t = u.searchParams.get('titles') ?? '';
    return new Response(JSON.stringify({ query: { pages: { '2': infos[t] ?? { missing: '' } } } }), { status: 200 });
  }) as any;
  try {
    const found = await findPortraitCandidates('Michael Okpara', 300, 't');
    assert.deepEqual(found.map((c) => c.file), ['Okpara portrait.jpg']);
    assert.equal(found[0].portrait.license, 'Public domain');
    const none = await findPortraitCandidates('Mo', 300, 't');
    assert.equal(none.length, 0);
  } finally {
    globalThis.fetch = realFetch;
  }
});
