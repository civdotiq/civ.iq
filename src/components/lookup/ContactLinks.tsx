/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tap-to-call and tap-to-email links, shown as the number and address
 * themselves, plus the official web contact form when the office has one.
 */
export function ContactLinks({
  phone,
  email,
  contactForm,
}: {
  phone?: string;
  email?: string;
  contactForm?: string;
}) {
  if (!phone && !email && !contactForm) return null;
  return (
    <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {phone && (
        <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="text-civiq-blue underline">
          {phone}
        </a>
      )}
      {email && (
        <a href={`mailto:${email}`} className="text-civiq-blue underline break-all">
          {email}
        </a>
      )}
      {contactForm && (
        <a
          href={contactForm}
          target="_blank"
          rel="noopener noreferrer"
          className="text-civiq-blue underline"
        >
          Contact form
        </a>
      )}
    </p>
  );
}
