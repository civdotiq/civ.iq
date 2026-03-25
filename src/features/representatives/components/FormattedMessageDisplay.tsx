/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';
import { Check, Copy, Mail, ExternalLink } from 'lucide-react';
import { copyToClipboard, generateMailtoLink } from '@/lib/utils/contactHelpers';

interface FormattedMessageDisplayProps {
  formattedMessage: string;
  contactFormUrl?: string;
  email?: string;
  representativeName: string;
  subject: string;
}

export function FormattedMessageDisplay({
  formattedMessage,
  contactFormUrl,
  email,
  representativeName,
  subject,
}: FormattedMessageDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(formattedMessage);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const mailtoUrl = email
    ? generateMailtoLink({ email, subject, body: formattedMessage })
    : undefined;

  return (
    <div className="space-y-4">
      {/* Message Preview */}
      <div className="aicher-sidebar-card">
        <div className="aicher-sidebar-header">
          <Mail className="w-5 h-5" />
          <h3 className="font-semibold">Your Message</h3>
        </div>

        <div className="p-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 font-mono text-sm whitespace-pre-wrap break-words max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700">
            {formattedMessage}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Copy to Clipboard Button */}
        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-civiq-blue hover:bg-civiq-blue text-white font-medium transition-colors"
          aria-label={copied ? 'Message copied' : 'Copy message to clipboard'}
        >
          {copied ? (
            <>
              <Check className="w-5 h-5" />
              Copied to Clipboard!
            </>
          ) : (
            <>
              <Copy className="w-5 h-5" />
              Copy Message
            </>
          )}
        </button>

        {/* Official Contact Form Button */}
        {contactFormUrl && (
          <a
            href={contactFormUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-civiq-green hover:bg-civiq-green text-white font-medium transition-colors"
          >
            <ExternalLink className="w-5 h-5" />
            Open Official Contact Form
          </a>
        )}

        {/* Email Button (if available) */}
        {mailtoUrl && (
          <a
            href={mailtoUrl}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium transition-colors"
          >
            <Mail className="w-5 h-5" />
            Send via Email
          </a>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-civiq-blue/10 dark:bg-civiq-blue/20 border border-civiq-blue dark:border-civiq-blue p-4">
        <p className="text-sm text-civiq-blue dark:text-civiq-blue">
          <strong>Next steps:</strong> Copy your message and paste it into{' '}
          {contactFormUrl ? (
            <>
              <strong>{representativeName}&apos;s official contact form</strong>
            </>
          ) : email ? (
            <>
              an email to <strong>{representativeName}</strong>
            </>
          ) : (
            <>
              your message to <strong>{representativeName}</strong>
            </>
          )}
          . Official contact forms are the most reliable way to ensure your message is received and
          tracked.
        </p>
      </div>

      {/* No Contact Method Warning */}
      {!contactFormUrl && !email && (
        <div className="bg-gray-100 dark:bg-gray-800/20 border border-gray-300 dark:border-gray-400 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-600">
            <strong>Contact information limited:</strong> We don&apos;t have a direct contact form
            or email for this representative. You can copy the message and send it through other
            channels, or contact their office directly.
          </p>
        </div>
      )}
    </div>
  );
}
