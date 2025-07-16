'use client';


/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { ExternalLink, Database, Shield, RefreshCw, Key, Code, CheckCircle2 } from 'lucide-react';

export default function DataSourcesPage() {
  const dataSources = [
    {
      name: 'Congress-Legislators',
      provider: 'unitedstates/congress-legislators',
      description: 'Comprehensive biographical and political data for members of Congress',
      features: [
        'Biographical information and photos',
        'Committee assignments and leadership roles',
        'Contact information and social media',
        'Historical data back to the First Congress'
      ],
      dataTypes: ['Representatives', 'Senators', 'Committees', 'Social Media'],
      updateFrequency: 'Daily',
      authentication: 'None required',
      documentation: 'https://github.com/unitedstates/congress-legislators',
      icon: Database
    },
    {
      name: 'Congress.gov API',
      provider: 'Library of Congress',
      description: 'Official legislative information from the U.S. Congress',
      features: [
        'Real-time voting records',
        'Bill text and status tracking',
        'Committee reports and hearings',
        'Congressional Record'
      ],
      dataTypes: ['Bills', 'Votes', 'Committees', 'Members'],
      updateFrequency: 'Real-time',
      authentication: 'API Key required',
      documentation: 'https://api.congress.gov/',
      icon: Shield
    },
    {
      name: 'FEC API',
      provider: 'Federal Election Commission',
      description: 'Campaign finance data for federal elections',
      features: [
        'Individual and PAC contributions',
        'Campaign expenditures',
        'Financial disclosures',
        'Independent expenditures'
      ],
      dataTypes: ['Contributions', 'Expenditures', 'Filings', 'Candidates'],
      updateFrequency: 'Daily',
      authentication: 'API Key required',
      documentation: 'https://api.open.fec.gov/developers/',
      icon: Key
    },
    {
      name: 'Census API',
      provider: 'U.S. Census Bureau',
      description: 'Demographic and geographic data for congressional districts',
      features: [
        'American Community Survey (ACS) data',
        'District boundaries (TIGER/Line)',
        'Population demographics',
        'Economic indicators'
      ],
      dataTypes: ['Demographics', 'Geography', 'Economics', 'Housing'],
      updateFrequency: 'Annual (ACS), Decennial (Census)',
      authentication: 'API Key required',
      documentation: 'https://www.census.gov/data/developers.html',
      icon: RefreshCw
    },
    {
      name: 'GDELT Project',
      provider: 'GDELT',
      description: 'Global news monitoring and analysis',
      features: [
        'Real-time news coverage',
        'Sentiment analysis',
        'Entity recognition',
        'Global event database'
      ],
      dataTypes: ['News Articles', 'Events', 'Mentions', 'Sentiment'],
      updateFrequency: '15-minute updates',
      authentication: 'None required',
      documentation: 'https://www.gdeltproject.org/data.html',
      icon: Code
    },
    {
      name: 'OpenStates API',
      provider: 'OpenStates.org',
      description: 'State legislative data (planned for Phase 2)',
      features: [
        'State legislators and committees',
        'State bills and votes',
        'Legislative sessions',
        'District boundaries'
      ],
      dataTypes: ['State Legislators', 'State Bills', 'State Votes', 'Districts'],
      updateFrequency: 'Daily',
      authentication: 'API Key required',
      documentation: 'https://docs.openstates.org/',
      icon: Database,
      status: 'planned'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Data Sources
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            CIV.IQ aggregates data exclusively from official government sources and trusted civic data providers to ensure accuracy and transparency.
          </p>
        </div>

        <div className="grid gap-8 mb-16">
          {dataSources.map((source) => {
            const Icon = source.icon;
            return (
              <div
                key={source.name}
                className={`bg-white rounded-2xl shadow-lg p-8 border transition-all duration-300 hover:shadow-xl ${
                  source.status === 'planned' 
                    ? 'border-gray-200 opacity-75' 
                    : 'border-gray-100 hover:border-blue-200'
                }`}
              >
                <div className="flex items-start gap-6">
                  <div className={`p-4 rounded-xl ${
                    source.status === 'planned'
                      ? 'bg-gray-100'
                      : 'bg-gradient-to-br from-blue-50 to-green-50'
                  }`}>
                    <Icon className={`w-8 h-8 ${
                      source.status === 'planned' ? 'text-gray-400' : 'text-blue-600'
                    }`} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold text-gray-900">{source.name}</h2>
                      {source.status === 'planned' && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                          Coming in Phase 2
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 mb-4">{source.provider}</p>
                    <p className="text-gray-700 mb-6">{source.description}</p>
                    
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          Features
                        </h3>
                        <ul className="space-y-2">
                          {source.features.map((feature, index) => (
                            <li key={index} className="text-gray-600 flex items-start gap-2">
                              <span className="text-green-600 mt-1">•</span>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">Data Types</h3>
                          <div className="flex flex-wrap gap-2">
                            {source.dataTypes.map((type, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full"
                              >
                                {type}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Update Frequency:</span>
                            <p className="font-semibold text-gray-900">{source.updateFrequency}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Authentication:</span>
                            <p className="font-semibold text-gray-900">{source.authentication}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {source.status !== 'planned' && (
                      <a
                        href={source.documentation}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        View Documentation
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-8 md:p-12">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Data Quality Commitment
            </h2>
            <p className="text-lg text-gray-700 mb-8">
              We maintain the highest standards for data accuracy and freshness:
            </p>
            
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="bg-white/80 backdrop-blur rounded-xl p-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Official Sources Only</h3>
                <p className="text-gray-600">
                  All data comes directly from government agencies and official civic data providers.
                </p>
              </div>
              
              <div className="bg-white/80 backdrop-blur rounded-xl p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <RefreshCw className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Regular Updates</h3>
                <p className="text-gray-600">
                  Data is refreshed according to each source's update schedule, many in real-time.
                </p>
              </div>
              
              <div className="bg-white/80 backdrop-blur rounded-xl p-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Database className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Intelligent Caching</h3>
                <p className="text-gray-600">
                  Smart caching ensures fast performance while maintaining data freshness.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}