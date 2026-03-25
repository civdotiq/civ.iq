/**
 * EntityLinkWrapper Component
 *
 * Automatically converts text mentions of political entities into clickable links.
 * Supports representatives, bills, committees, and financial amounts.
 */

'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { recognizeEntities, type EntityMatch } from '@/lib/entity-recognition';

interface EntityLinkWrapperProps {
  text: string;
  entityType?: 'auto' | 'representative' | 'bill' | 'committee' | 'donor';
  className?: string;
  enablePreview?: boolean;
}

export function EntityLinkWrapper({
  text,
  entityType = 'auto',
  className = '',
  enablePreview = true,
}: EntityLinkWrapperProps) {
  // Parse text and identify entities
  const linkedContent = useMemo(() => {
    if (!text) return null;

    const entities = recognizeEntities(text, entityType);

    if (entities.length === 0) {
      return <span className={className}>{text}</span>;
    }

    // Sort entities by start index to process in order
    entities.sort((a, b) => a.startIndex - b.startIndex);

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    entities.forEach((entity, index) => {
      // Add text before this entity
      if (entity.startIndex > lastIndex) {
        elements.push(
          <span key={`text-${index}`}>{text.substring(lastIndex, entity.startIndex)}</span>
        );
      }

      // Add the entity as a link
      elements.push(
        <EntityLink key={`entity-${index}`} entity={entity} enablePreview={enablePreview} />
      );

      lastIndex = entity.endIndex;
    });

    // Add any remaining text
    if (lastIndex < text.length) {
      elements.push(<span key="text-final">{text.substring(lastIndex)}</span>);
    }

    return <span className={className}>{elements}</span>;
  }, [text, entityType, className, enablePreview]);

  return <>{linkedContent}</>;
}

interface EntityLinkProps {
  entity: EntityMatch;
  enablePreview: boolean;
}

function EntityLink({ entity, enablePreview: _enablePreview }: EntityLinkProps) {
  const href = getEntityHref(entity);
  const linkClassName = getEntityLinkClassName(entity.type);

  if (!href) {
    return <span className={linkClassName}>{entity.text}</span>;
  }

  return (
    <Link
      href={href}
      className={linkClassName}
      data-entity-type={entity.type}
      data-entity-id={entity.id}
      title={`View ${entity.type}: ${entity.text}`}
    >
      {entity.text}
    </Link>
  );
}

function getEntityHref(entity: EntityMatch): string | null {
  switch (entity.type) {
    case 'representative':
      return `/representative/${entity.id}`;
    case 'bill':
      return `/bill/${entity.id}`;
    case 'committee':
      return `/committee/${entity.id}`;
    case 'donor':
      // Donor pages not implemented - return null to render as plain text
      return null;
    default:
      return null;
  }
}

function getEntityLinkClassName(type: EntityMatch['type']): string {
  const baseClasses =
    'underline decoration-dotted decoration-1 underline-offset-2 transition-colors';

  switch (type) {
    case 'representative':
      return `${baseClasses} text-civiq-blue hover:text-civiq-blue decoration-civiq-blue`;
    case 'bill':
      return `${baseClasses} text-civiq-blue hover:text-civiq-blue decoration-civiq-blue`;
    case 'committee':
      return `${baseClasses} text-civiq-green hover:text-civiq-green decoration-civiq-green`;
    case 'donor':
      return `${baseClasses} text-civiq-red hover:text-civiq-red decoration-civiq-red`;
    default:
      return baseClasses;
  }
}

// Example usage:
// <EntityLinkWrapper text={bill.summary} />
// <EntityLinkWrapper text={representative.bio} entityType="representative" />
