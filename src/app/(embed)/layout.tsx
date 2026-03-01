/**
 * Embed Layout - Minimal layout for embeddable widgets
 * No header, footer, or navigation. Just the widget content.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata, Viewport } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: {
    default: 'CIV.IQ Widget',
    template: '%s | CIV.IQ',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/fonts/BraunLinear-Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="bg-white m-0 p-0">
        {children}
        {/* postMessage height to parent for auto-resizing iframes */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function sendHeight() {
                  var height = document.documentElement.scrollHeight;
                  window.parent.postMessage({ type: 'civiq-embed-resize', height: height }, '*');
                }
                sendHeight();
                new ResizeObserver(sendHeight).observe(document.body);
                window.addEventListener('load', sendHeight);
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
