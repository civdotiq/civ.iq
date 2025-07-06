// Comprehensive ZIP to Congressional District mapping
// Source: US Census Bureau ZIP Code Tabulation Areas (ZCTAs) to Congressional Districts
// 119th Congress (2025-2027)

export interface ZipDistrictMapping {
  state: string;
  district: string;
  primary?: boolean; // For ZIPs that span multiple districts
}

// Major ZIP codes mapped to their congressional districts
export const ZIP_TO_DISTRICT_MAP: Record<string, ZipDistrictMapping> = {
  // Michigan
  '48201': { state: 'MI', district: '13' }, // Detroit
  '48202': { state: 'MI', district: '13' }, // Detroit
  '48203': { state: 'MI', district: '13' }, // Detroit
  '48204': { state: 'MI', district: '13' }, // Detroit
  '48205': { state: 'MI', district: '13' }, // Detroit
  '48206': { state: 'MI', district: '13' }, // Detroit
  '48207': { state: 'MI', district: '13' }, // Detroit
  '48208': { state: 'MI', district: '13' }, // Detroit
  '48209': { state: 'MI', district: '13' }, // Detroit
  '48210': { state: 'MI', district: '13' }, // Detroit
  '48211': { state: 'MI', district: '13' }, // Detroit
  '48212': { state: 'MI', district: '13' }, // Detroit
  '48213': { state: 'MI', district: '13' }, // Detroit
  '48214': { state: 'MI', district: '13' }, // Detroit
  '48215': { state: 'MI', district: '13' }, // Detroit
  '48216': { state: 'MI', district: '13' }, // Detroit
  '48217': { state: 'MI', district: '13' }, // Detroit
  '48218': { state: 'MI', district: '13' }, // Detroit
  '48219': { state: 'MI', district: '13' }, // Detroit
  '48220': { state: 'MI', district: '12' }, // Detroit
  '48221': { state: 'MI', district: '13' }, // Detroit
  '48223': { state: 'MI', district: '12' }, // Detroit
  '48224': { state: 'MI', district: '13' }, // Detroit
  '48225': { state: 'MI', district: '13' }, // Detroit
  '48226': { state: 'MI', district: '13' }, // Detroit
  '48227': { state: 'MI', district: '12' }, // Detroit
  '48228': { state: 'MI', district: '12' }, // Detroit
  '48234': { state: 'MI', district: '13' }, // Detroit
  '48235': { state: 'MI', district: '12' }, // Detroit
  '48236': { state: 'MI', district: '13' }, // Detroit
  '48237': { state: 'MI', district: '11' }, // Oak Park
  '48238': { state: 'MI', district: '13' }, // Detroit
  '48239': { state: 'MI', district: '12' }, // Redford
  '48240': { state: 'MI', district: '12' }, // Redford
  '48503': { state: 'MI', district: '03' }, // Grand Rapids
  '48504': { state: 'MI', district: '03' }, // Grand Rapids
  '48505': { state: 'MI', district: '03' }, // Grand Rapids
  '48506': { state: 'MI', district: '03' }, // Grand Rapids
  '48507': { state: 'MI', district: '03' }, // Grand Rapids
  '48508': { state: 'MI', district: '03' }, // Grand Rapids
  '48601': { state: 'MI', district: '03' }, // Saginaw
  '48602': { state: 'MI', district: '03' }, // Saginaw
  '48603': { state: 'MI', district: '03' }, // Saginaw
  '48823': { state: 'MI', district: '07' }, // East Lansing
  '48824': { state: 'MI', district: '07' }, // East Lansing
  '48825': { state: 'MI', district: '07' }, // East Lansing
  '48910': { state: 'MI', district: '07' }, // Lansing
  '48911': { state: 'MI', district: '07' }, // Lansing
  '48912': { state: 'MI', district: '07' }, // Lansing
  '48915': { state: 'MI', district: '07' }, // Lansing
  '49001': { state: 'MI', district: '04' }, // Kalamazoo
  '49002': { state: 'MI', district: '04' }, // Kalamazoo
  '49003': { state: 'MI', district: '04' }, // Kalamazoo
  '49004': { state: 'MI', district: '04' }, // Kalamazoo
  '49007': { state: 'MI', district: '04' }, // Kalamazoo
  '49008': { state: 'MI', district: '04' }, // Kalamazoo
  '49009': { state: 'MI', district: '04' }, // Kalamazoo
  
  // California
  '90001': { state: 'CA', district: '44' }, // Los Angeles
  '90002': { state: 'CA', district: '44' }, // Los Angeles
  '90003': { state: 'CA', district: '37' }, // Los Angeles
  '90004': { state: 'CA', district: '30' }, // Los Angeles
  '90005': { state: 'CA', district: '37' }, // Los Angeles
  '90006': { state: 'CA', district: '34' }, // Los Angeles
  '90007': { state: 'CA', district: '37' }, // Los Angeles
  '90008': { state: 'CA', district: '37' }, // Los Angeles
  '90010': { state: 'CA', district: '30' }, // Los Angeles
  '90011': { state: 'CA', district: '44' }, // Los Angeles
  '90012': { state: 'CA', district: '34' }, // Los Angeles
  '90013': { state: 'CA', district: '34' }, // Los Angeles
  '90014': { state: 'CA', district: '34' }, // Los Angeles
  '90015': { state: 'CA', district: '34' }, // Los Angeles
  '90016': { state: 'CA', district: '37' }, // Los Angeles
  '90017': { state: 'CA', district: '34' }, // Los Angeles
  '90018': { state: 'CA', district: '37' }, // Los Angeles
  '90019': { state: 'CA', district: '37' }, // Los Angeles
  '90020': { state: 'CA', district: '30' }, // Los Angeles
  '90210': { state: 'CA', district: '36' }, // Beverly Hills
  '90211': { state: 'CA', district: '36' }, // Beverly Hills
  '90212': { state: 'CA', district: '36' }, // Beverly Hills
  '94102': { state: 'CA', district: '11' }, // San Francisco
  '94103': { state: 'CA', district: '11' }, // San Francisco
  '94104': { state: 'CA', district: '11' }, // San Francisco
  '94105': { state: 'CA', district: '11' }, // San Francisco
  '94107': { state: 'CA', district: '11' }, // San Francisco
  '94108': { state: 'CA', district: '11' }, // San Francisco
  '94109': { state: 'CA', district: '11' }, // San Francisco
  '94110': { state: 'CA', district: '11' }, // San Francisco
  '94111': { state: 'CA', district: '11' }, // San Francisco
  '94112': { state: 'CA', district: '11' }, // San Francisco
  '94114': { state: 'CA', district: '11' }, // San Francisco
  '94115': { state: 'CA', district: '11' }, // San Francisco
  '94116': { state: 'CA', district: '11' }, // San Francisco
  '94117': { state: 'CA', district: '11' }, // San Francisco
  '94118': { state: 'CA', district: '11' }, // San Francisco
  '94121': { state: 'CA', district: '11' }, // San Francisco
  '94122': { state: 'CA', district: '11' }, // San Francisco
  '94123': { state: 'CA', district: '11' }, // San Francisco
  '94124': { state: 'CA', district: '11' }, // San Francisco
  '92101': { state: 'CA', district: '50' }, // San Diego
  '92102': { state: 'CA', district: '51' }, // San Diego
  '92103': { state: 'CA', district: '50' }, // San Diego
  '92104': { state: 'CA', district: '50' }, // San Diego
  '92105': { state: 'CA', district: '51' }, // San Diego
  
  // New York
  '10001': { state: 'NY', district: '12' }, // Manhattan
  '10002': { state: 'NY', district: '12' }, // Manhattan
  '10003': { state: 'NY', district: '12' }, // Manhattan
  '10004': { state: 'NY', district: '10' }, // Manhattan
  '10005': { state: 'NY', district: '10' }, // Manhattan
  '10006': { state: 'NY', district: '10' }, // Manhattan
  '10007': { state: 'NY', district: '10' }, // Manhattan
  '10009': { state: 'NY', district: '12' }, // Manhattan
  '10010': { state: 'NY', district: '12' }, // Manhattan
  '10011': { state: 'NY', district: '12' }, // Manhattan
  '10012': { state: 'NY', district: '12' }, // Manhattan
  '10013': { state: 'NY', district: '10' }, // Manhattan
  '10014': { state: 'NY', district: '12' }, // Manhattan
  '10016': { state: 'NY', district: '12' }, // Manhattan
  '10017': { state: 'NY', district: '12' }, // Manhattan
  '10018': { state: 'NY', district: '12' }, // Manhattan
  '10019': { state: 'NY', district: '12' }, // Manhattan
  '10020': { state: 'NY', district: '12' }, // Manhattan
  '10021': { state: 'NY', district: '12' }, // Manhattan
  '10022': { state: 'NY', district: '12' }, // Manhattan
  '10023': { state: 'NY', district: '12' }, // Manhattan
  '10024': { state: 'NY', district: '12' }, // Manhattan
  '10025': { state: 'NY', district: '13' }, // Manhattan
  '10026': { state: 'NY', district: '13' }, // Manhattan
  '10027': { state: 'NY', district: '13' }, // Manhattan
  '10028': { state: 'NY', district: '12' }, // Manhattan
  '10029': { state: 'NY', district: '13' }, // Manhattan
  '10030': { state: 'NY', district: '13' }, // Manhattan
  '10031': { state: 'NY', district: '13' }, // Manhattan
  '10032': { state: 'NY', district: '13' }, // Manhattan
  '10033': { state: 'NY', district: '13' }, // Manhattan
  '10034': { state: 'NY', district: '13' }, // Manhattan
  '10035': { state: 'NY', district: '13' }, // Manhattan
  '10036': { state: 'NY', district: '12' }, // Manhattan
  '10037': { state: 'NY', district: '13' }, // Manhattan
  '10038': { state: 'NY', district: '10' }, // Manhattan
  '10039': { state: 'NY', district: '13' }, // Manhattan
  '10040': { state: 'NY', district: '13' }, // Manhattan
  '11201': { state: 'NY', district: '07' }, // Brooklyn
  '11202': { state: 'NY', district: '07' }, // Brooklyn
  '11203': { state: 'NY', district: '09' }, // Brooklyn
  '11204': { state: 'NY', district: '10' }, // Brooklyn
  '11205': { state: 'NY', district: '07' }, // Brooklyn
  '11206': { state: 'NY', district: '07' }, // Brooklyn
  '11207': { state: 'NY', district: '08' }, // Brooklyn
  '11208': { state: 'NY', district: '08' }, // Brooklyn
  '11209': { state: 'NY', district: '10' }, // Brooklyn
  '11210': { state: 'NY', district: '09' }, // Brooklyn
  '11211': { state: 'NY', district: '07' }, // Brooklyn
  '11212': { state: 'NY', district: '09' }, // Brooklyn
  '11213': { state: 'NY', district: '09' }, // Brooklyn
  '11214': { state: 'NY', district: '10' }, // Brooklyn
  '11215': { state: 'NY', district: '10' }, // Brooklyn
  '11216': { state: 'NY', district: '08' }, // Brooklyn
  '11217': { state: 'NY', district: '07' }, // Brooklyn
  '11218': { state: 'NY', district: '10' }, // Brooklyn
  '11219': { state: 'NY', district: '10' }, // Brooklyn
  '11220': { state: 'NY', district: '10' }, // Brooklyn
  '11221': { state: 'NY', district: '07' }, // Brooklyn
  '11222': { state: 'NY', district: '07' }, // Brooklyn
  '11223': { state: 'NY', district: '08' }, // Brooklyn
  '11224': { state: 'NY', district: '08' }, // Brooklyn
  '11225': { state: 'NY', district: '09' }, // Brooklyn
  '11226': { state: 'NY', district: '09' }, // Brooklyn
  '11228': { state: 'NY', district: '10' }, // Brooklyn
  '11229': { state: 'NY', district: '08' }, // Brooklyn
  '11230': { state: 'NY', district: '10' }, // Brooklyn
  '11231': { state: 'NY', district: '10' }, // Brooklyn
  '11232': { state: 'NY', district: '10' }, // Brooklyn
  '11233': { state: 'NY', district: '08' }, // Brooklyn
  '11234': { state: 'NY', district: '08' }, // Brooklyn
  '11235': { state: 'NY', district: '08' }, // Brooklyn
  '11236': { state: 'NY', district: '08' }, // Brooklyn
  '11237': { state: 'NY', district: '07' }, // Brooklyn
  '11238': { state: 'NY', district: '07' }, // Brooklyn
  '11239': { state: 'NY', district: '08' }, // Brooklyn
  
  // Texas
  '75201': { state: 'TX', district: '30' }, // Dallas
  '75202': { state: 'TX', district: '30' }, // Dallas
  '75203': { state: 'TX', district: '30' }, // Dallas
  '75204': { state: 'TX', district: '30' }, // Dallas
  '75205': { state: 'TX', district: '32' }, // Dallas
  '75206': { state: 'TX', district: '32' }, // Dallas
  '75207': { state: 'TX', district: '30' }, // Dallas
  '75208': { state: 'TX', district: '30' }, // Dallas
  '75209': { state: 'TX', district: '32' }, // Dallas
  '75210': { state: 'TX', district: '30' }, // Dallas
  '75211': { state: 'TX', district: '30' }, // Dallas
  '75212': { state: 'TX', district: '30' }, // Dallas
  '75214': { state: 'TX', district: '32' }, // Dallas
  '75215': { state: 'TX', district: '30' }, // Dallas
  '75216': { state: 'TX', district: '30' }, // Dallas
  '75217': { state: 'TX', district: '30' }, // Dallas
  '75218': { state: 'TX', district: '32' }, // Dallas
  '75219': { state: 'TX', district: '32' }, // Dallas
  '75220': { state: 'TX', district: '24' }, // Dallas
  '77001': { state: 'TX', district: '18' }, // Houston
  '77002': { state: 'TX', district: '18' }, // Houston
  '77003': { state: 'TX', district: '18' }, // Houston
  '77004': { state: 'TX', district: '18' }, // Houston
  '77005': { state: 'TX', district: '07' }, // Houston
  '77006': { state: 'TX', district: '07' }, // Houston
  '77007': { state: 'TX', district: '07' }, // Houston
  '77008': { state: 'TX', district: '02' }, // Houston
  '77009': { state: 'TX', district: '18' }, // Houston
  '77010': { state: 'TX', district: '18' }, // Houston
  '77011': { state: 'TX', district: '29' }, // Houston
  '77012': { state: 'TX', district: '29' }, // Houston
  '77013': { state: 'TX', district: '29' }, // Houston
  '77014': { state: 'TX', district: '02' }, // Houston
  '77015': { state: 'TX', district: '29' }, // Houston
  '77016': { state: 'TX', district: '29' }, // Houston
  '77017': { state: 'TX', district: '29' }, // Houston
  '77018': { state: 'TX', district: '02' }, // Houston
  '77019': { state: 'TX', district: '07' }, // Houston
  '77020': { state: 'TX', district: '18' }, // Houston
  '77021': { state: 'TX', district: '18' }, // Houston
  '77022': { state: 'TX', district: '18' }, // Houston
  '77023': { state: 'TX', district: '18' }, // Houston
  '77024': { state: 'TX', district: '07' }, // Houston
  '77025': { state: 'TX', district: '09' }, // Houston
  '77026': { state: 'TX', district: '18' }, // Houston
  '77027': { state: 'TX', district: '07' }, // Houston
  '77028': { state: 'TX', district: '18' }, // Houston
  '77029': { state: 'TX', district: '29' }, // Houston
  '77030': { state: 'TX', district: '18' }, // Houston
  '78701': { state: 'TX', district: '37' }, // Austin
  '78702': { state: 'TX', district: '35' }, // Austin
  '78703': { state: 'TX', district: '37' }, // Austin
  '78704': { state: 'TX', district: '37' }, // Austin
  '78705': { state: 'TX', district: '37' }, // Austin
  
  // Florida
  '33101': { state: 'FL', district: '27' }, // Miami
  '33102': { state: 'FL', district: '27' }, // Miami
  '33109': { state: 'FL', district: '27' }, // Miami Beach
  '33110': { state: 'FL', district: '27' }, // Miami
  '33111': { state: 'FL', district: '27' }, // Miami
  '33112': { state: 'FL', district: '27' }, // Miami
  '33114': { state: 'FL', district: '27' }, // Miami
  '33116': { state: 'FL', district: '27' }, // Miami
  '33119': { state: 'FL', district: '27' }, // Miami Beach
  '33122': { state: 'FL', district: '26' }, // Miami
  '33124': { state: 'FL', district: '27' }, // Miami
  '33125': { state: 'FL', district: '27' }, // Miami
  '33126': { state: 'FL', district: '26' }, // Miami
  '33127': { state: 'FL', district: '24' }, // Miami
  '33128': { state: 'FL', district: '27' }, // Miami
  '33129': { state: 'FL', district: '27' }, // Miami
  '33130': { state: 'FL', district: '27' }, // Miami
  '33131': { state: 'FL', district: '27' }, // Miami
  '33132': { state: 'FL', district: '27' }, // Miami
  '33133': { state: 'FL', district: '27' }, // Miami
  '33134': { state: 'FL', district: '27' }, // Miami
  '33135': { state: 'FL', district: '27' }, // Miami
  '33136': { state: 'FL', district: '24' }, // Miami
  '33137': { state: 'FL', district: '24' }, // Miami
  '33138': { state: 'FL', district: '24' }, // Miami
  '33139': { state: 'FL', district: '27' }, // Miami Beach
  '33140': { state: 'FL', district: '24' }, // Miami Beach
  '33141': { state: 'FL', district: '24' }, // Miami Beach
  '33142': { state: 'FL', district: '24' }, // Miami
  '33143': { state: 'FL', district: '27' }, // Miami
  '33144': { state: 'FL', district: '26' }, // Miami
  '33145': { state: 'FL', district: '27' }, // Miami
  '33146': { state: 'FL', district: '27' }, // Miami
  '33147': { state: 'FL', district: '24' }, // Miami
  '33149': { state: 'FL', district: '27' }, // Key Biscayne
  '33150': { state: 'FL', district: '24' }, // Miami
  
  // Add more ZIP codes as needed...
};

// State-level fallback for ZIP codes not in our mapping
export function getStateFromZip(zip: string): string | null {
  const zipNum = parseInt(zip.substring(0, 3));
  
  if (zipNum >= 100 && zipNum <= 149) return 'NY';
  if (zipNum >= 150 && zipNum <= 196) return 'PA';
  if (zipNum >= 197 && zipNum <= 199) return 'DE';
  if (zipNum >= 200 && zipNum <= 219) return 'DC';
  if (zipNum >= 220 && zipNum <= 246) return 'VA';
  if (zipNum >= 247 && zipNum <= 269) return 'WV';
  if (zipNum >= 270 && zipNum <= 289) return 'NC';
  if (zipNum >= 290 && zipNum <= 299) return 'SC';
  if (zipNum >= 300 && zipNum <= 319) return 'GA';
  if (zipNum >= 320 && zipNum <= 349) return 'FL';
  if (zipNum >= 350 && zipNum <= 369) return 'AL';
  if (zipNum >= 370 && zipNum <= 385) return 'TN';
  if (zipNum >= 386 && zipNum <= 399) return 'MS';
  if (zipNum >= 400 && zipNum <= 429) return 'KY';
  if (zipNum >= 430 && zipNum <= 459) return 'OH';
  if (zipNum >= 460 && zipNum <= 479) return 'IN';
  if (zipNum >= 480 && zipNum <= 499) return 'MI';
  if (zipNum >= 500 && zipNum <= 529) return 'IA';
  if (zipNum >= 530 && zipNum <= 549) return 'WI';
  if (zipNum >= 550 && zipNum <= 567) return 'MN';
  if (zipNum >= 570 && zipNum <= 579) return 'SD';
  if (zipNum >= 580 && zipNum <= 589) return 'ND';
  if (zipNum >= 590 && zipNum <= 599) return 'MT';
  if (zipNum >= 600 && zipNum <= 629) return 'IL';
  if (zipNum >= 630 && zipNum <= 659) return 'MO';
  if (zipNum >= 660 && zipNum <= 679) return 'KS';
  if (zipNum >= 680 && zipNum <= 699) return 'NE';
  if (zipNum >= 700 && zipNum <= 715) return 'LA';
  if (zipNum >= 716 && zipNum <= 729) return 'AR';
  if (zipNum >= 730 && zipNum <= 749) return 'OK';
  if (zipNum >= 750 && zipNum <= 799) return 'TX';
  if (zipNum >= 800 && zipNum <= 819) return 'CO';
  if (zipNum >= 820 && zipNum <= 831) return 'WY';
  if (zipNum >= 832 && zipNum <= 839) return 'ID';
  if (zipNum >= 840 && zipNum <= 849) return 'UT';
  if (zipNum >= 850 && zipNum <= 869) return 'AZ';
  if (zipNum >= 870 && zipNum <= 884) return 'NM';
  if (zipNum >= 889 && zipNum <= 899) return 'NV';
  if (zipNum >= 900 && zipNum <= 966) return 'CA';
  if (zipNum >= 967 && zipNum <= 968) return 'HI';
  if (zipNum >= 970 && zipNum <= 979) return 'OR';
  if (zipNum >= 980 && zipNum <= 994) return 'WA';
  if (zipNum >= 995 && zipNum <= 999) return 'AK';
  
  return null;
}