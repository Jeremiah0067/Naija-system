import type { Metadata, Viewport } from 'next';
import './globals.css';

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: 'Naija Axes: where do you stand?',
  description:
    'A free, anonymous 10-axis quiz on Nigerian politics. See your profile, meet the figures you resemble, and test your knowledge of Nigerian history.',
  openGraph: {
    title: 'Naija Axes: where do you stand?',
    description: 'Take the 10-axis Nigerian political quiz. No login, no names.',
    type: 'website',
  },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#FFC61A' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Instrument+Sans:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <div className="stripe" aria-hidden="true" />
        <div className="shell">
          <header className="masthead">
            <a href="/" className="brand">Naija Axes</a>
            <span className="tagline">Anonymous. No login. Just your answers.</span>
          </header>
          <main id="main">{children}</main>
          <footer className="foot">
            <p>
              Naija Axes is a tool for reflection, not a poll and not a verdict on who is right. Results describe
              quiz takers only. Figure and party profiles are drafts built from public records and are still being
              verified.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
