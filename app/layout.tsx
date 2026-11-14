import type { Metadata, Viewport } from 'next';
import { Fraunces, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const serif = Fraunces({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-serif' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'JWT Decoder | APIVerve Template',
  description: 'Paste a JSON Web Token and read its header, claims and expiry in plain words. An APIVerve template.'
};

export const viewport: Viewport = {
  themeColor: '#f6f1e7'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
