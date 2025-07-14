/*
 * CIV.IQ - Civic Information Hub
 * Copyright (C) 2025 Mark Sandford
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * For commercial licensing inquiries: mark@marksandford.dev
 */

import { FC, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: FC<CardProps> = ({
  children,
  className,
  interactive = false,
  padding = 'md',
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-gray-100 shadow-sm',
        interactive && 'cursor-pointer hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 transform transition-all duration-200',
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export const CardHeader: FC<CardHeaderProps> = ({ children, className }) => (
  <div className={cn('pb-4 border-b border-gray-100', className)}>
    {children}
  </div>
);

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export const CardTitle: FC<CardTitleProps> = ({ children, className }) => (
  <h3 className={cn('text-xl font-semibold text-gray-900', className)}>
    {children}
  </h3>
);

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export const CardContent: FC<CardContentProps> = ({ children, className }) => (
  <div className={cn('pt-4', className)}>
    {children}
  </div>
);

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export const CardFooter: FC<CardFooterProps> = ({ children, className }) => (
  <div className={cn('pt-4 mt-4 border-t border-gray-100', className)}>
    {children}
  </div>
);
