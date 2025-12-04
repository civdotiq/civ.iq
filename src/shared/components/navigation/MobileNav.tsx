/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useEffect, useState, useRef, useId } from 'react';
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
  const navRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const toggleSection = (sectionName: string) => {
    setExpandedSection(prev => (prev === sectionName ? null : sectionName));
  };

  // Close menu when route changes or escape key is pressed
  // Also handle focus trapping within the mobile menu
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

    // Focus trap within mobile menu
    const handleTab = (e: KeyboardEvent) => {
      if (!isOpen || e.key !== 'Tab' || !navRef.current) return;

      const focusableElements = navRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('keydown', handleTab);
      window.addEventListener('resize', handleResize);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
      // Focus first element when menu opens
      setTimeout(() => firstFocusableRef.current?.focus(), 100);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTab);
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
        aria-hidden="true"
      />

      {/* Mobile Menu */}
      <div
        ref={navRef}
        id={menuId}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
        className="md:hidden absolute top-full left-0 w-full aicher-card aicher-no-radius z-50 animate-slide-down"
      >
        <nav className="container mx-auto px-4 py-4" aria-label="Mobile navigation">
          {/* Accordion sections: Federal, State, Local */}
          <div className="space-y-1" role="list">
            {sections.map((section, sectionIndex) => {
              const isExpanded = expandedSection === section.name;
              const sectionIsActive = section.items.some(item => currentPath.startsWith(item.href));
              const sectionId = `${menuId}-section-${sectionIndex}`;

              return (
                <div key={section.name} role="listitem">
                  {/* Section header - accordion toggle */}
                  <button
                    ref={sectionIndex === 0 ? firstFocusableRef : undefined}
                    onClick={() => toggleSection(section.name)}
                    className={`aicher-heading-wide w-full flex items-center justify-between py-3 px-4 transition-all duration-200 ${
                      sectionIsActive
                        ? 'bg-[#3ea2d4]/10 text-[#3ea2d4]'
                        : 'text-gray-700 hover:text-[#3ea2d4] aicher-hover'
                    }`}
                    aria-expanded={isExpanded}
                    aria-controls={sectionId}
                  >
                    <span>{section.name}</span>
                    <svg
                      className={`w-5 h-5 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
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
                    <div
                      id={sectionId}
                      className="pl-4 border-l-2 border-gray-200 ml-4 mt-1 mb-2"
                      role="list"
                    >
                      {section.items.map(item => {
                        const isActive = currentPath === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            role="listitem"
                            aria-current={isActive ? 'page' : undefined}
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
            <div className="space-y-1" role="list">
              {flatNavigation.map(item => {
                const isActive = currentPath === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="listitem"
                    aria-current={isActive ? 'page' : undefined}
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
