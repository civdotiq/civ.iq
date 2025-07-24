#!/usr/bin/env node

/**
 * Data Coverage Assessment Script
 * 
 * This script assesses the coverage and quality of our congress-legislators data
 * to help plan Phase 6: Complete Congressional Coverage
 */

const https = require('https');
const yaml = require('js-yaml');

async function fetchYAML(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      let data = '';
      response.on('data', (chunk) => data += chunk);
      response.on('end', () => {
        try {
          const parsed = yaml.load(data);
          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      });
    });
    
    request.on('error', reject);
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function assessDataCoverage() {
  console.log('🔍 Assessing Congress-Legislators Data Coverage...\n');
  
  try {
    // Fetch current legislators data
    console.log('📥 Fetching current legislators data...');
    const currentLegislators = await fetchYAML(
      'https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-current.yaml'
    );
    
    console.log('📥 Fetching social media data...');
    const socialMediaData = await fetchYAML(
      'https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-social-media.yaml'
    );
    
    // Analyze current legislators
    console.log('\n📊 CURRENT LEGISLATORS ANALYSIS');
    console.log('=====================================');
    
    const totalLegislators = currentLegislators.length;
    console.log(`Total Current Legislators: ${totalLegislators}`);
    
    // Breakdown by chamber
    const senateCount = currentLegislators.filter(leg => {
      const currentTerm = leg.terms[leg.terms.length - 1];
      return currentTerm.type === 'sen';
    }).length;
    
    const houseCount = currentLegislators.filter(leg => {
      const currentTerm = leg.terms[leg.terms.length - 1];
      return currentTerm.type === 'rep';
    }).length;
    
    console.log(`├─ Senate: ${senateCount} (Expected: 100)`);
    console.log(`├─ House: ${houseCount} (Expected: 435)`);
    console.log(`└─ Total Coverage: ${Math.round((totalLegislators / 535) * 100)}%`);
    
    // Data quality assessment
    console.log('\n📋 DATA QUALITY ASSESSMENT');
    console.log('============================');
    
    let completeProfiles = 0;
    const missingData = {
      bioguideId: 0,
      firstName: 0,
      lastName: 0,
      party: 0,
      state: 0,
      district: 0,
      phone: 0,
      website: 0,
      office: 0
    };
    
    currentLegislators.forEach(legislator => {
      const currentTerm = legislator.terms[legislator.terms.length - 1];
      let hasAllRequired = true;
      
      // Check required fields
      if (!legislator.id?.bioguide) {
        missingData.bioguideId++;
        hasAllRequired = false;
      }
      if (!legislator.name?.first) {
        missingData.firstName++;
        hasAllRequired = false;
      }
      if (!legislator.name?.last) {
        missingData.lastName++;
        hasAllRequired = false;
      }
      if (!currentTerm?.party) {
        missingData.party++;
        hasAllRequired = false;
      }
      if (!currentTerm?.state) {
        missingData.state++;
        hasAllRequired = false;
      }
      if (currentTerm?.type === 'rep' && !currentTerm?.district) {
        missingData.district++;
        hasAllRequired = false;
      }
      if (!currentTerm?.phone) {
        missingData.phone++;
        hasAllRequired = false;
      }
      if (!currentTerm?.url) {
        missingData.website++;
        hasAllRequired = false;
      }
      if (!currentTerm?.office && !currentTerm?.address) {
        missingData.office++;
        hasAllRequired = false;
      }
      
      if (hasAllRequired) {
        completeProfiles++;
      }
    });
    
    console.log(`Complete Profiles: ${completeProfiles}/${totalLegislators} (${Math.round((completeProfiles / totalLegislators) * 100)}%)`);
    console.log('\nMissing Data Summary:');
    Object.entries(missingData).forEach(([field, count]) => {
      const percentage = Math.round((count / totalLegislators) * 100);
      console.log(`├─ ${field}: ${count} missing (${percentage}%)`);
    });
    
    // Social media coverage
    console.log('\n📱 SOCIAL MEDIA COVERAGE');
    console.log('=========================');
    
    const socialMediaMap = new Map();
    socialMediaData.forEach(sm => {
      if (sm.id?.bioguide) {
        socialMediaMap.set(sm.id.bioguide, sm.social || {});
      }
    });
    
    const socialMediaStats = {
      total: 0,
      twitter: 0,
      facebook: 0,
      youtube: 0,
      instagram: 0
    };
    
    currentLegislators.forEach(legislator => {
      const bioguideId = legislator.id?.bioguide;
      if (bioguideId && socialMediaMap.has(bioguideId)) {
        const social = socialMediaMap.get(bioguideId);
        socialMediaStats.total++;
        if (social.twitter) socialMediaStats.twitter++;
        if (social.facebook) socialMediaStats.facebook++;
        if (social.youtube) socialMediaStats.youtube++;
        if (social.instagram) socialMediaStats.instagram++;
      }
    });
    
    console.log(`Legislators with Social Media: ${socialMediaStats.total}/${totalLegislators} (${Math.round((socialMediaStats.total / totalLegislators) * 100)}%)`);
    console.log('Platform Coverage:');
    Object.entries(socialMediaStats).forEach(([platform, count]) => {
      if (platform !== 'total') {
        const percentage = Math.round((count / totalLegislators) * 100);
        console.log(`├─ ${platform}: ${count} (${percentage}%)`);
      }
    });
    
    // State distribution
    console.log('\n🗺️  STATE DISTRIBUTION');
    console.log('======================');
    
    const stateDistribution = {};
    currentLegislators.forEach(legislator => {
      const currentTerm = legislator.terms[legislator.terms.length - 1];
      const state = currentTerm?.state;
      if (state) {
        stateDistribution[state] = (stateDistribution[state] || 0) + 1;
      }
    });
    
    const sortedStates = Object.entries(stateDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    console.log('Top 10 States by Representative Count:');
    sortedStates.forEach(([state, count]) => {
      console.log(`├─ ${state}: ${count} representatives`);
    });
    
    // Phase 6 recommendations
    console.log('\n🎯 PHASE 6 RECOMMENDATIONS');
    console.log('============================');
    
    const totalCoverage = Math.round((totalLegislators / 535) * 100);
    const qualityScore = Math.round((completeProfiles / totalLegislators) * 100);
    const socialMediaScore = Math.round((socialMediaStats.total / totalLegislators) * 100);
    
    console.log(`📊 Overall Scores:`);
    console.log(`├─ Coverage: ${totalCoverage}%`);
    console.log(`├─ Data Quality: ${qualityScore}%`);
    console.log(`└─ Social Media: ${socialMediaScore}%`);
    
    console.log('\n🚧 Priority Tasks for Phase 6:');
    
    if (totalCoverage < 100) {
      console.log(`❗ HIGH: Missing ${535 - totalLegislators} legislators (${100 - totalCoverage}% gap)`);
    }
    
    if (qualityScore < 95) {
      console.log(`❗ HIGH: ${totalLegislators - completeProfiles} legislators have incomplete data`);
    }
    
    if (missingData.phone > totalLegislators * 0.1) {
      console.log(`⚠️  MEDIUM: ${missingData.phone} legislators missing phone numbers`);
    }
    
    if (missingData.website > totalLegislators * 0.1) {
      console.log(`⚠️  MEDIUM: ${missingData.website} legislators missing websites`);
    }
    
    if (socialMediaScore < 80) {
      console.log(`ℹ️  LOW: Social media coverage could be improved (${100 - socialMediaScore}% gap)`);
    }
    
    console.log('\n✅ READY FOR PRODUCTION:');
    console.log(`${totalCoverage >= 99 && qualityScore >= 95 ? '✅' : '❌'} Data coverage meets production standards`);
    console.log(`${missingData.bioguideId === 0 ? '✅' : '❌'} All legislators have bioguide IDs`);
    console.log(`${missingData.firstName === 0 && missingData.lastName === 0 ? '✅' : '❌'} All legislators have names`);
    console.log(`${missingData.party === 0 ? '✅' : '❌'} All legislators have party affiliations`);
    console.log(`${senateCount >= 95 && houseCount >= 425 ? '✅' : '❌'} Chamber representation is adequate`);
    
  } catch (error) {
    console.error('❌ Error assessing data coverage:', error.message);
    process.exit(1);
  }
}

// Add js-yaml dependency check
try {
  require('js-yaml');
} catch (error) {
  console.error('❌ Missing dependency: js-yaml');
  console.log('📦 Install with: npm install js-yaml');
  process.exit(1);
}

// Run assessment
assessDataCoverage().then(() => {
  console.log('\n🎉 Data coverage assessment complete!');
}).catch((error) => {
  console.error('❌ Assessment failed:', error.message);
  process.exit(1);
});