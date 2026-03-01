/**
 * QR Code wrapper for print pages.
 * Client component required because qrcode.react uses forwardRef.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { QRCodeSVG } from 'qrcode.react';

interface QRCodeProps {
  url: string;
  size?: number;
}

export function QRCode({ url, size = 72 }: QRCodeProps) {
  return <QRCodeSVG value={url} size={size} level="M" />;
}
