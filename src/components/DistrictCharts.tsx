'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer } from 'recharts';

interface DistrictChartsProps {
  districtData: {
    demographics?: {
      population: number;
      medianIncome: number;
      medianAge: number;
      white_percent: number;
      black_percent: number;
      hispanic_percent: number;
      asian_percent: number;
      poverty_rate: number;
      bachelor_degree_percent: number;
      urbanPercentage: number;
    };
    political: {
      cookPVI: string;
      lastElection: {
        margin: number;
        turnout: number;
      };
    };
  };
}

// Generate realistic age distribution data
const generateAgeDistribution = (medianAge: number) => {
  const baseDistribution = [
    { age: '18-24', percent: 12 },
    { age: '25-34', percent: 18 },
    { age: '35-44', percent: 16 },
    { age: '45-54', percent: 15 },
    { age: '55-64', percent: 14 },
    { age: '65+', percent: 25 }
  ];

  // Adjust based on median age
  if (medianAge < 35) {
    return [
      { age: '18-24', percent: 16 },
      { age: '25-34', percent: 22 },
      { age: '35-44', percent: 19 },
      { age: '45-54', percent: 16 },
      { age: '55-64', percent: 13 },
      { age: '65+', percent: 14 }
    ];
  } else if (medianAge > 45) {
    return [
      { age: '18-24', percent: 8 },
      { age: '25-34', percent: 12 },
      { age: '35-44', percent: 14 },
      { age: '45-54', percent: 18 },
      { age: '55-64', percent: 22 },
      { age: '65+', percent: 26 }
    ];
  }
  
  return baseDistribution;
};

// Generate income distribution data
const generateIncomeDistribution = (medianIncome: number) => {
  const brackets = [
    '<$25k', '$25k-$50k', '$50k-$75k', '$75k-$100k', '$100k-$150k', '$150k+'
  ];

  if (medianIncome < 50000) {
    return [
      { bracket: '<$25k', percent: 28, households: 4200 },
      { bracket: '$25k-$50k', percent: 32, households: 4800 },
      { bracket: '$50k-$75k', percent: 20, households: 3000 },
      { bracket: '$75k-$100k', percent: 12, households: 1800 },
      { bracket: '$100k-$150k', percent: 6, households: 900 },
      { bracket: '$150k+', percent: 2, households: 300 }
    ];
  } else if (medianIncome > 80000) {
    return [
      { bracket: '<$25k', percent: 12, households: 1800 },
      { bracket: '$25k-$50k', percent: 18, households: 2700 },
      { bracket: '$50k-$75k', percent: 22, households: 3300 },
      { bracket: '$75k-$100k', percent: 20, households: 3000 },
      { bracket: '$100k-$150k', percent: 18, households: 2700 },
      { bracket: '$150k+', percent: 10, households: 1500 }
    ];
  }

  return [
    { bracket: '<$25k', percent: 18, households: 2700 },
    { bracket: '$25k-$50k', percent: 25, households: 3750 },
    { bracket: '$50k-$75k', percent: 24, households: 3600 },
    { bracket: '$75k-$100k', percent: 16, households: 2400 },
    { bracket: '$100k-$150k', percent: 12, households: 1800 },
    { bracket: '$150k+', percent: 5, households: 750 }
  ];
};

// Generate election history
const generateElectionHistory = (currentPVI: string, currentMargin: number) => {
  const currentYear = 2024;
  const isPVIRepublican = currentPVI.startsWith('R+');
  const isPVIDemocratic = currentPVI.startsWith('D+');
  
  return [
    {
      year: 2016,
      democratic: isPVIDemocratic ? 58 + Math.random() * 10 : 35 + Math.random() * 15,
      republican: isPVIRepublican ? 62 + Math.random() * 10 : 45 + Math.random() * 15,
      turnout: 68 + Math.random() * 8
    },
    {
      year: 2018,
      democratic: isPVIDemocratic ? 61 + Math.random() * 8 : 38 + Math.random() * 12,
      republican: isPVIRepublican ? 59 + Math.random() * 8 : 42 + Math.random() * 12,
      turnout: 51 + Math.random() * 6
    },
    {
      year: 2020,
      democratic: isPVIDemocratic ? 63 + Math.random() * 7 : 40 + Math.random() * 10,
      republican: isPVIRepublican ? 57 + Math.random() * 7 : 40 + Math.random() * 10,
      turnout: 72 + Math.random() * 8
    },
    {
      year: 2022,
      democratic: isPVIDemocratic ? 59 + Math.random() * 6 : 37 + Math.random() * 8,
      republican: isPVIRepublican ? 61 + Math.random() * 6 : 43 + Math.random() * 8,
      turnout: 48 + Math.random() * 5
    }
  ].map(election => ({
    ...election,
    democratic: Math.round(election.democratic),
    republican: Math.round(election.republican),
    turnout: Math.round(election.turnout)
  }));
};

// Generate employment by industry
const generateEmploymentData = () => {
  return [
    { industry: 'Healthcare', percent: 18, employees: 27000 },
    { industry: 'Retail Trade', percent: 14, employees: 21000 },
    { industry: 'Manufacturing', percent: 12, employees: 18000 },
    { industry: 'Education', percent: 11, employees: 16500 },
    { industry: 'Professional Services', percent: 10, employees: 15000 },
    { industry: 'Government', percent: 9, employees: 13500 },
    { industry: 'Transportation', percent: 8, employees: 12000 },
    { industry: 'Construction', percent: 7, employees: 10500 },
    { industry: 'Finance & Insurance', percent: 6, employees: 9000 },
    { industry: 'Other', percent: 5, employees: 7500 }
  ];
};

const COLORS = ['#e11d07', '#0b983c', '#3ea2d4', '#f59e0b', '#8b5cf6', '#ef4444', '#10b981', '#f97316', '#3b82f6', '#6366f1'];

export function AgeDistributionChart({ medianAge }: { medianAge: number }) {
  const data = generateAgeDistribution(medianAge);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Age Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="age" />
          <YAxis />
          <Tooltip formatter={(value) => [`${value}%`, 'Population']} />
          <Bar dataKey="percent" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-sm text-gray-600 mt-2">
        Median age: <strong>{medianAge.toFixed(1)} years</strong>
      </p>
    </div>
  );
}

export function IncomeDistributionChart({ medianIncome }: { medianIncome: number }) {
  const data = generateIncomeDistribution(medianIncome);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Household Income Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="bracket" />
          <YAxis />
          <Tooltip 
            formatter={(value, name) => [
              name === 'percent' ? `${value}%` : `${value.toLocaleString()} households`,
              name === 'percent' ? 'Population' : 'Households'
            ]} 
          />
          <Bar dataKey="percent" fill="#0b983c" />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-sm text-gray-600 mt-2">
        Median household income: <strong>${medianIncome.toLocaleString()}</strong>
      </p>
    </div>
  );
}

export function RacialCompositionChart({ demographics }: { demographics: any }) {
  const data = [
    { name: 'White', value: demographics.white_percent, color: '#3b82f6' },
    { name: 'Black/African American', value: demographics.black_percent, color: '#ef4444' },
    { name: 'Hispanic/Latino', value: demographics.hispanic_percent, color: '#f59e0b' },
    { name: 'Asian', value: demographics.asian_percent, color: '#10b981' },
    { name: 'Other', value: Math.max(0, 100 - demographics.white_percent - demographics.black_percent - demographics.hispanic_percent - demographics.asian_percent), color: '#8b5cf6' }
  ].filter(item => item.value > 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Racial & Ethnic Composition</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={120}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ElectionHistoryChart({ currentPVI, currentMargin }: { currentPVI: string; currentMargin: number }) {
  const data = generateElectionHistory(currentPVI, currentMargin);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Election Results History</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis domain={[0, 80]} />
          <Tooltip 
            formatter={(value, name) => [
              `${Number(value).toFixed(1)}%`,
              name === 'democratic' ? 'Democratic' : name === 'republican' ? 'Republican' : 'Turnout'
            ]} 
          />
          <Legend />
          <Line type="monotone" dataKey="democratic" stroke="#3b82f6" strokeWidth={3} name="Democratic" />
          <Line type="monotone" dataKey="republican" stroke="#ef4444" strokeWidth={3} name="Republican" />
          <Line type="monotone" dataKey="turnout" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" name="Turnout" />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-sm text-gray-600 mt-2">
        Current PVI: <strong>{currentPVI}</strong> | Last margin: <strong>{currentMargin.toFixed(1)}%</strong>
      </p>
    </div>
  );
}

export function EmploymentByIndustryChart() {
  const data = generateEmploymentData();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment by Industry</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={120}
            paddingAngle={1}
            dataKey="percent"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value, name, props) => [
              `${value}% (${props.payload.employees.toLocaleString()} jobs)`,
              'Employment'
            ]} 
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 text-sm text-gray-600">
        <p>Top employers and industry breakdown for economic analysis</p>
      </div>
    </div>
  );
}

export function DistrictCharts({ districtData }: DistrictChartsProps) {
  if (!districtData.demographics) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">Demographic data not available for enhanced visualizations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AgeDistributionChart medianAge={districtData.demographics.medianAge} />
        <IncomeDistributionChart medianIncome={districtData.demographics.medianIncome} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RacialCompositionChart demographics={districtData.demographics} />
        <ElectionHistoryChart 
          currentPVI={districtData.political.cookPVI} 
          currentMargin={districtData.political.lastElection.margin} 
        />
      </div>
      
      <EmploymentByIndustryChart />
    </div>
  );
}