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
  AlertCircle,
  Info,
} from 'lucide-react';
import { EnhancedRepresentative } from '@/types/representative';

interface DistrictSidebarProps {
  representative: EnhancedRepresentative;
  className?: string;
}

interface SidebarCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'highlight' | 'warning';
}

function SidebarCard({
  title,
  icon,
  children,
  className = '',
  variant = 'default',
}: SidebarCardProps) {
  const variants = {
    default: 'bg-white border-gray-200',
    highlight: 'bg-blue-50 border-blue-200',
    warning: 'bg-yellow-50 border-yellow-200',
  };

  return (
    <div className={` border border-2 border-black ${variants[variant]} ${className}`}>
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="text-gray-500">{icon}</div>
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
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
    <div className="flex items-start gap-2 p-2 rounded hover:bg-white transition-colors">
      <div className="text-gray-400 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-gray-600 mb-0.5">{label}</div>
        <div className="text-sm text-gray-900 break-all">{value}</div>
      </div>
      {copyable && (
        <button
          onClick={handleCopy}
          className="text-gray-400 hover:text-gray-600 p-1"
          title="Copy to clipboard"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
          </svg>
        </button>
      )}
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    );
  }

  return content;
}

export function DistrictSidebar({ representative, className = '' }: DistrictSidebarProps) {
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
    <div className={`space-y-4 ${className}`}>
      {/* District Information */}
      <SidebarCard title="District" icon={<MapPin className="w-4 h-4" />} variant="highlight">
        <div className="space-y-3">
          <div>
            {representative.chamber === 'Senate' ? (
              <Link
                href={`/districts/${representative.state}-STATE`}
                className="block hover:bg-blue-50 -m-3 p-3 transition-colors group"
              >
                <div className="text-lg font-bold text-gray-900 group-hover:text-blue-600">
                  {getDistrictDisplay()}
                </div>
                <div className="text-sm text-gray-600">U.S. Senate</div>
                <div className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                  View state overview →
                </div>
              </Link>
            ) : (
              <Link
                href={`/districts/${representative.state}-${representative.district || 'AL'}`}
                className="block hover:bg-blue-50 -m-3 p-3 transition-colors group"
              >
                <div className="text-lg font-bold text-gray-900 group-hover:text-blue-600">
                  {getDistrictDisplay()}
                </div>
                <div className="text-sm text-gray-600">Congressional District</div>
                <div className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                  View district profile →
                </div>
              </Link>
            )}
          </div>

          {representative.chamber === 'House' && (
            <div className="text-sm text-gray-600">
              <div className="flex items-center gap-1 mb-1">
                <Users className="w-3 h-3" />
                <span>~760,000 constituents</span>
              </div>
              <div className="text-xs text-gray-500">Based on 2020 Census apportionment</div>
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
      </SidebarCard>

      {/* Contact Information */}
      <SidebarCard title="Contact Information" icon={<Phone className="w-4 h-4" />}>
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
      </SidebarCard>

      {/* Term Information */}
      <SidebarCard title="Current Term" icon={<Calendar className="w-4 h-4" />}>
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
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
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
              <div className="text-xs font-medium text-gray-600 mb-1">Next Election</div>
              <div className="text-sm text-gray-900">{nextElection}</div>
            </div>
          )}

          {representative.chamber === 'Senate' && representative.currentTerm?.class && (
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">Senate Class</div>
              <div className="text-sm text-gray-900">Class {representative.currentTerm.class}</div>
            </div>
          )}
        </div>
      </SidebarCard>

      {/* Quick Actions */}
      <SidebarCard title="Quick Actions" icon={<Clock className="w-4 h-4" />}>
        <div className="space-y-2">
          {representative.currentTerm?.contactForm && (
            <a
              href={representative.currentTerm.contactForm}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-blue-600 text-white text-center py-2 px-3 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Send Message
            </a>
          )}

          {representative.currentTerm?.website && (
            <a
              href={representative.currentTerm.website}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-white border border-gray-300 text-gray-700 text-center py-2 px-3 text-sm font-medium hover:bg-white transition-colors"
            >
              Visit Website
            </a>
          )}

          <button className="block w-full bg-white border border-gray-300 text-gray-700 text-center py-2 px-3 text-sm font-medium hover:bg-white transition-colors">
            Find Local Offices
          </button>
        </div>
      </SidebarCard>

      {/* Data Transparency */}
      <SidebarCard title="Data Sources" icon={<Info className="w-4 h-4" />}>
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <span>Congress.gov</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-600 rounded-full"></div>
            <span>Congress Legislators</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
            <span>FEC Campaign Finance</span>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            All data from official government sources
          </div>
        </div>
      </SidebarCard>

      {/* Help Notice */}
      <SidebarCard title="Need Help?" icon={<AlertCircle className="w-4 h-4" />} variant="warning">
        <div className="text-sm text-gray-700">
          <p className="mb-2">
            Having trouble reaching your representative? Contact information is updated regularly
            from official sources.
          </p>
          <a
            href="https://www.house.gov/representatives/find-your-representative"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-xs"
          >
            Find alternative contact methods →
          </a>
        </div>
      </SidebarCard>
    </div>
  );
}
