/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * ContactInfoAnswer — pod renderer for the contact-info question.
 *
 * Pods: Office contact, Online presence, Committees, Sources.
 * Server component. All data passed as typed props from the page.
 */

import Link from 'next/link';

interface ContactInfoAnswerProps {
  phone?: string;
  address?: string;
  office?: string;
  contactForm?: string;
  website?: string;
  email?: string;
  socialMedia?: {
    twitter?: string;
    facebook?: string;
    youtube?: string;
    instagram?: string;
  } | null;
  committees?: Array<{
    name: string;
    role?: string;
    title?: string;
  }> | null;
  districtOffices?: Array<{
    address: string;
    phone?: string;
  }> | null;
}

function OfficeContactPod({
  phone,
  address,
  office,
  contactForm,
  email,
  districtOffices,
}: {
  phone?: string;
  address?: string;
  office?: string;
  contactForm?: string;
  email?: string;
  districtOffices?: Array<{ address: string; phone?: string }> | null;
}) {
  const hasData = phone || address || contactForm || email;

  if (!hasData) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6">
        <h2 className="type-sm font-semibold text-black mb-3">Office contact</h2>
        <p className="type-sm text-gray-500">
          Office contact information is not yet available for this representative.
        </p>
      </div>
    );
  }

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6">
      <h2 className="type-sm font-semibold text-black mb-3">Office contact</h2>
      <dl className="space-y-3">
        {phone && (
          <div>
            <dt className="type-xs text-gray-500">Phone</dt>
            <dd className="type-base font-medium text-gray-900">
              <a href={`tel:${phone}`} className="text-[#3ea2d4] hover:underline">
                {phone}
              </a>
            </dd>
          </div>
        )}
        {address && (
          <div>
            <dt className="type-xs text-gray-500">{office ? `Office (${office})` : 'DC office'}</dt>
            <dd className="type-sm text-gray-900">{address}</dd>
          </div>
        )}
        {email && (
          <div>
            <dt className="type-xs text-gray-500">Email</dt>
            <dd className="type-sm">
              <a href={`mailto:${email}`} className="text-[#3ea2d4] hover:underline">
                {email}
              </a>
            </dd>
          </div>
        )}
        {contactForm && (
          <div>
            <dt className="type-xs text-gray-500">Contact form</dt>
            <dd className="type-sm">
              <a
                href={contactForm}
                className="text-[#3ea2d4] hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Official contact form
              </a>
            </dd>
          </div>
        )}
      </dl>
      {districtOffices && districtOffices.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <h3 className="type-xs text-gray-500 mb-2">
            District {districtOffices.length === 1 ? 'office' : 'offices'}
          </h3>
          <ul className="space-y-2">
            {districtOffices.map((office, i) => (
              <li key={i} className="type-sm text-gray-700">
                {office.address}
                {office.phone && <span className="text-gray-500"> — {office.phone}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function OnlinePresencePod({
  website,
  socialMedia,
}: {
  website?: string;
  socialMedia?: ContactInfoAnswerProps['socialMedia'];
}) {
  const hasSocial = socialMedia && Object.values(socialMedia).some(Boolean);
  if (!website && !hasSocial) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6">
        <h2 className="type-sm font-semibold text-black mb-3">Online presence</h2>
        <p className="type-sm text-gray-500">No website or social media accounts on file.</p>
      </div>
    );
  }

  const socialLinks: Array<{ label: string; handle: string; url: string }> = [];
  if (socialMedia?.twitter) {
    socialLinks.push({
      label: 'X (Twitter)',
      handle: `@${socialMedia.twitter}`,
      url: `https://x.com/${socialMedia.twitter}`,
    });
  }
  if (socialMedia?.facebook) {
    socialLinks.push({
      label: 'Facebook',
      handle: socialMedia.facebook,
      url: `https://facebook.com/${socialMedia.facebook}`,
    });
  }
  if (socialMedia?.youtube) {
    socialLinks.push({
      label: 'YouTube',
      handle: socialMedia.youtube,
      url: `https://youtube.com/${socialMedia.youtube}`,
    });
  }
  if (socialMedia?.instagram) {
    socialLinks.push({
      label: 'Instagram',
      handle: `@${socialMedia.instagram}`,
      url: `https://instagram.com/${socialMedia.instagram}`,
    });
  }

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6">
      <h2 className="type-sm font-semibold text-black mb-3">Online presence</h2>
      <dl className="space-y-3">
        {website && (
          <div>
            <dt className="type-xs text-gray-500">Website</dt>
            <dd className="type-sm">
              <a
                href={website}
                className="text-[#3ea2d4] hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
              </a>
            </dd>
          </div>
        )}
        {socialLinks.map(link => (
          <div key={link.label}>
            <dt className="type-xs text-gray-500">{link.label}</dt>
            <dd className="type-sm">
              <a
                href={link.url}
                className="text-[#3ea2d4] hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.handle}
              </a>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function CommitteesPod({
  committees,
}: {
  committees?: Array<{ name: string; role?: string; title?: string }> | null;
}) {
  if (!committees?.length) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
        <h2 className="type-sm font-semibold text-black mb-3">Committee assignments</h2>
        <p className="type-sm text-gray-500">Committee assignment data is not available.</p>
      </div>
    );
  }

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
      <h2 className="type-sm font-semibold text-black mb-3">Committee assignments</h2>
      <ul className="divide-y divide-gray-200">
        {committees.map((c, i) => (
          <li key={i} className="py-2 first:pt-0 last:pb-0 flex justify-between items-baseline">
            <span className="type-sm text-gray-900">{c.name}</span>
            {(c.role || c.title) && (
              <span className="type-xs text-gray-500 shrink-0 ml-2">{c.role ?? c.title}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SourcesPod() {
  return (
    <div className="border-2 border-gray-300 bg-white p-4 sm:p-6 lg:col-span-2">
      <p className="type-xs text-gray-500">
        Contact and committee data from{' '}
        <a href="https://www.congress.gov" className="text-[#3ea2d4] hover:underline">
          Congress.gov
        </a>{' '}
        and{' '}
        <a
          href="https://github.com/unitedstates/congress-legislators"
          className="text-[#3ea2d4] hover:underline"
        >
          congress-legislators
        </a>
        .{' '}
        <Link href="/methodology" className="text-[#3ea2d4] hover:underline">
          Full methodology
        </Link>
      </p>
    </div>
  );
}

export function ContactInfoAnswer({
  phone,
  address,
  office,
  contactForm,
  website,
  email,
  socialMedia,
  committees,
  districtOffices,
}: ContactInfoAnswerProps) {
  return (
    <>
      <OfficeContactPod
        phone={phone}
        address={address}
        office={office}
        contactForm={contactForm}
        email={email}
        districtOffices={districtOffices}
      />
      <OnlinePresencePod website={website} socialMedia={socialMedia} />
      <CommitteesPod committees={committees} />
      <SourcesPod />
    </>
  );
}
