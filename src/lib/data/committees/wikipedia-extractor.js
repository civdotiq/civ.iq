/* eslint-disable no-console -- Browser console script uses console.log for output */
/**
 * Script to help extract committee data from Wikipedia or other sources
 * Run this in the browser console on the Wikipedia page to extract member lists
 */

// Example usage on Wikipedia committee pages:
// 1. Go to https://en.wikipedia.org/wiki/119th_United_States_Congress#Committees
// 2. Open browser console
// 3. Paste and run this script
// 4. Copy the output to create committee data files

function extractCommitteeMembers() {
  // Find all committee tables on the page
  const committees = {};

  // Look for committee member lists
  document.querySelectorAll('h3, h4').forEach(header => {
    const text = header.textContent;
    if (text.includes('Committee on') || text.includes('committee')) {
      const committeeSection = header.nextElementSibling;

      if (committeeSection && committeeSection.tagName === 'UL') {
        const committeeName = text.trim();
        const members = [];

        committeeSection.querySelectorAll('li').forEach(li => {
          const links = li.querySelectorAll('a');
          links.forEach(link => {
            if (link.href.includes('/wiki/') && !link.href.includes(':')) {
              const name = link.textContent.trim();
              const role = li.textContent.includes('Chair')
                ? 'Chair'
                : li.textContent.includes('Ranking')
                  ? 'Ranking Member'
                  : 'Member';

              members.push({
                name,
                wikiUrl: link.href,
                role,
                fullText: li.textContent.trim(),
              });
            }
          });
        });

        if (members.length > 0) {
          committees[committeeName] = members;
        }
      }
    }
  });

  return committees;
}

// Helper to format member data for TypeScript
function formatMembersForTypeScript(members) {
  return members
    .map(member => {
      // Extract state and district from full text if available
      const stateMatch = member.fullText.match(/\(([A-Z]{2})(?:-(\d+))?\)/);
      const state = stateMatch ? stateMatch[1] : 'XX';
      const district = stateMatch && stateMatch[2] ? stateMatch[2] : undefined;

      // Guess party from context (this needs manual verification)
      const party = member.role === 'Chair' ? 'R' : member.role === 'Ranking Member' ? 'D' : 'R';

      return `  createRepresentative('[BIOGUIDE_ID]', '${member.name}', '${party}', '${state}'${district ? `, '${district}'` : ''}),`;
    })
    .join('\n');
}

// Run the extraction
const committeeData = extractCommitteeMembers();
console.log('Extracted committee data:', committeeData);

// Format for TypeScript
Object.entries(committeeData).forEach(([committee, members]) => {
  console.log(`\n// ${committee}`);
  console.log('const members = [');
  console.log(formatMembersForTypeScript(members));
  console.log('];');
});
