'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { FileText, Scale, Users, AlertTriangle, CheckCircle, Info, Globe, Ban } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
            <FileText className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-xl text-gray-600">Last updated: July 2025</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Globe className="w-6 h-6 text-blue-600" />
              Welcome to CIV.IQ
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              CIV.IQ is a free public utility that provides transparent access to government data.
              By using our service, you agree to these terms. We've written them to be clear and
              fair, reflecting our mission to serve the public interest.
            </p>
            <div className="bg-blue-50 rounded-xl p-6">
              <p className="text-blue-900 font-medium">
                CIV.IQ is not affiliated with any government agency. We aggregate publicly available
                data to make it more accessible to citizens.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Users className="w-6 h-6 text-green-600" />
              Use of Service
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Acceptable Use</h3>
                <p className="text-gray-700 mb-3">You may use CIV.IQ to:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <span className="text-gray-700">
                      Research your representatives and their voting records
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <span className="text-gray-700">
                      Access public campaign finance information
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <span className="text-gray-700">View district demographics and boundaries</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <span className="text-gray-700">
                      Share information for educational or journalistic purposes
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <span className="text-gray-700">
                      Build upon our open-source code (under MIT License)
                    </span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Prohibited Use</h3>
                <p className="text-gray-700 mb-3">You may not:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <Ban className="w-5 h-5 text-red-600 mt-0.5" />
                    <span className="text-gray-700">
                      Use automated tools to scrape data excessively
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Ban className="w-5 h-5 text-red-600 mt-0.5" />
                    <span className="text-gray-700">
                      Attempt to overwhelm or disrupt our servers
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Ban className="w-5 h-5 text-red-600 mt-0.5" />
                    <span className="text-gray-700">
                      Misrepresent data or create misleading content
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Ban className="w-5 h-5 text-red-600 mt-0.5" />
                    <span className="text-gray-700">
                      Violate any applicable laws or regulations
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Ban className="w-5 h-5 text-red-600 mt-0.5" />
                    <span className="text-gray-700">
                      Use the service for harassment or harmful purposes
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Info className="w-6 h-6 text-purple-600" />
              Data Accuracy and Sources
            </h2>
            <div className="bg-purple-50 rounded-xl p-6 space-y-4">
              <p className="text-gray-700">
                <strong>Government Data:</strong> We aggregate data from official government
                sources. While we strive for accuracy, we cannot guarantee that all information is
                current or error-free.
              </p>
              <p className="text-gray-700">
                <strong>No Warranty:</strong> Data is provided "as is" without warranties of any
                kind. Always verify important information with official sources.
              </p>
              <p className="text-gray-700">
                <strong>Updates:</strong> We update data based on source availability, but there may
                be delays between official updates and our system.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <Scale className="w-6 h-6 text-orange-600" />
              Intellectual Property
            </h2>
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Our Content</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>
                    • <strong>Code:</strong> Licensed under MIT License (see GitHub repository)
                  </li>
                  <li>
                    • <strong>Documentation:</strong> Licensed under CC BY-SA 4.0
                  </li>
                  <li>
                    • <strong>Design & UI:</strong> Copyright © 2025 CIV.IQ
                  </li>
                  <li>
                    • <strong>Logo & Branding:</strong> Trademark of CIV.IQ
                  </li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Government Data</h3>
                <p className="text-gray-700">
                  All government data remains in the public domain. We claim no ownership over this
                  data, and you are free to use it in accordance with each source's terms.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              Disclaimers and Limitations
            </h2>
            <div className="bg-red-50 rounded-xl p-6 space-y-4">
              <p className="text-gray-700">
                <strong>No Legal Advice:</strong> CIV.IQ provides information only. Nothing on this
                site constitutes legal, financial, or professional advice.
              </p>
              <p className="text-gray-700">
                <strong>No Endorsement:</strong> Display of representative information does not
                imply endorsement of any person, party, or position.
              </p>
              <p className="text-gray-700">
                <strong>Third-Party Content:</strong> We are not responsible for content on external
                sites we link to, including official government websites.
              </p>
              <p className="text-gray-700">
                <strong>Service Availability:</strong> We strive for reliability but cannot
                guarantee uninterrupted service. Downtime may occur for maintenance or other
                reasons.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Limitation of Liability</h2>
            <p className="text-gray-700 mb-4">
              To the fullest extent permitted by law, CIV.IQ and its contributors shall not be
              liable for:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Any indirect, incidental, or consequential damages</li>
              <li>Loss of data, profits, or business opportunities</li>
              <li>Errors or omissions in the data provided</li>
              <li>Actions taken based on information from our service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to Terms</h2>
            <p className="text-gray-700">
              We may update these terms occasionally. Continued use of CIV.IQ after changes
              constitutes acceptance of the new terms. For significant changes, we'll provide notice
              on our homepage.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Information</h2>
            <div className="bg-blue-50 rounded-xl p-6">
              <p className="text-gray-700 mb-2">For questions about these terms:</p>
              <p className="text-gray-900 font-medium">Email: legal@civ.iq</p>
              <p className="text-gray-900 font-medium">Web: https://civ.iq/contact</p>
            </div>
          </section>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-3 text-center">
                Open Source and Transparency
              </h3>
              <p className="text-sm text-gray-600 text-center">
                CIV.IQ is committed to transparency. Our code is open source and available on
                GitHub. We believe civic technology should be open, accessible, and serve the public
                good.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
