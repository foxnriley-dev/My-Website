import { BRAND } from '@ife/domain';
import { themeCss } from '@ife/design-tokens';
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: BRAND.productName, template: `%s · ${BRAND.productName}` },
  description: BRAND.tagline,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F3F2EE' },
    { media: '(prefers-color-scheme: dark)', color: '#0F1114' },
  ],
};

// Applies a saved light/dark choice before paint (no flash). "system" removes the attribute.
const themeBoot = `try{var t=localStorage.getItem('ife-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-US" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCss() }} />
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className="min-h-dvh antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
