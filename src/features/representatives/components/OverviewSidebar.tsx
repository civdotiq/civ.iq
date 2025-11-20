/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Users,
  Building,
  Phone,
  Mail,
  ExternalLink,
  Calendar,
  Clock,
  FileText,
} from 'lucide-react';
import { EnhancedRepresentative } from '@/types/representative';
import { AicherSidebarCard } from './AicherSidebarCard';
import { StateMapCard } from './StateMapCard';

interface OverviewSidebarProps {
  representative: EnhancedRepresentative;
}

interface ContactMethodProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  copyable?: boolean;
}

function ContactMethod({ icon, label, value, href, copyable = false }: ContactMethodProps) {
  const handleCopy = () => {
    if (copyable) {
      navigator.clipboard.writeText(value);
    }
  };

  const content = (
    <div className="aicher-contact-method">
      <div className="text-gray-500 p-1 bg-gray-100">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="aicher-heading-wide type-xs text-gray-600 mb-1">{label}</div>
        <div className="type-sm text-gray-900 break-all font-medium">{value}</div>
      </div>
      {copyable && (
        <button
          onClick={handleCopy}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          style={{ padding: 'calc(var(--grid) * 1)' }}
          title="Copy to clipboard"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
          </svg>
        </button>
      )}
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block hover:bg-blue-50 transition-colors"
      >
        {content}
      </a>
    );
  }

  return content;
}

export function OverviewSidebar({ representative }: OverviewSidebarProps) {
  // Use state for client-side date calculations to avoid hydration mismatches
  const [termProgress, setTermProgress] = useState<{
    progress: number;
    daysRemaining: number;
  } | null>(null);

  const [nextElection, setNextElection] = useState<number | null>(null);

  // Format district display
  const getDistrictDisplay = () => {
    if (representative.chamber === 'Senate') {
      return `${representative.state} (Statewide)`;
    }
    if (representative.district && representative.district !== 'AL') {
      return `${representative.state}-${representative.district}`;
    }
    return `${representative.state} (At-Large)`;
  };

  // Calculate date-dependent values only on the client side
  useEffect(() => {
    // Get next election year
    const getNextElectionYear = () => {
      const currentYear = new Date().getFullYear();
      if (representative.chamber === 'House') {
        // House members elected every 2 years
        return currentYear % 2 === 0 ? currentYear : currentYear + 1;
      } else {
        // Senate members elected every 6 years
        if (representative.currentTerm?.end) {
          return new Date(representative.currentTerm.end).getFullYear();
        }
      }
      return null;
    };

    // Calculate term progress
    const getTermProgress = () => {
      if (!representative.currentTerm?.start || !representative.currentTerm?.end) return null;

      const start = new Date(representative.currentTerm.start);
      const end = new Date(representative.currentTerm.end);
      const now = new Date();

      const total = end.getTime() - start.getTime();
      const elapsed = now.getTime() - start.getTime();
      const progress = Math.min(Math.max((elapsed / total) * 100, 0), 100);

      return {
        progress: Math.round(progress),
        daysRemaining: Math.max(
          0,
          Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        ),
      };
    };

    setNextElection(getNextElectionYear());
    setTermProgress(getTermProgress());
  }, [representative.chamber, representative.currentTerm]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--grid) * 2)' }}>
      {/* District Information */}
      <AicherSidebarCard title="District" icon={MapPin} variant="highlight">
        <div className="space-y-3">
          {/* Geometric Map Placeholder */}
          <Link
            href={
              representative.chamber === 'Senate'
                ? `/districts/${representative.state}-STATE`
                : `/districts/${representative.state}-${representative.district || 'AL'}`
            }
            className="block"
          >
            <div className="aicher-map-placeholder group cursor-pointer hover:border-civiq-blue transition-all">
              <MapPin className="w-12 h-12 text-gray-400 group-hover:text-civiq-blue transition-colors" />
              <div className="aicher-map-placeholder-label">
                {representative.chamber === 'Senate' ? 'State View' : 'District Map'}
              </div>
            </div>
          </Link>

          <div>
            {representative.chamber === 'Senate' ? (
              <div>
                <div className="text-lg font-bold text-gray-900">{getDistrictDisplay()}</div>
                <div className="text-sm text-gray-600">U.S. Senate</div>
              </div>
            ) : (
              <div>
                <div className="text-lg font-bold text-gray-900">{getDistrictDisplay()}</div>
                <div className="text-sm text-gray-600">Congressional District</div>
              </div>
            )}
          </div>

          {representative.chamber === 'House' && (
            <div className="text-sm text-gray-600">
              <div className="flex items-center gap-1 mb-1">
                <Users className="w-3 h-3" />
                <span>~760,000 constituents</span>
              </div>
              <div className="text-xs text-gray-500">
                Based on{' '}
                <a
                  href="https://www.census.gov/programs-surveys/decennial-census/decade/2020/2020-census-main.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-civiq-blue hover:underline"
                >
                  2020 Census
                </a>{' '}
                apportionment
              </div>
            </div>
          )}

          {representative.chamber === 'Senate' && (
            <div className="text-sm text-gray-600">
              <div className="flex items-center gap-1 mb-1">
                <Users className="w-3 h-3" />
                <span>Represents entire state</span>
              </div>
              <div className="text-xs text-gray-500">
                {representative.currentTerm?.stateRank && (
                  <span className="capitalize">{representative.currentTerm.stateRank} Senator</span>
                )}
              </div>
            </div>
          )}
        </div>
      </AicherSidebarCard>

      {/* State Map for Senators */}
      {representative.chamber === 'Senate' && representative.state && (
        <StateMapCard stateCode={representative.state} />
      )}

      {/* Contact Information */}
      <AicherSidebarCard title="Contact Information" icon={Phone}>
        <div className="space-y-1">
          {/* Washington Office */}
          {representative.currentTerm?.office && (
            <ContactMethod
              icon={<Building className="w-3 h-3" />}
              label="Washington Office"
              value={representative.currentTerm.office}
              copyable
            />
          )}

          {representative.currentTerm?.phone && (
            <ContactMethod
              icon={<Phone className="w-3 h-3" />}
              label="Phone"
              value={representative.currentTerm.phone}
              href={`tel:${representative.currentTerm.phone}`}
              copyable
            />
          )}

          {representative.currentTerm?.contactForm && (
            <ContactMethod
              icon={<Mail className="w-3 h-3" />}
              label="Contact Form"
              value="Send Message"
              href={representative.currentTerm.contactForm}
            />
          )}

          {representative.currentTerm?.website && (
            <ContactMethod
              icon={<ExternalLink className="w-3 h-3" />}
              label="Official Website"
              value="Visit Website"
              href={representative.currentTerm.website}
            />
          )}
        </div>
      </AicherSidebarCard>

      {/* Term Information */}
      <AicherSidebarCard title="Current Term" icon={Calendar}>
        <div className="space-y-3">
          {representative.currentTerm?.start && representative.currentTerm?.end && (
            <div>
              <div className="text-sm font-medium text-gray-900 mb-1">
                {new Date(representative.currentTerm.start).getFullYear()} -{' '}
                {new Date(representative.currentTerm.end).getFullYear()}
              </div>
              {termProgress && (
                <div>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{termProgress.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 border-2 border-black h-2">
                    <div
                      className="bg-civiq-green h-full transition-all duration-300"
                      style={{ width: `${termProgress.progress}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {termProgress.daysRemaining.toLocaleString()} days remaining
                  </div>
                </div>
              )}
            </div>
          )}

          {nextElection && (
            <div>
              <div className="aicher-heading-wide text-xs text-gray-600 mb-1">Next Election</div>
              <div className="text-sm font-semibold text-gray-900">{nextElection}</div>
            </div>
          )}

          {representative.chamber === 'Senate' && representative.currentTerm?.class && (
            <div>
              <div className="aicher-heading-wide text-xs text-gray-600 mb-1">Senate Class</div>
              <div className="text-sm font-semibold text-gray-900">
                Class {representative.currentTerm.class}
              </div>
            </div>
          )}
        </div>
      </AicherSidebarCard>

      {/* Legislation Links */}
      <AicherSidebarCard title="Legislation" icon={FileText}>
        <div className="space-y-3">
          <Link
            href={`/representative/${representative.bioguideId}?tab=bills`}
            className="block hover:bg-blue-50 -m-3 p-3 transition-colors group"
          >
            <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
              Sponsored Bills
            </div>
            <div className="text-xs text-gray-600">
              View all legislation sponsored by this representative
            </div>
            <div className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
              View all bills →
            </div>
          </Link>

          <Link
            href={`/representative/${representative.bioguideId}?tab=votes`}
            className="block hover:bg-blue-50 -m-3 p-3 transition-colors group"
          >
            <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
              Voting Record
            </div>
            <div className="text-xs text-gray-600">See how they voted on key legislation</div>
            <div className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
              View voting record →
            </div>
          </Link>

          <Link
            href="/legislation"
            className="block hover:bg-blue-50 -m-3 p-3 transition-colors group"
          >
            <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
              All Recent Legislation
            </div>
            <div className="text-xs text-gray-600">Browse the latest bills in Congress</div>
            <div className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
              Browse legislation →
            </div>
          </Link>
        </div>
      </AicherSidebarCard>

      {/* Quick Actions */}
      <AicherSidebarCard title="Quick Actions" icon={Clock}>
        <div className="space-y-3">
          {representative.currentTerm?.website && (
            <a
              href={representative.currentTerm.website}
              target="_blank"
              rel="noopener noreferrer"
              className="aicher-button-high-emphasis"
            >
              Visit Website
            </a>
          )}

          {representative.currentTerm?.contactForm && (
            <a
              href={representative.currentTerm.contactForm}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-3 px-5 text-sm aicher-heading transition-all duration-200 bg-white text-black aicher-border border-black hover:bg-black hover:text-white"
            >
              Send Message
            </a>
          )}

          <button className="block w-full text-center py-3 px-5 text-sm aicher-heading transition-all duration-200 bg-white text-black aicher-border border-black hover:bg-black hover:text-white">
            Find Local Offices
          </button>
        </div>
      </AicherSidebarCard>
    </div>
  );
}
