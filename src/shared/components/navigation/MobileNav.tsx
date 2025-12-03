/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface NavigationItem {
  name: string;
  href: string;
}

interface NavSection {
  name: string;
  items: NavigationItem[];
}

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  sections: NavSection[];
  flatNavigation: NavigationItem[];
  currentPath: string;
}

export function MobileNav({
  isOpen,
  onClose,
  sections,
  flatNavigation,
  currentPath,
}: MobileNavProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (sectionName: string) => {
    setExpandedSection(prev => (prev === sectionName ? null : sectionName));
  };
  // Close menu when route changes or escape key is pressed
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    const handleResize = () => {
      // Close mobile menu when screen gets large enough for desktop nav
      if (window.innerWidth >= 768 && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      window.addEventListener('resize', handleResize);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', handleResize);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="md:hidden fixed inset-0 top-16 bg-black/20 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
        aria-label="Close mobile menu"
      />

      {/* Mobile Menu */}
      <div className="md:hidden absolute top-full left-0 w-full aicher-card aicher-no-radius z-50 animate-slide-down">
        <nav className="container mx-auto px-4 py-4">
          {/* Accordion sections: Federal, State, Local */}
          <div className="space-y-1">
            {sections.map(section => {
              const isExpanded = expandedSection === section.name;
              const sectionIsActive = section.items.some(item => currentPath.startsWith(item.href));

              return (
                <div key={section.name}>
                  {/* Section header - accordion toggle */}
                  <button
                    onClick={() => toggleSection(section.name)}
                    className={`aicher-heading-wide w-full flex items-center justify-between py-3 px-4 transition-all duration-200 ${
                      sectionIsActive
                        ? 'bg-[#3ea2d4]/10 text-[#3ea2d4]'
                        : 'text-gray-700 hover:text-[#3ea2d4] aicher-hover'
                    }`}
                    aria-expanded={isExpanded}
                  >
                    <span>{section.name}</span>
                    <svg
                      className={`w-5 h-5 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Section items - collapsible */}
                  {isExpanded && (
                    <div className="pl-4 border-l-2 border-gray-200 ml-4 mt-1 mb-2">
                      {section.items.map(item => {
                        const isActive = currentPath.startsWith(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`block py-2 px-4 text-sm transition-all duration-200 ${
                              isActive
                                ? 'text-[#3ea2d4] font-medium'
                                : 'text-gray-600 hover:text-[#3ea2d4]'
                            }`}
                            onClick={onClose}
                          >
                            {item.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Flat navigation items: About */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="space-y-1">
              {flatNavigation.map(item => {
                const isActive = currentPath.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`aicher-heading-wide block py-3 px-4 transition-all duration-200 ${
                      isActive
                        ? 'bg-[#3ea2d4]/10 text-[#3ea2d4] border-l-4 border-[#3ea2d4]'
                        : 'text-gray-700 hover:text-[#3ea2d4] aicher-hover'
                    }`}
                    onClick={onClose}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}
