'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Shield, Eye, Lock, Database, UserCheck, Mail, Clock, AlertCircle } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-xl text-gray-600">Last updated: July 2025</p>
        </div>

        <div className="bg-white rounded-2xl border-2 border-black p-8 md:p-12 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Eye className="w-6 h-6 text-blue-600" />
              Our Commitment to Privacy
            </h2>
            <p className="text-gray-700 leading-relaxed">
              CIV.IQ is a civic utility designed to provide transparent access to public government
              data. We are committed to protecting your privacy while delivering valuable civic
              information. This policy explains what information we collect, how we use it, and your
              rights regarding your data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Database className="w-6 h-6 text-green-600" />
              Information We Collect
            </h2>

            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Search Queries</h3>
                <p className="text-gray-700 mb-2">
                  When you search for representatives by ZIP code or name, we:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                  <li>Store your recent searches locally in your browser for convenience</li>
                  <li>Do not send search history to our servers</li>
                  <li>Allow you to clear your search history at any time</li>
                </ul>
              </div>

              <div className="bg-white rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Analytics Data</h3>
                <p className="text-gray-700 mb-2">
                  We collect anonymous usage statistics to improve our service:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                  <li>Page views and feature usage (anonymized)</li>
                  <li>General geographic region (state level only)</li>
                  <li>Device type and browser (for compatibility)</li>
                  <li>No personally identifiable information</li>
                </ul>
              </div>

              <div className="bg-white rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Technical Information</h3>
                <p className="text-gray-700 mb-2">For security and performance, we may collect:</p>
                <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                  <li>IP addresses (for rate limiting and security)</li>
                  <li>Error logs (to fix bugs and improve reliability)</li>
                  <li>Performance metrics (load times, API response times)</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Lock className="w-6 h-6 text-purple-600" />
              How We Use Information
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                <p className="text-gray-700">
                  <strong>Service Delivery:</strong> To provide accurate representative information
                  and district data
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                <p className="text-gray-700">
                  <strong>Performance:</strong> To optimize load times and API efficiency
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                <p className="text-gray-700">
                  <strong>Security:</strong> To prevent abuse and ensure service availability
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                <p className="text-gray-700">
                  <strong>Improvement:</strong> To understand usage patterns and improve features
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <UserCheck className="w-6 h-6 text-green-600" />
              What We Don&apos;t Do
            </h2>
            <div className="bg-green-50 rounded-xl p-6">
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-green-600 text-xl">✗</span>
                  <span className="text-gray-700">
                    We do not sell, rent, or share your data with third parties
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-600 text-xl">✗</span>
                  <span className="text-gray-700">
                    We do not require account creation or personal information
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-600 text-xl">✗</span>
                  <span className="text-gray-700">
                    We do not use tracking cookies or advertising networks
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-600 text-xl">✗</span>
                  <span className="text-gray-700">
                    We do not store your searches on our servers
                  </span>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Clock className="w-6 h-6 text-blue-600" />
              Data Retention
            </h2>
            <div className="space-y-4">
              <p className="text-gray-700">
                <strong>Local Storage:</strong> Search history is stored only in your browser and
                can be cleared at any time
              </p>
              <p className="text-gray-700">
                <strong>Server Logs:</strong> Technical logs are retained for 30 days for security
                and debugging
              </p>
              <p className="text-gray-700">
                <strong>Analytics:</strong> Aggregated analytics data may be retained indefinitely
                in anonymous form
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-orange-600" />
              Third-Party Data Sources
            </h2>
            <p className="text-gray-700 mb-4">
              CIV.IQ aggregates data from official government sources. When you use our service:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>We fetch data from government APIs on your behalf</li>
              <li>Your IP address is not shared with these data sources</li>
              <li>We cache public data to improve performance and reduce API load</li>
              <li>Each data source has its own privacy policy and terms of use</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Mail className="w-6 h-6 text-blue-600" />
              Contact Us
            </h2>
            <p className="text-gray-700 mb-4">
              If you have questions about this privacy policy or how we handle your data, please
              contact us:
            </p>
            <div className="bg-blue-50 rounded-xl p-6">
              <p className="text-gray-900 font-medium">Email: privacy@civ.iq</p>
              <p className="text-gray-900 font-medium">Web: https://civ.iq/contact</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to This Policy</h2>
            <p className="text-gray-700">
              We may update this privacy policy from time to time. Any changes will be posted on
              this page with an updated revision date. For significant changes, we may provide
              additional notice on our homepage.
            </p>
          </section>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              This privacy policy is part of our commitment to transparency and civic engagement.
              CIV.IQ is a public utility designed to make government data accessible to all
              citizens.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
