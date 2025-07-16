'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Users, Building2, MapPin, Vote } from 'lucide-react';

interface NationalStatsCardsProps {
  districts?: Array<{
    representative: {
      party: string;
    };
    demographics: {
      population: number;
    };
  }>;
}

export default function NationalStatsCards({ districts = [] }: NationalStatsCardsProps) {
  // Calculate stats from district data
  const republicanSeats = districts.filter(d => d.representative.party === 'R').length;
  const democraticSeats = districts.filter(d => d.representative.party === 'D').length;
  const totalPopulation = districts.reduce((sum, d) => sum + d.demographics.population, 0);

  // Senate composition (as of 2024)
  const senateRepublican = 49;
  const senateDemocratic = 47;
  const senateIndependent = 4;

  const stats = [
    {
      title: 'House of Representatives',
      value: '435 Seats',
      subtitle: `R: ${republicanSeats} | D: ${democraticSeats}`,
      icon: Building2,
      color: 'blue'
    },
    {
      title: 'US Senate',
      value: '100 Seats', 
      subtitle: `R: ${senateRepublican} | D: ${senateDemocratic} | I: ${senateIndependent}`,
      icon: Vote,
      color: 'green'
    },
    {
      title: 'Total Population',
      value: totalPopulation > 0 ? `${(totalPopulation / 1000000).toFixed(1)}M` : '331.9M',
      subtitle: '2020 Census',
      icon: Users,
      color: 'purple'
    },
    {
      title: 'Congressional Districts',
      value: '435 Districts',
      subtitle: 'Across 50 States',
      icon: MapPin,
      color: 'orange'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      green: 'bg-green-50 text-green-600 border-green-200', 
      purple: 'bg-purple-50 text-purple-600 border-purple-200',
      orange: 'bg-orange-50 text-orange-600 border-orange-200'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const colorClasses = getColorClasses(stat.color);
        
        return (
          <div key={index} className="bg-white rounded-lg shadow-md border hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg border ${colorClasses}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">{stat.title}</h3>
                <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.subtitle}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}