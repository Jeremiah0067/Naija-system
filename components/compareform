'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

function extractCode(input: string): string | null {
  const trimmed = input.trim();
  const fromUrl = trimmed.match(/[?&]a=(\d+)/);
  if (fromUrl) return fromUrl[1];
  return /^\d+$/.test(trimmed) ? trimmed : null;
}

export default function CompareForm({ myCode }: { myCode: string }) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    const friend = extractCode(value);
    if (!friend) {
      setError('That does not look like a Naija Axes result link. Paste the full link your friend copied.');
      return;
    }
    router.push(`/compare?me=${myCode}&friend=${friend}`);
  }

  return (
    <div className="spaced">
      <label className="field" htmlFor="friend-link">
        Paste your friend&apos;s result link
        <input id="friend-link" className="field-input" value={value} onChange={(e) => { setValue(e.target.value); setError(''); }} placeholder="https://.../results?a=..." inputMode="url" />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn" onClick={submit}>Compare with my friend</button>
    </div>
  );
}
