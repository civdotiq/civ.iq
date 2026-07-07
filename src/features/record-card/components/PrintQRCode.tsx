/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

/**
 * QR wrapper for the Record Card print one-pager. Client component because
 * qrcode.react uses forwardRef (same pattern as the district civic pack).
 */

import { QRCodeSVG } from 'qrcode.react';

export function PrintQRCode({ url, size = 96 }: { url: string; size?: number }) {
  return <QRCodeSVG value={url} size={size} level="M" />;
}
