/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CiviqLogo } from '@/shared/ui/CiviqLogo';
import { MobileNav } from './MobileNav';

interface HeaderProps {
  className?: string;
  transparent?: boolean;
}

const navigation = [
  { name: 'Representatives', href: '/representatives' },
  { name: 'Districts', href: '/districts' },
  { name: 'Committees', href: '/committees' },
  { name: 'About', href: '/about' },
];

export function Header({ className = '', transparent = false }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const headerClasses = transparent
    ? 'aicher-card/95 backdrop-blur-md'
    : 'aicher-card aicher-no-radius';

  return (
    <header className={`fixed top-0 w-full ${headerClasses} z-50 ${className}`}>
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="transform transition-all duration-300 group-hover:scale-105">
            <div className="w-8 h-12">
              <CiviqLogo />
            </div>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navigation.map(item => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`aicher-heading-wide relative transition-all duration-200 after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-[#3ea2d4] after:transition-all after:duration-200 hover:after:w-full ${
                  isActive ? 'text-[#3ea2d4] after:w-full' : 'text-gray-700 hover:text-[#3ea2d4]'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="aicher-button md:hidden flex items-center justify-center w-10 h-10 text-gray-700 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle mobile menu"
          aria-expanded={mobileMenuOpen}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        navigation={navigation}
        currentPath={pathname}
      />
    </header>
  );
}
