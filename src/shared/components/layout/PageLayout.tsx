/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { ReactNode } from 'react';
import { Header } from '../navigation/Header';

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
  transparentHeader?: boolean;
}

export function PageLayout({
  children,
  className = '',
  transparentHeader = false,
}: PageLayoutProps) {
  return (
    <div className={`min-h-screen bg-white ${className}`}>
      <Header transparent={transparentHeader} />
      <main className="pt-16">{children}</main>
    </div>
  );
}
