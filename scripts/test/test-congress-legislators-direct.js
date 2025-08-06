// Test script to directly call our congress-legislators function
const yaml = require('js-yaml');

async function testCongressLegislatorsDirect() {
  try {
    console.log('Testing our congress-legislators function directly...\n');
    
    // This simulates what our getAllEnhancedRepresentatives function does
    console.log('1. Fetching legislators-current.yaml...');
    const legislatorsUrl = 'https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-current.yaml';
    const legislatorsResponse = await fetch(legislatorsUrl);
    const legislatorsYaml = await legislatorsResponse.text();
    const legislators = yaml.load(legislatorsYaml);
    
    console.log(`   Found ${legislators.length} legislators`);
    
    console.log('2. Fetching legislators-social-media.yaml...');
    const socialUrl = 'https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-social-media.yaml';
    const socialResponse = await fetch(socialUrl);
    const socialYaml = await socialResponse.text();
    const socialMedia = yaml.load(socialYaml);
    
    console.log(`   Found ${socialMedia.length} social media entries`);
    
    console.log('3. Processing legislators...\n');
    
    const enhanced = legislators.map(legislator => {
      const bioguideId = legislator.id.bioguide;
      const social = socialMedia.find(s => s.bioguide === bioguideId);
      const currentTerm = legislator.terms[legislator.terms.length - 1];
      
      return {
        bioguideId,
        name: `${legislator.name.first} ${legislator.name.last}`,
        firstName: legislator.name.first,
        lastName: legislator.name.last,
        party: currentTerm.party,
        state: currentTerm.state,
        district: currentTerm.district?.toString(),
        chamber: currentTerm.type === 'sen' ? 'Senate' : 'House',
        title: currentTerm.type === 'sen' ? 'U.S. Senator' : 'U.S. Representative',
        phone: currentTerm.phone,
        website: currentTerm.url,
        currentTerm: {
          startDate: currentTerm.start,
          endDate: currentTerm.end,
          phone: currentTerm.phone,
          website: currentTerm.url,
          office: currentTerm.office || currentTerm.address
        }
      };
    });
    
    console.log(`Processed ${enhanced.length} enhanced representatives`);
    
    // Check specific states
    const scReps = enhanced.filter(r => r.state === 'SC');
    console.log(`\\nSouth Carolina representatives: ${scReps.length}`);
    scReps.forEach(rep => {
      console.log(`  ${rep.name} (${rep.bioguideId}) - ${rep.chamber} ${rep.district ? 'District ' + rep.district : ''}`);
    });
    
    // Check for SC-04 specifically
    const sc04 = enhanced.find(r => r.state === 'SC' && r.district === '4');
    if (sc04) {
      console.log(`\\n✅ Found SC-04 representative: ${sc04.name} (${sc04.bioguideId})`);
    } else {
      console.log('\\n❌ SC-04 representative NOT FOUND');
    }
    
    // Count by chamber
    const senators = enhanced.filter(r => r.chamber === 'Senate').length;
    const houseReps = enhanced.filter(r => r.chamber === 'House').length;
    
    console.log(`\\nSummary:`);
    console.log(`  Senators: ${senators}`);
    console.log(`  House Reps: ${houseReps}`);
    console.log(`  Total: ${enhanced.length}`);
    
    // Test the filter logic that our API uses
    console.log('\\n4. Testing filter logic for SC-04...');
    const districtInfo = { state: 'SC', district: '04' };
    
    const filteredReps = enhanced.filter(rep => {
      if (rep.chamber === 'Senate' && rep.state === districtInfo.state) {
        return true;
      }
      if (rep.chamber === 'House' && 
          rep.state === districtInfo.state && 
          rep.district === districtInfo.district) {
        return true;
      }
      return false;
    });
    
    console.log(`Found ${filteredReps.length} representatives for SC-04:`);
    filteredReps.forEach(rep => {
      console.log(`  ${rep.name} - ${rep.chamber} ${rep.district ? 'District ' + rep.district : ''}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testCongressLegislatorsDirect();