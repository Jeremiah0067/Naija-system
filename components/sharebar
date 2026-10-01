'use client';

import { useEffect, useState } from 'react';

export default function ShareBar({ persona }: { persona: string }) {
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setUrl(window.location.href);
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  const text = `I got "${persona}" on Naija Axes. Where do you stand?`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link', url);
    }
  }

  async function share() {
    try {
      await navigator.share({ title: 'Naija Axes', text, url });
    } catch {
      /* user cancelled */
    }
  }

  return (
    <div className="row">
      <button className="btn" onClick={copy} disabled={!url}>
        {copied ? 'Link copied' : 'Copy my result link'}
      </button>
      <a className="btn quiet" href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noopener noreferrer">
        Share on WhatsApp
      </a>
      {canShare && (
        <button className="btn quiet" onClick={share}>
          More ways to share
        </button>
      )}
    </div>
  );
}
