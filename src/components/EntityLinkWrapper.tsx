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

function EntityLink({ entity, enablePreview }: EntityLinkProps) {
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
      // TODO: Implement donor pages
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
      return `${baseClasses} text-blue-700 hover:text-blue-900 decoration-blue-400`;
    case 'bill':
      return `${baseClasses} text-purple-700 hover:text-purple-900 decoration-purple-400`;
    case 'committee':
      return `${baseClasses} text-green-700 hover:text-green-900 decoration-green-400`;
    case 'donor':
      return `${baseClasses} text-orange-700 hover:text-orange-900 decoration-orange-400`;
    default:
      return baseClasses;
  }
}

// Example usage:
// <EntityLinkWrapper text={bill.summary} />
// <EntityLinkWrapper text={representative.bio} entityType="representative" />
