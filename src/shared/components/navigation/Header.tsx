/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CiviqLogo } from '@/shared/ui/CiviqLogo';
import { MobileNav } from './MobileNav';

interface HeaderProps {
  className?: string;
  transparent?: boolean;
}

interface NavDropdownItem {
  name: string;
  href: string;
}

interface NavSection {
  name: string;
  items: NavDropdownItem[];
}

// Navigation structure organized by government level
const navigationSections: NavSection[] = [
  {
    name: 'Federal',
    items: [
      { name: 'Representatives', href: '/representatives' },
      { name: 'Districts', href: '/districts' },
      { name: 'Committees', href: '/committees' },
      { name: 'Legislation', href: '/legislation' },
    ],
  },
  {
    name: 'State',
    items: [
      { name: 'Legislatures', href: '/states' },
      { name: 'Districts', href: '/state-districts' },
      { name: 'Bills', href: '/state-bills' },
    ],
  },
  {
    name: 'Local',
    items: [{ name: 'Officials', href: '/local' }],
  },
];

// Flat navigation for mobile and simple links
const flatNavigation = [{ name: 'About', href: '/about' }];

// Dropdown component for desktop navigation
function NavDropdown({ section, isActive }: { section: NavSection; isActive: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  };

  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div
      ref={dropdownRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={handleClick}
        className={`aicher-heading-wide text-sm lg:text-base relative transition-all duration-200 min-h-[44px] flex items-center gap-1 after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-[#3ea2d4] after:transition-all after:duration-200 hover:after:w-full ${
          isActive ? 'text-[#3ea2d4] after:w-full' : 'text-gray-700 hover:text-[#3ea2d4]'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {section.name}
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 min-w-[180px] bg-white border-2 border-black shadow-lg z-50">
          <div className="py-2">
            {section.items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-[#3ea2d4] transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Header({ className = '', transparent = false }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const headerClasses = transparent
    ? 'aicher-card/95 backdrop-blur-md'
    : 'aicher-card aicher-no-radius';

  return (
    <header className={`fixed top-0 w-full ${headerClasses} z-50 ${className}`}>
      <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3 flex justify-between items-center">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center group min-h-[44px] py-1 transform transition-all duration-300 hover:scale-105"
          aria-label="CIV.IQ Home"
        >
          <CiviqLogo />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6">
          {/* Dropdown sections: Federal, State, Local */}
          {navigationSections.map(section => {
            const isActive = section.items.some(item => pathname.startsWith(item.href));
            return <NavDropdown key={section.name} section={section} isActive={isActive} />;
          })}
          {/* Flat navigation items: About */}
          {flatNavigation.map(item => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`aicher-heading-wide text-sm lg:text-base relative transition-all duration-200 min-h-[44px] flex items-center after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-[#3ea2d4] after:transition-all after:duration-200 hover:after:w-full ${
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
          className="md:hidden flex items-center justify-center min-w-[44px] min-h-[44px] text-gray-700 border-2 border-gray-300 hover:border-civiq-blue transition-colors"
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
        sections={navigationSections}
        flatNavigation={flatNavigation}
        currentPath={pathname}
      />
    </header>
  );
}
