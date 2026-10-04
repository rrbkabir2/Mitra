import type { Metadata, Viewport } from 'next';
import './globals.css';
import { MitraProvider } from '@/context/MitraContext';
import { Header } from '@/components/Header';
import { MobileNav } from '@/components/MobileNav';

export const metadata: Metadata = {
  title: 'Mitra — Permanent Delivery Confirmation Trust Layer',
  description:
    'A tamper-proof trust layer between households and local vendors. Permanent, jointly confirmed daily milk and grocery records with seamless WhatsApp integration.',
  keywords: [
    'Mitra',
    'milk delivery tracker',
    'delivery confirmation',
    'trust layer',
    'WhatsApp Business API',
    'dairy ledger',
    'tamper proof records',
  ],
  authors: [{ name: 'Mitra Trust Platform' }],
  robots: 'noindex, nofollow', // Protected household platform
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563eb',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <MitraProvider>
          <div className="mitra-app">
            <Header />
            {children}
            <MobileNav />
          </div>
        </MitraProvider>
      </body>
    </html>
  );
}
