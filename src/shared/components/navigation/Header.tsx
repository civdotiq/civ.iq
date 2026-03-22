/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useRef, useEffect, useId } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CiviqLogo } from '@/shared/ui/CiviqLogo';
import { MobileNav } from './MobileNav';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { ThemeToggle } from '@/components/ThemeToggle';

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
      { name: 'Congress', href: '/congress' },
      { name: 'Districts', href: '/districts' },
      { name: 'Committees', href: '/committees' },
      { name: 'Legislation', href: '/legislation' },
      { name: 'Spending', href: '/spending' },
      { name: 'Regulations', href: '/regulations' },
      { name: 'Executive Orders', href: '/executive-orders' },
      { name: 'Comment Periods', href: '/comment-periods' },
      { name: 'Influence', href: '/influence' },
      { name: 'Industries', href: '/industry' },
      { name: 'Your Reps', href: '/your-reps' },
      { name: 'Connections', href: '/investigate' },
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
function NavDropdown({
  section,
  isActive,
  currentPath,
}: {
  section: NavSection;
  isActive: boolean;
  currentPath: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuId = useId();

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

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && isOpen) {
      setIsOpen(false);
    }
  };

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
      onKeyDown={handleKeyDown}
    >
      <button
        onClick={handleClick}
        className={`aicher-heading-wide text-sm lg:text-base relative transition-all duration-200 min-h-[44px] flex items-center gap-1 after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-civiq-blue after:transition-all after:duration-200 hover:after:w-full ${
          isActive
            ? 'text-civiq-blue after:w-full'
            : 'text-gray-700 dark:text-gray-300 hover:text-civiq-blue'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
      >
        {section.name}
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label={`${section.name} navigation`}
          className="absolute top-full left-0 mt-1 min-w-[180px] bg-white dark:bg-[#222226] border-2 border-black dark:border-[#333333] z-50"
        >
          <div className="py-2">
            {section.items.map(item => {
              const isCurrentPage = currentPath === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  aria-current={isCurrentPage ? 'page' : undefined}
                  className={`block px-4 py-2 text-sm transition-colors ${
                    isCurrentPage
                      ? 'bg-gray-100 dark:bg-[#2a2a2e] text-civiq-blue font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2e] hover:text-civiq-blue'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </Link>
              );
            })}
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
    ? 'bg-white dark:bg-[#1a1a1e] border-b-2 border-black dark:border-[#333333]'
    : 'bg-white dark:bg-[#1a1a1e] border-b-2 border-black dark:border-[#333333]';

  return (
    <>
      <header className={`fixed top-0 w-full ${headerClasses} z-50 ${className}`}>
        <div className="container mx-auto px-4 py-2 flex justify-between items-center">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center group min-h-[44px] py-1 transition-colors duration-200"
            aria-label="CIV.IQ Home"
          >
            <CiviqLogo />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-6" aria-label="Main navigation">
            {/* Dropdown sections: Federal, State, Local */}
            {navigationSections.map(section => {
              const isActive = section.items.some(item => pathname.startsWith(item.href));
              return (
                <NavDropdown
                  key={section.name}
                  section={section}
                  isActive={isActive}
                  currentPath={pathname}
                />
              );
            })}
            {/* Flat navigation items: About */}
            {flatNavigation.map(item => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`aicher-heading-wide text-sm lg:text-base relative transition-all duration-200 min-h-[44px] flex items-center after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-civiq-blue after:transition-all after:duration-200 hover:after:w-full ${
                    isActive
                      ? 'text-civiq-blue after:w-full'
                      : 'text-gray-700 dark:text-gray-300 hover:text-civiq-blue'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}

            {/* Global Search */}
            <div className="ml-2 lg:ml-4">
              <GlobalSearch />
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden flex items-center justify-center min-w-[44px] min-h-[44px] text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-600 hover:border-civiq-blue transition-colors"
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
    </>
  );
}
