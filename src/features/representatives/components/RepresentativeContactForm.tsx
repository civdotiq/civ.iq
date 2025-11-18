/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';
import { z } from 'zod';
import { Mail, Users } from 'lucide-react';
import type { EnhancedRepresentative } from '@/types/representative';
import { FormattedMessageDisplay } from './FormattedMessageDisplay';
import {
  MESSAGE_TEMPLATES,
  formatTemplate,
  getTemplateById,
} from '@/lib/templates/MessageTemplates';
import {
  formatConstituentMessage,
  sanitizeMessage,
  validateEmail,
  validateZipCode,
  getContactMethods,
  getMessageCharacterCount,
} from '@/lib/utils/contactHelpers';

// Zod schema for form validation
const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().refine(validateEmail, 'Invalid email address'),
  zipCode: z.string().refine(validateZipCode, 'Invalid ZIP code (use 5 digits or ZIP+4 format)'),
  subject: z.string().min(1, 'Subject is required'),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message cannot exceed 5000 characters'),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

interface RepresentativeContactFormProps {
  representative: EnhancedRepresentative;
}

const MESSAGE_CHAR_LIMIT = 5000;

export function RepresentativeContactForm({ representative }: RepresentativeContactFormProps) {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    zipCode: '',
    subject: '',
    message: '',
  });
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormData, string>>>({});
  const [showPreview, setShowPreview] = useState(false);

  const contactMethods = getContactMethods(representative);
  const messageLength = getMessageCharacterCount(formData.message);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);

    if (templateId) {
      const template = getTemplateById(templateId);
      if (template) {
        const formatted = formatTemplate(template, {
          name: formData.name || '[Your Name]',
          zipCode: formData.zipCode || '[Your ZIP Code]',
          representativeName: representative.name,
          representativeTitle: representative.title,
        });
        setFormData({ ...formData, subject: template.title, message: formatted });
      }
    }
  };

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    const sanitized = field === 'message' ? sanitizeMessage(value) : value.trim();
    setFormData({ ...formData, [field]: sanitized });

    // Clear error for this field
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const validateForm = (): boolean => {
    try {
      contactFormSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof ContactFormData, string>> = {};
        error.issues.forEach((err: z.ZodIssue) => {
          const field = err.path[0] as keyof ContactFormData;
          newErrors[field] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handlePreview = () => {
    if (validateForm()) {
      setShowPreview(true);
    }
  };

  const formattedMessage = showPreview
    ? formatConstituentMessage({
        representativeName: representative.name,
        representativeTitle: representative.title,
        name: formData.name,
        zipCode: formData.zipCode,
        subject: formData.subject,
        message: formData.message,
      })
    : '';

  if (showPreview) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setShowPreview(false)}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          ← Back to Form
        </button>
        <FormattedMessageDisplay
          formattedMessage={formattedMessage}
          contactFormUrl={contactMethods.contactFormUrl}
          email={contactMethods.email}
          representativeName={representative.name}
          subject={formData.subject}
        />
      </div>
    );
  }

  return (
    <div className="aicher-sidebar-card">
      <div className="aicher-sidebar-header">
        <Mail className="w-5 h-5" />
        <h3 className="font-semibold">Contact {representative.name}</h3>
      </div>

      <form className="p-4 space-y-4" onSubmit={e => e.preventDefault()}>
        {/* Template Selector */}
        <div>
          <label htmlFor="template" className="block text-sm font-medium mb-1">
            Message Template (Optional)
          </label>
          <select
            id="template"
            value={selectedTemplate}
            onChange={e => handleTemplateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800"
          >
            <option value="">Select a template or write your own</option>
            {MESSAGE_TEMPLATES.map(template => (
              <option key={template.id} value={template.id}>
                {template.category}: {template.title}
              </option>
            ))}
          </select>
        </div>

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Your Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={e => handleInputChange('name', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800`}
            placeholder="John Doe"
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Your Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={e => handleInputChange('email', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800`}
            placeholder="john@example.com"
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        </div>

        {/* ZIP Code */}
        <div>
          <label htmlFor="zipCode" className="block text-sm font-medium mb-1">
            Your ZIP Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="zipCode"
            value={formData.zipCode}
            onChange={e => handleInputChange('zipCode', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.zipCode ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800`}
            placeholder="12345"
            maxLength={10}
          />
          {errors.zipCode && <p className="text-red-500 text-sm mt-1">{errors.zipCode}</p>}
          <p className="text-xs text-gray-500 mt-1">Used to verify you&apos;re a constituent</p>
        </div>

        {/* Subject */}
        <div>
          <label htmlFor="subject" className="block text-sm font-medium mb-1">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="subject"
            value={formData.subject}
            onChange={e => handleInputChange('subject', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.subject ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800`}
            placeholder="Healthcare Access"
          />
          {errors.subject && <p className="text-red-500 text-sm mt-1">{errors.subject}</p>}
        </div>

        {/* Message */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium mb-1">
            Your Message <span className="text-red-500">*</span>
          </label>
          <textarea
            id="message"
            value={formData.message}
            onChange={e => handleInputChange('message', e.target.value)}
            rows={8}
            className={`w-full px-3 py-2 border ${errors.message ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 font-mono text-sm`}
            placeholder="I am writing to express my views on..."
            maxLength={MESSAGE_CHAR_LIMIT}
          />
          <div className="flex justify-between items-center mt-1">
            {errors.message && <p className="text-red-500 text-sm">{errors.message}</p>}
            <span
              className={`text-sm ml-auto ${messageLength > MESSAGE_CHAR_LIMIT * 0.9 ? 'text-orange-500' : 'text-gray-500'}`}
            >
              {messageLength} / {MESSAGE_CHAR_LIMIT}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handlePreview}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Mail className="w-5 h-5" />
            Preview Message
          </button>
          <a
            href={`/representatives?zip=${formData.zipCode || ''}`}
            className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            title="Find all your representatives"
          >
            <Users className="w-5 h-5" />
          </a>
        </div>

        {/* Contact Method Info */}
        {!contactMethods.hasContactForm && !contactMethods.hasEmail && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-sm text-yellow-900 dark:text-yellow-100">
              Limited contact information available. You can draft your message and contact this
              representative through other channels.
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
