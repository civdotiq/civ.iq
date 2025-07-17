// Debug script to examine the raw congress-legislators data
const yaml = require('js-yaml');

async function debugRawCongressData() {
  try {
    console.log('Fetching raw congress-legislators data...\n');
    
    // Fetch the raw YAML data directly from GitHub
    const url = 'https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-current.yaml';
    const response = await fetch(url);
    const yamlText = await response.text();
    
    console.log('Parsing YAML data...\n');
    const legislators = yaml.load(yamlText);
    
    console.log(`Total legislators in YAML: ${legislators.length}\n`);
    
    // Count by chamber
    const senatorCount = legislators.filter(leg => {
      const currentTerm = leg.terms[leg.terms.length - 1];
      return currentTerm.type === 'sen';
    }).length;
    
    const houseCount = legislators.filter(leg => {
      const currentTerm = leg.terms[leg.terms.length - 1];
      return currentTerm.type === 'rep';
    }).length;
    
    console.log(`Senators: ${senatorCount}`);
    console.log(`House Representatives: ${houseCount}\n`);
    
    // Check specific states
    const statesToCheck = ['SC', 'TX', 'IL', 'GA', 'CO', 'WA'];
    
    console.log('=== CHECKING SPECIFIC STATES ===');
    for (const state of statesToCheck) {
      const stateLegislators = legislators.filter(leg => {
        const currentTerm = leg.terms[leg.terms.length - 1];
        return currentTerm.state === state;
      });
      
      const senators = stateLegislators.filter(leg => {
        const currentTerm = leg.terms[leg.terms.length - 1];
        return currentTerm.type === 'sen';
      });
      
      const houseReps = stateLegislators.filter(leg => {
        const currentTerm = leg.terms[leg.terms.length - 1];
        return currentTerm.type === 'rep';
      });
      
      console.log(`\\n${state}:`);
      console.log(`  Senators (${senators.length}):`);
      senators.forEach(sen => {
        const term = sen.terms[sen.terms.length - 1];
        console.log(`    - ${sen.name.first} ${sen.name.last} (${sen.id.bioguide})`);
      });
      
      console.log(`  House Reps (${houseReps.length}):`);
      houseReps.forEach(rep => {
        const term = rep.terms[rep.terms.length - 1];
        console.log(`    - ${rep.name.first} ${rep.name.last} (${rep.id.bioguide}) District ${term.district}`);
      });
      
      if (houseReps.length === 0) {
        console.log(`    ❌ NO HOUSE REPS FOUND FOR ${state}!`);
      }
    }
    
    // Let's specifically check for SC-04 representative
    console.log('\\n=== LOOKING FOR SC-04 REPRESENTATIVE ===');
    const sc04 = legislators.filter(leg => {
      const currentTerm = leg.terms[leg.terms.length - 1];
      return currentTerm.state === 'SC' && currentTerm.type === 'rep' && currentTerm.district === 4;
    });
    
    if (sc04.length > 0) {
      console.log('Found SC-04 representative:');
      sc04.forEach(rep => {
        const term = rep.terms[rep.terms.length - 1];
        console.log(`  ${rep.name.first} ${rep.name.last} (${rep.id.bioguide})`);
        console.log(`  Term: ${term.start} to ${term.end}`);
        console.log(`  Party: ${term.party}`);
      });
    } else {
      console.log('❌ NO SC-04 REPRESENTATIVE FOUND IN RAW DATA');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugRawCongressData();