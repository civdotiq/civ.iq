/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface NavigationItem {
  name: string;
  href: string;
}

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  navigation: NavigationItem[];
  currentPath: string;
}

export function MobileNav({ isOpen, onClose, navigation, currentPath }: MobileNavProps) {
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
      <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-gray-200 shadow-lg z-50 animate-slide-down">
        <nav className="container mx-auto px-4 py-4">
          <div className="space-y-1">
            {navigation.map(item => {
              const isActive = currentPath.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block py-3 px-4 rounded-lg transition-all duration-200 font-medium ${
                    isActive
                      ? 'bg-[#3ea2d4]/10 text-[#3ea2d4] border-l-4 border-[#3ea2d4]'
                      : 'text-gray-700 hover:text-[#3ea2d4] hover:bg-gray-50'
                  }`}
                  onClick={onClose}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Additional mobile-only actions */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="space-y-1">
              <Link
                href="/search"
                className="block py-3 px-4 text-gray-700 hover:text-[#3ea2d4] hover:bg-gray-50 rounded-lg transition-all duration-200 font-medium"
                onClick={onClose}
              >
                Search
              </Link>
              <Link
                href="/analytics"
                className="block py-3 px-4 text-gray-700 hover:text-[#3ea2d4] hover:bg-gray-50 rounded-lg transition-all duration-200 font-medium"
                onClick={onClose}
              >
                Analytics
              </Link>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}
