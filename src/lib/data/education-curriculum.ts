/**
 * Education Curriculum - K-12 Civics lessons for educators
 * Teaching civics with real government data from CIV.IQ
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Standards Alignment: NCSS C3 Framework
 * Data Sources: Congress.gov, FEC, Census Bureau, OpenStates
 */

export type GradeLevel = 'elementary' | 'middle' | 'high';

export interface LearningObjective {
  id: string;
  text: string;
  standard?: string; // NCSS C3 Framework alignment
}

export interface Activity {
  title: string;
  description: string;
  duration: string;
  type: 'exploration' | 'discussion' | 'worksheet' | 'project' | 'guided-practice';
  civiqFeature?: string;
  civiqPath?: string;
}

export interface DiscussionQuestion {
  question: string;
  followUp?: string;
}

export interface ProcedureStep {
  phase: string;
  duration: string;
  instructions: string[];
}

export interface Lesson {
  id: string;
  title: string;
  gradeLevel: GradeLevel;
  topic: LessonTopic;
  duration: string;
  essentialQuestion: string;
  overview: string;
  objectives: LearningObjective[];
  vocabulary: string[];
  materials: string[];
  procedure?: ProcedureStep[];
  activities: Activity[];
  discussionQuestions: DiscussionQuestion[];
  assessment: string;
  extensions?: string[];
  teacherNotes?: string[];
  printableId: string;
  c3Standards: string[];
}

export type LessonTopic =
  | 'government-structure'
  | 'legislative-process'
  | 'representatives'
  | 'campaign-finance'
  | 'elections'
  | 'civic-participation'
  | 'state-government'
  | 'data-literacy'
  | 'demographics';

export const LESSON_TOPICS: Record<LessonTopic, string> = {
  'government-structure': 'Government Structure',
  'legislative-process': 'Legislative Process',
  representatives: 'Representatives & Congress',
  'campaign-finance': 'Campaign Finance',
  elections: 'Elections & Voting',
  'civic-participation': 'Civic Participation',
  'state-government': 'State Government',
  'data-literacy': 'Data Literacy',
  demographics: 'Geography & Demographics',
};

export const GRADE_LEVEL_INFO: Record<
  GradeLevel,
  {
    label: string;
    grades: string;
    description: string;
    color: string;
    unitTitle: string;
    bigIdea: string;
  }
> = {
  elementary: {
    label: 'Elementary',
    grades: 'K-5',
    description: 'Building civic awareness and comfort with government information',
    color: 'civiq-green',
    unitTitle: 'Who Represents Me?',
    bigIdea:
      'Every American has people in government who represent them and make decisions on their behalf.',
  },
  middle: {
    label: 'Middle School',
    grades: '6-8',
    description: 'Understanding government as interconnected systems',
    color: 'civiq-blue',
    unitTitle: 'How Government Works',
    bigIdea:
      'Government is a system of interconnected institutions, processes, and people that students can analyze using real data.',
  },
  high: {
    label: 'High School',
    grades: '9-12',
    description: 'Independent civic research and evidence-based argument',
    color: 'civiq-red',
    unitTitle: 'Evaluating Representation',
    bigIdea:
      'Students become independent civic researchers, using public data to analyze representation, identify patterns, and make evidence-based arguments.',
  },
};

// ============================================================================
// ELEMENTARY SCHOOL LESSONS (K-5): "Who Represents Me?"
// ============================================================================

const ELEMENTARY_LESSONS: Lesson[] = [
  {
    id: 'E1',
    title: 'My Representatives',
    gradeLevel: 'elementary',
    topic: 'representatives',
    duration: '30-40 minutes',
    essentialQuestion: 'Who helps make decisions for our community at the national level?',
    overview:
      'Students discover who their elected representatives are at the federal level by exploring their congressional district using their ZIP code.',
    objectives: [
      { id: 'E1-1', text: 'Define what a representative does', standard: 'D2.Civ.3.K-2' },
      {
        id: 'E1-2',
        text: 'Use their ZIP code to find their federal representatives on CIV.IQ',
        standard: 'D2.Civ.1.K-2',
      },
      { id: 'E1-3', text: 'Name their 2 senators and 1 House representative' },
      { id: 'E1-4', text: 'Identify the political party of each representative' },
    ],
    vocabulary: ['Representative', 'Senator', 'Congress', 'District', 'Elected', 'Party'],
    materials: [
      'Computer/tablet with internet access',
      'Projector for demonstration',
      'Worksheet E1: My Representatives',
      'Classroom ZIP code written on board',
    ],
    procedure: [
      {
        phase: 'Introduction',
        duration: '5 minutes',
        instructions: [
          'Ask: "Who makes rules at our school?" (principal, teachers)',
          'Ask: "Who makes rules for our whole country?"',
          'Introduce the word "representative" — someone who speaks for a group of people',
          'Explain: "Today we\'re going to find out WHO represents US in the government"',
        ],
      },
      {
        phase: 'Guided Practice',
        duration: '15 minutes',
        instructions: [
          'Display CIV.IQ homepage on projector',
          'Point to ZIP code search box',
          'Enter classroom ZIP code together',
          'Results page appears with 3 representatives',
          'Walk through each: "This is one of our Senators. Senators represent our whole STATE."',
          '"This is our other Senator. Every state has exactly TWO senators."',
          '"This is our Representative. They represent our DISTRICT."',
          'Click on one representative to show their profile page',
          'Point out: photo, name, party, state',
        ],
      },
      {
        phase: 'Independent Practice',
        duration: '10 minutes',
        instructions: [
          'Students complete Worksheet E1',
          'They record the names of all 3 representatives',
          'They draw a picture of one representative (from the photo)',
          'They write or dictate one thing they noticed',
        ],
      },
      {
        phase: 'Closing',
        duration: '5 minutes',
        instructions: [
          'Share: What did you notice about your representatives?',
          'Preview: "Next time we\'ll learn more about what these people DO for us"',
        ],
      },
    ],
    activities: [
      {
        title: 'Find Your Representatives',
        description:
          "Use CIV.IQ to look up representatives by entering your school's ZIP code. Record the names of your U.S. Representative and two Senators.",
        duration: '15 minutes',
        type: 'guided-practice',
        civiqFeature: 'ZIP Code Lookup',
        civiqPath: '/',
      },
      {
        title: 'Representative Profile Cards',
        description:
          'Create a simple profile card for each representative with their name, photo, party, and one interesting fact.',
        duration: '10 minutes',
        type: 'project',
      },
    ],
    discussionQuestions: [
      {
        question: 'Why do we have representatives instead of everyone voting on every law?',
        followUp: 'What would it be like if everyone had to vote on everything?',
      },
      {
        question: 'How do you think representatives learn what the people in their area want?',
      },
      { question: 'What makes a good representative?' },
    ],
    assessment:
      'Students can correctly name their U.S. Representative and at least one Senator, and explain that representatives are elected to make decisions for the people.',
    extensions: [
      "Students who finish early can explore the representative's profile page",
      'Find one interesting fact to share with the class',
    ],
    teacherNotes: [
      'For K-1, consider doing the worksheet as a whole class activity',
      'If students have different home ZIP codes, they can look up their own',
      'Some ZIP codes span multiple districts — use the classroom ZIP for consistency',
    ],
    printableId: 'worksheet-E1',
    c3Standards: ['D2.Civ.3.K-2', 'D2.Civ.1.K-2'],
  },
  {
    id: 'E2',
    title: 'What Representatives Do',
    gradeLevel: 'elementary',
    topic: 'government-structure',
    duration: '35-45 minutes',
    essentialQuestion: "What is a representative's job?",
    overview:
      'Students learn about the responsibilities of federal representatives by exploring profiles on CIV.IQ.',
    objectives: [
      {
        id: 'E2-1',
        text: 'Describe at least 3 responsibilities of a federal representative',
        standard: 'D2.Civ.1.3-5',
      },
      { id: 'E2-2', text: "Navigate to a representative's profile on CIV.IQ" },
      {
        id: 'E2-3',
        text: 'Identify the committees a representative serves on',
        standard: 'D2.Civ.6.K-2',
      },
      { id: 'E2-4', text: 'Explain why representatives work on different topics' },
    ],
    vocabulary: ['Committee', 'Bill', 'Sponsor', 'Contact', 'Office', 'Staff'],
    materials: [
      'Computer/tablet access',
      'Projector',
      "Worksheet E2: A Representative's Job",
      'Chart paper for class list',
    ],
    procedure: [
      {
        phase: 'Introduction',
        duration: '8 minutes',
        instructions: [
          'Review: "Last time we found our representatives. Who remembers their names?"',
          'Ask: "What do you think they DO all day?"',
          'Record student guesses on chart paper',
          'Explain: "Let\'s use CIV.IQ to find out what they actually do"',
        ],
      },
      {
        phase: 'Exploration',
        duration: '15 minutes',
        instructions: [
          'Navigate to one of your representatives on CIV.IQ',
          'Explore the profile together:',
          '- About section: Where are they from? How long have they served?',
          '- Committees: "These are like special teams that focus on specific topics"',
          '- Read committee names aloud — ask students what they think each one does',
          '- Bills: "These are ideas for new laws they\'re working on"',
          'Click on one bill title — read the title together',
          'Discuss: "Why do you think your representative is working on THIS?"',
        ],
      },
    ],
    activities: [
      {
        title: 'Explore Representative Profile',
        description:
          "Navigate to your representative's profile on CIV.IQ. Find their committees, bills, and contact information.",
        duration: '15 minutes',
        type: 'exploration',
        civiqFeature: 'Representative Profile',
        civiqPath: '/representatives',
      },
      {
        title: "Record Representative's Work",
        description:
          'As a class, identify one committee, one bill, and one way to contact them. Record on Worksheet E2.',
        duration: '10 minutes',
        type: 'guided-practice',
      },
      {
        title: 'Draw Your Representative at Work',
        description:
          'Students complete worksheet and draw what they imagine their representative doing.',
        duration: '10 minutes',
        type: 'project',
      },
    ],
    discussionQuestions: [
      { question: 'What surprised you about what representatives do?' },
      {
        question: 'Why do representatives join committees?',
        followUp: 'How does this help them do their job better?',
      },
      { question: 'If you were a representative, what would you want to work on?' },
    ],
    assessment: 'Students can explain at least 2 things representatives do.',
    extensions: [
      "Look at a different representative's committees",
      'Compare: Do all representatives work on the same things?',
    ],
    printableId: 'worksheet-E2',
    c3Standards: ['D2.Civ.1.3-5', 'D2.Civ.6.K-2'],
  },
  {
    id: 'E3',
    title: 'Our District on the Map',
    gradeLevel: 'elementary',
    topic: 'demographics',
    duration: '40-50 minutes',
    essentialQuestion: 'Where does our district begin and end, and why does it matter?',
    overview:
      'Students explore their congressional district on a map, learning about geographic representation.',
    objectives: [
      {
        id: 'E3-1',
        text: 'Define "congressional district"',
        standard: 'D2.Geo.1.3-5',
      },
      {
        id: 'E3-2',
        text: 'Locate their district on the CIV.IQ interactive map',
        standard: 'D2.Civ.4.3-5',
      },
      { id: 'E3-3', text: 'Identify at least 2 neighboring districts' },
      { id: 'E3-4', text: 'Explain why district boundaries determine representation' },
    ],
    vocabulary: ['District', 'Boundary', 'Map', 'Neighbor', 'Geography', 'Population'],
    materials: [
      'Computer/tablet access',
      'Projector',
      'Worksheet E3: My District Map',
      'Colored pencils for map drawing',
    ],
    activities: [
      {
        title: 'Map Exploration',
        description:
          'Navigate to your district on CIV.IQ. Zoom in to find your school, trace the boundary, and zoom out to see the whole district.',
        duration: '15 minutes',
        type: 'exploration',
        civiqFeature: 'District Map',
        civiqPath: '/districts',
      },
      {
        title: 'Neighboring Districts',
        description:
          'Click on neighboring districts. Who represents THAT area? Is it the same party?',
        duration: '12 minutes',
        type: 'exploration',
        civiqFeature: 'District Boundaries',
        civiqPath: '/districts',
      },
      {
        title: 'Draw Your District',
        description:
          'On Worksheet E3, sketch your district shape. Label your school location, district number, and neighboring districts.',
        duration: '10 minutes',
        type: 'worksheet',
      },
    ],
    discussionQuestions: [
      { question: 'Why do you think district lines are where they are?' },
      { question: 'What if your best friend lived across the district line?' },
      {
        question: 'Would you have the same representative? Why does that matter?',
      },
    ],
    assessment:
      'Students can state their district number and describe at least two features of their district.',
    extensions: [
      'Find a district in a different state — how is it shaped differently?',
      'Count how many districts your state has',
    ],
    teacherNotes: ['Key takeaway: WHERE you live determines WHO represents you'],
    printableId: 'worksheet-E3',
    c3Standards: ['D2.Geo.1.3-5', 'D2.Civ.4.3-5'],
  },
  {
    id: 'E4',
    title: 'How Laws Start',
    gradeLevel: 'elementary',
    topic: 'legislative-process',
    duration: '45-50 minutes',
    essentialQuestion: 'How does an idea become a law?',
    overview:
      "Students learn the basic steps of how an idea becomes a law, from introduction in Congress to the President's signature.",
    objectives: [
      {
        id: 'E4-1',
        text: 'Define "bill" and explain where bills come from',
        standard: 'D2.Civ.6.3-5',
      },
      { id: 'E4-2', text: "Navigate to a representative's sponsored bills on CIV.IQ" },
      {
        id: 'E4-3',
        text: 'Identify the current status of a bill',
        standard: 'D2.Civ.12.3-5',
      },
      { id: 'E4-4', text: 'Describe the basic steps a bill takes to become law' },
    ],
    vocabulary: ['Bill', 'Law', 'Congress', 'Vote', 'Committee', 'Veto', 'Pass', 'President'],
    materials: [
      'Computer/tablet access',
      'Projector',
      "Worksheet E4: A Bill's Journey",
      '"How a Bill Becomes a Law" simple flowchart',
    ],
    procedure: [
      {
        phase: 'Introduction',
        duration: '10 minutes',
        instructions: [
          'Ask: "What rule would YOU create if you could?"',
          'Record 3-4 student ideas',
          'Explain: "In government, a new rule idea is called a BILL"',
          '"Bills are written by representatives, and they have to go through many steps before becoming a LAW"',
          'Show simplified flowchart: Idea → Written as Bill → Committee Review → Vote → Other Chamber → President → Law',
        ],
      },
      {
        phase: 'Exploration',
        duration: '15 minutes',
        instructions: [
          "Navigate to your representative's profile → Legislation tab",
          'Look at "Sponsored Bills" — these are ideas YOUR representative had',
          'Select one bill together',
          'Read the title: "What do you think this bill would do?"',
          'Check the status: Where is it in the process?',
          'Discuss: Most bills do NOT become laws — why might that be?',
        ],
      },
    ],
    activities: [
      {
        title: 'Find Real Bills',
        description:
          "Use CIV.IQ to look at your representative's sponsored bills. Find one bill and identify: Who introduced it? What is it about? What is its status?",
        duration: '15 minutes',
        type: 'exploration',
        civiqFeature: 'Representative Bills',
        civiqPath: '/representatives',
      },
      {
        title: 'Sequence the Journey',
        description:
          'Put cards showing the steps of how a bill becomes a law in the correct order.',
        duration: '15 minutes',
        type: 'worksheet',
      },
    ],
    discussionQuestions: [
      { question: 'Why do you think it takes so many steps for a bill to become a law?' },
      {
        question:
          'If you could make one new law, what would it be? Who would you talk to about it?',
      },
      { question: "What happens if the President doesn't like a bill?" },
    ],
    assessment:
      'Students can describe at least 4 steps in the process of how a bill becomes a law.',
    printableId: 'worksheet-E4',
    c3Standards: ['D2.Civ.6.3-5', 'D2.Civ.12.3-5'],
  },
  {
    id: 'E5',
    title: 'Having Our Say',
    gradeLevel: 'elementary',
    topic: 'civic-participation',
    duration: '40-45 minutes',
    essentialQuestion: 'How can we share our ideas with our representatives?',
    overview:
      'Students learn multiple ways to contact their representatives and practice drafting a message.',
    objectives: [
      {
        id: 'E5-1',
        text: 'Explain why representatives want to hear from citizens',
        standard: 'D2.Civ.9.3-5',
      },
      { id: 'E5-2', text: 'Locate contact information for representatives on CIV.IQ' },
      {
        id: 'E5-3',
        text: 'Identify at least 3 ways to contact a representative',
        standard: 'D2.Civ.10.3-5',
      },
      { id: 'E5-4', text: 'Draft a short message about an issue they care about' },
    ],
    vocabulary: ['Contact', 'Constituent', 'Office', 'Letter', 'Email', 'Phone', 'Issue'],
    materials: [
      'Computer/tablet access',
      'Projector',
      'Worksheet E5: Writing to My Representative',
      'Sample student letters',
    ],
    activities: [
      {
        title: 'Find Contact Information',
        description:
          "Navigate to your representative's profile on CIV.IQ. Find their office address, phone number, website, and social media.",
        duration: '10 minutes',
        type: 'exploration',
        civiqFeature: 'Representative Profile',
        civiqPath: '/representatives',
      },
      {
        title: 'Brainstorm Issues',
        description:
          'As a class, brainstorm issues students care about: school, environment, parks, safety, animals, fairness.',
        duration: '5 minutes',
        type: 'discussion',
      },
      {
        title: 'Model Letter Writing',
        description:
          'Model drafting a short, respectful message: Greeting, introduce yourself, state concern, make request, closing.',
        duration: '10 minutes',
        type: 'guided-practice',
      },
      {
        title: 'Write Your Message',
        description:
          'Students write their own short message about something they care about on Worksheet E5.',
        duration: '10 minutes',
        type: 'worksheet',
      },
    ],
    discussionQuestions: [
      { question: 'Why would representatives want to hear from us?' },
      {
        question: 'What makes a good letter to a representative?',
        followUp: 'Should it be angry or respectful?',
      },
      { question: 'Should students actually send these letters?' },
    ],
    assessment:
      'Students can identify multiple ways to contact representatives and draft a respectful message.',
    extensions: [
      'Actually send the messages (with parental permission)',
      'Research: Has your representative responded to young people before?',
    ],
    printableId: 'worksheet-E5',
    c3Standards: ['D2.Civ.9.3-5', 'D2.Civ.10.3-5'],
  },
];

// ============================================================================
// MIDDLE SCHOOL LESSONS (6-8): "How Government Works"
// ============================================================================

const MIDDLE_SCHOOL_LESSONS: Lesson[] = [
  {
    id: 'M1',
    title: 'The Structure of Congress',
    gradeLevel: 'middle',
    topic: 'government-structure',
    duration: '50 minutes',
    essentialQuestion: 'How is Congress organized to do its work?',
    overview:
      'Students compare the House and Senate, explore the committee system, and identify leadership roles.',
    objectives: [
      {
        id: 'M1-1',
        text: 'Compare the House of Representatives and Senate (size, terms, representation)',
        standard: 'D2.Civ.4.6-8',
      },
      {
        id: 'M1-2',
        text: 'Explain the purpose of the committee system',
        standard: 'D2.Civ.1.6-8',
      },
      { id: 'M1-3', text: 'Identify leadership roles in each chamber' },
      { id: 'M1-4', text: 'Navigate CIV.IQ to find committee information' },
    ],
    vocabulary: [
      'House of Representatives',
      'Senate',
      'Standing committee',
      'Chair',
      'Ranking member',
      'Jurisdiction',
      'Majority',
      'Minority',
      'Speaker',
    ],
    materials: [
      'Computer/tablet access',
      'Worksheet M1: Congress Structure Analysis',
      'Congress comparison chart (blank)',
    ],
    activities: [
      {
        title: 'Committee Investigation',
        description:
          'Navigate to CIV.IQ → Committees section. Examine the list of standing committees. Select one committee and find: Who chairs it? Who is ranking member? How many members? What jurisdiction?',
        duration: '15 minutes',
        type: 'exploration',
        civiqFeature: 'Committees',
        civiqPath: '/committees',
      },
      {
        title: 'Leadership Exploration',
        description:
          'Navigate to representative profiles and look for leadership positions: Speaker, Majority/Minority Leaders, Whips, Committee chairs.',
        duration: '12 minutes',
        type: 'exploration',
        civiqFeature: 'Representative Profiles',
        civiqPath: '/representatives',
      },
      {
        title: 'Complete Comparison Chart',
        description:
          'Complete Worksheet M1 comparing one House committee to its Senate counterpart. Identify which party controls each chamber.',
        duration: '10 minutes',
        type: 'worksheet',
      },
    ],
    discussionQuestions: [
      {
        question: 'Why do you think Congress is divided into two chambers?',
        followUp: 'What are the advantages of this system?',
      },
      { question: 'Why does Congress divide work among committees?' },
      { question: 'What power do leadership positions have?' },
    ],
    assessment:
      'Students can explain committee purpose and describe leadership structure accurately.',
    extensions: [
      "Research a specific committee's recent hearings",
      'Find which committees your representatives serve on',
    ],
    printableId: 'worksheet-M1',
    c3Standards: ['D2.Civ.4.6-8', 'D2.Civ.1.6-8'],
  },
  {
    id: 'M2',
    title: 'Following a Bill Through Congress',
    gradeLevel: 'middle',
    topic: 'legislative-process',
    duration: '55 minutes',
    essentialQuestion: 'What happens to a bill from introduction to (possible) law?',
    overview:
      'Students track real bills through the legislative process, understanding why most bills fail.',
    objectives: [
      {
        id: 'M2-1',
        text: 'Identify the 7 major stages of the legislative process',
        standard: 'D2.Civ.5.6-8',
      },
      {
        id: 'M2-2',
        text: "Track a real bill's progress using CIV.IQ",
        standard: 'D2.Civ.6.6-8',
      },
      { id: 'M2-3', text: 'Explain why most bills fail' },
      { id: 'M2-4', text: 'Analyze factors that help bills succeed' },
    ],
    vocabulary: [
      'Introduction',
      'Committee referral',
      'Markup',
      'Floor debate',
      'Conference committee',
      'Enrolled bill',
      'Cosponsor',
      'Veto',
    ],
    materials: [
      'Computer/tablet access',
      'Worksheet M2: Bill Tracker',
      'Legislative process flowchart (detailed)',
    ],
    procedure: [
      {
        phase: 'Opening',
        duration: '10 minutes',
        instructions: [
          'Statistics: Of ~10,000 bills introduced each Congress, only about 300-500 become law',
          'Question: Why do you think so few bills pass?',
          'Preview the 7 stages: Introduction → Committee referral → Committee action → Floor debate → Second chamber → Conference → Presidential action',
        ],
      },
      {
        phase: 'Investigation',
        duration: '20 minutes',
        instructions: [
          "Navigate to a representative's profile → Legislation tab",
          'Find a recently introduced bill',
          'Click through to see: sponsor, cosponsors, committee, actions',
          "Trace the bill's journey on Worksheet M2",
          'Research a DIFFERENT bill that actually became law',
          'Compare: What was different about its journey?',
        ],
      },
    ],
    activities: [
      {
        title: 'Track a Current Bill',
        description:
          'Use CIV.IQ to find a bill currently in Congress. Record title, sponsor, cosponsors, committee, and status.',
        duration: '15 minutes',
        type: 'exploration',
        civiqFeature: 'Legislation',
        civiqPath: '/legislation',
      },
      {
        title: 'Track a Successful Bill',
        description:
          'Find a bill that became law. Compare its journey to the current bill. What factors helped it succeed?',
        duration: '15 minutes',
        type: 'exploration',
        civiqFeature: 'Bill Details',
        civiqPath: '/legislation',
      },
      {
        title: 'Analysis Paragraph',
        description:
          'Students write a paragraph analyzing why their current bill succeeded OR is stalled.',
        duration: '10 minutes',
        type: 'worksheet',
      },
    ],
    discussionQuestions: [
      {
        question: 'At what stage do most bills die?',
        followUp: 'Why does this happen?',
      },
      { question: 'Is the slow legislative process a good thing or bad thing?' },
      { question: 'What factors help a bill pass?' },
    ],
    assessment: 'Students can accurately describe bill status and explain the next steps needed.',
    extensions: ['Track a bill over several weeks', 'Compare bills from different parties'],
    printableId: 'worksheet-M2',
    c3Standards: ['D2.Civ.5.6-8', 'D2.Civ.6.6-8'],
  },
  {
    id: 'M3',
    title: 'Analyzing Voting Records',
    gradeLevel: 'middle',
    topic: 'representatives',
    duration: '50 minutes',
    essentialQuestion: 'What can voting records tell us about a representative?',
    overview:
      'Students learn to interpret voting records, calculate party alignment, and analyze patterns.',
    objectives: [
      {
        id: 'M3-1',
        text: 'Navigate to voting records on CIV.IQ',
        standard: 'D2.Civ.6.6-8',
      },
      { id: 'M3-2', text: 'Interpret vote data (Yea, Nay, Not Voting, Present)' },
      {
        id: 'M3-3',
        text: "Calculate a representative's party alignment rate",
        standard: 'D3.1.6-8',
      },
      { id: 'M3-4', text: 'Analyze patterns in voting behavior' },
    ],
    vocabulary: [
      'Roll call vote',
      'Yea',
      'Nay',
      'Present',
      'Not voting',
      'Party-line vote',
      'Bipartisan',
      'Party alignment',
    ],
    materials: ['Computer/tablet access', 'Worksheet M3: Voting Record Analysis', 'Calculator'],
    activities: [
      {
        title: 'Examine Individual Votes',
        description:
          "Navigate to a representative's Votes tab. Record 10 recent votes: bill, how they voted, how party voted, result.",
        duration: '15 minutes',
        type: 'exploration',
        civiqFeature: 'Voting Records',
        civiqPath: '/representatives',
      },
      {
        title: 'Calculate Party Alignment',
        description:
          'Out of 10 votes, how many times did they vote with their party majority? Calculate percentage.',
        duration: '10 minutes',
        type: 'worksheet',
      },
      {
        title: 'Pattern Analysis',
        description:
          'Compare two representatives from different parties. Look for patterns in how they vote.',
        duration: '15 minutes',
        type: 'exploration',
        civiqFeature: 'Compare Representatives',
        civiqPath: '/compare',
      },
    ],
    discussionQuestions: [
      { question: 'Is voting with your party good or bad? Explain.' },
      { question: 'When might a representative vote against their party?' },
      {
        question: "What can voting records tell us? What CAN'T they tell us?",
      },
    ],
    assessment: 'Students can accurately read voting records and explain party alignment concept.',
    extensions: [
      'Find a bipartisan vote where majorities of both parties agreed',
      'Analyze key votes vs. minor legislation',
    ],
    printableId: 'worksheet-M3',
    c3Standards: ['D2.Civ.6.6-8', 'D3.1.6-8'],
  },
  {
    id: 'M4',
    title: 'Introduction to Campaign Finance',
    gradeLevel: 'middle',
    topic: 'campaign-finance',
    duration: '55 minutes',
    essentialQuestion: 'Where do campaigns get their money, and why does it matter?',
    overview:
      'Students explore FEC data to understand campaign funding sources and the importance of transparency.',
    objectives: [
      {
        id: 'M4-1',
        text: 'Explain why campaigns need money',
        standard: 'D2.Eco.1.6-8',
      },
      { id: 'M4-2', text: 'Identify main sources of campaign funding' },
      {
        id: 'M4-3',
        text: 'Navigate FEC data on CIV.IQ',
        standard: 'D2.Civ.13.6-8',
      },
      { id: 'M4-4', text: 'Distinguish between individual contributions, PACs, and self-funding' },
    ],
    vocabulary: [
      'Campaign',
      'Contribution',
      'Individual donor',
      'PAC',
      'Super PAC',
      'FEC',
      'Disclosure',
      'Transparency',
    ],
    materials: [
      'Computer/tablet access',
      'Worksheet M4: Campaign Finance Basics',
      'Vocabulary list',
    ],
    procedure: [
      {
        phase: 'Opening',
        duration: '10 minutes',
        instructions: [
          'Question: What does it cost to run for Congress?',
          'Average costs (2024 cycle): House race ~$2-3M, Senate ~$15-20M, competitive seats much higher',
          'Discussion: Where does that money come from?',
          'Vocabulary introduction: individual contributions, PAC, campaign committee',
        ],
      },
    ],
    activities: [
      {
        title: 'Explore FEC Data',
        description:
          "Navigate to a representative's Finance tab. Find: total raised, total spent, cash on hand, contribution breakdown.",
        duration: '20 minutes',
        type: 'exploration',
        civiqFeature: 'Campaign Finance',
        civiqPath: '/representatives',
      },
      {
        title: 'Compare Two Representatives',
        description:
          'Compare FEC data for representatives from different parties. What patterns do you notice?',
        duration: '15 minutes',
        type: 'exploration',
        civiqFeature: 'Campaign Finance',
        civiqPath: '/representatives',
      },
      {
        title: 'Complete Finance Worksheet',
        description: 'Record findings on Worksheet M4. Note top contributing industries.',
        duration: '10 minutes',
        type: 'worksheet',
      },
    ],
    discussionQuestions: [
      { question: 'Does money influence votes?' },
      { question: 'Why is it important that this information is PUBLIC?' },
      { question: 'What can we learn from campaign finance data? What can we NOT prove?' },
    ],
    assessment: 'Students can explain different funding sources and navigate FEC data accurately.',
    extensions: ['Research contribution limits', 'Find the top-funded member of Congress'],
    teacherNotes: [
      'Key distinction: We can find patterns, but cannot prove WHY from data alone',
      'Emphasize transparency over judgment',
    ],
    printableId: 'worksheet-M4',
    c3Standards: ['D2.Eco.1.6-8', 'D2.Civ.13.6-8'],
  },
  {
    id: 'M5',
    title: 'Federal vs. State Government',
    gradeLevel: 'middle',
    topic: 'state-government',
    duration: '50 minutes',
    essentialQuestion: 'How do state governments compare to the federal government?',
    overview:
      'Students compare federal and state legislative structures, understanding federalism.',
    objectives: [
      {
        id: 'M5-1',
        text: 'Identify the structure of their state legislature',
        standard: 'D2.Civ.8.6-8',
      },
      {
        id: 'M5-2',
        text: 'Compare federal and state legislative processes',
        standard: 'D2.Civ.5.6-8',
      },
      { id: 'M5-3', text: 'Navigate state legislator profiles on CIV.IQ' },
      { id: 'M5-4', text: 'Explain federalism with specific examples' },
    ],
    vocabulary: [
      'Federalism',
      'Reserved powers',
      'Concurrent powers',
      'State legislature',
      'Governor',
      'Bicameral',
      'Unicameral',
    ],
    materials: [
      'Computer/tablet access',
      'Worksheet M5: Federal vs. State Comparison',
      'State legislature fact sheet',
    ],
    activities: [
      {
        title: 'Explore State Legislature',
        description:
          'Navigate to CIV.IQ → State Legislature section → your state. Find: number of chambers, number of legislators, term lengths.',
        duration: '15 minutes',
        type: 'exploration',
        civiqFeature: 'State Legislature',
        civiqPath: '/state-legislature',
      },
      {
        title: 'Find Your State Legislators',
        description: 'Use address lookup to find YOUR state legislators. Explore one profile.',
        duration: '15 minutes',
        type: 'exploration',
        civiqFeature: 'State Representatives',
        civiqPath: '/state-legislature',
      },
      {
        title: 'Comparison Chart',
        description: 'Complete Worksheet M5 comparing your state legislature to Congress.',
        duration: '15 minutes',
        type: 'worksheet',
      },
    ],
    discussionQuestions: [
      { question: 'Why have state governments at all? Why not just federal?' },
      { question: 'What issues are handled better at the state level?' },
      { question: 'Nebraska is the only state with one chamber. Why might that be?' },
    ],
    assessment:
      'Students can explain federalism and correctly categorize powers as state, federal, or shared.',
    extensions: [
      'Research a current bill in your state legislature',
      'Compare your state legislature to a very different state',
    ],
    printableId: 'worksheet-M5',
    c3Standards: ['D2.Civ.8.6-8', 'D2.Civ.5.6-8'],
  },
  {
    id: 'M6',
    title: 'Understanding Your District',
    gradeLevel: 'middle',
    topic: 'demographics',
    duration: '50 minutes',
    essentialQuestion:
      'Who lives in your congressional district, and why does it matter for representation?',
    overview: 'Students analyze Census data about their district and compare to other districts.',
    objectives: [
      {
        id: 'M6-1',
        text: 'Navigate to district demographic data on CIV.IQ',
        standard: 'D2.Geo.2.6-8',
      },
      {
        id: 'M6-2',
        text: 'Interpret Census data (population, income, education)',
        standard: 'D2.Geo.4.6-8',
      },
      {
        id: 'M6-3',
        text: 'Analyze how district demographics might shape representation',
        standard: 'D3.1.6-8',
      },
      { id: 'M6-4', text: 'Compare their district to a contrasting district' },
    ],
    vocabulary: [
      'Demographics',
      'Census',
      'Population',
      'Median income',
      'Urban',
      'Rural',
      'Suburban',
      'Constituency',
    ],
    materials: [
      'Computer/tablet access',
      'Worksheet M6: District Demographics',
      'US map showing district types',
    ],
    activities: [
      {
        title: 'Your District Data',
        description:
          "Navigate to your representative's District tab. Record: population, median income, poverty rate, education levels, employment.",
        duration: '18 minutes',
        type: 'exploration',
        civiqFeature: 'District Profile',
        civiqPath: '/districts',
      },
      {
        title: 'Comparison District',
        description:
          'Find a VERY DIFFERENT district (urban vs rural, different region). Record the same data points.',
        duration: '12 minutes',
        type: 'exploration',
        civiqFeature: 'District Comparison',
        civiqPath: '/districts',
      },
      {
        title: 'Analysis',
        description:
          'On Worksheet M6, analyze how these differences might affect what voters care about.',
        duration: '15 minutes',
        type: 'worksheet',
      },
    ],
    discussionQuestions: [
      { question: 'How might a rural district have different needs than an urban district?' },
      { question: 'Would you expect these two representatives to vote the same way? Why?' },
      { question: 'What issues might be MORE important in your district?' },
    ],
    assessment:
      'Students can describe key district characteristics and explain how they might influence representation.',
    extensions: [
      'Find the wealthiest and poorest districts — who represents each?',
      'Research how your district changed after 2020 Census redistricting',
    ],
    printableId: 'worksheet-M6',
    c3Standards: ['D2.Geo.2.6-8', 'D2.Geo.4.6-8', 'D3.1.6-8'],
  },
];

// ============================================================================
// HIGH SCHOOL LESSONS (9-12): "Evaluating Representation"
// ============================================================================

const HIGH_SCHOOL_LESSONS: Lesson[] = [
  {
    id: 'H1',
    title: 'Data-Driven Civic Analysis',
    gradeLevel: 'high',
    topic: 'data-literacy',
    duration: '60 minutes',
    essentialQuestion: 'How can we use public data to make evidence-based claims about government?',
    overview:
      'Students learn to design civic research using public data while understanding correlation vs. causation.',
    objectives: [
      {
        id: 'H1-1',
        text: 'Identify multiple data sources on CIV.IQ (Congress.gov, FEC, Census)',
        standard: 'D2.Civ.10.9-12',
      },
      {
        id: 'H1-2',
        text: 'Distinguish between correlation and causation',
        standard: 'D3.1.9-12',
      },
      {
        id: 'H1-3',
        text: 'Evaluate data quality and limitations',
        standard: 'D3.2.9-12',
      },
      { id: 'H1-4', text: 'Formulate testable civic research questions' },
    ],
    vocabulary: [
      'Correlation',
      'Causation',
      'Primary source',
      'Secondary source',
      'Variable',
      'Sample size',
      'Limitation',
      'Attribution',
    ],
    materials: [
      'Computer/laptop access',
      'Worksheet H1: Civic Research Design',
      'Data literacy vocabulary guide',
    ],
    procedure: [
      {
        phase: 'The Promise and Limits of Data',
        duration: '12 minutes',
        instructions: [
          'Claim to evaluate: "Representatives who receive money from the pharmaceutical industry vote against drug pricing reform."',
          'Question: How would we TEST this claim?',
          'What data would we need? Campaign contributions (FEC) ✓ Voting records ✓ Motivations ✗',
          'Key distinction: Correlation ≠ Causation',
        ],
      },
      {
        phase: 'Tour of Data Sources',
        duration: '15 minutes',
        instructions: [
          'Navigate CIV.IQ examining each data type:',
          'Congress.gov API: Bills, votes, member info, committees',
          'FEC data: Contributions, expenditures, donors',
          'Census Bureau: Demographics, district profiles',
          'OpenStates: State legislator data',
          'For each: What questions can this answer? What are its limitations?',
        ],
      },
    ],
    activities: [
      {
        title: 'Research Question Development',
        description:
          'Model turning vague questions into testable ones. Students brainstorm and refine their own research questions using Worksheet H1.',
        duration: '20 minutes',
        type: 'guided-practice',
      },
      {
        title: 'Data Source Exploration',
        description:
          'Tour CIV.IQ data sources. For each, identify what questions it can answer and its limitations.',
        duration: '15 minutes',
        type: 'exploration',
        civiqFeature: 'Multiple',
        civiqPath: '/',
      },
    ],
    discussionQuestions: [
      { question: "What's the difference between correlation and causation?" },
      { question: 'Why is it important to acknowledge data limitations?' },
      { question: 'What makes a good research question?' },
    ],
    assessment: 'Students produce a testable research question that avoids causal claims.',
    extensions: [
      'Read a political science research paper using Congressional data',
      'Identify data sources and methods used',
    ],
    printableId: 'worksheet-H1',
    c3Standards: ['D2.Civ.10.9-12', 'D3.1.9-12', 'D3.2.9-12'],
  },
  {
    id: 'H2',
    title: 'Campaign Finance Deep Dive',
    gradeLevel: 'high',
    topic: 'campaign-finance',
    duration: '65 minutes',
    essentialQuestion:
      'Can we identify patterns between campaign contributions and voting behavior?',
    overview:
      'Students conduct systematic analysis of FEC data, cross-referencing contributions with votes.',
    objectives: [
      {
        id: 'H2-1',
        text: 'Navigate detailed FEC data on CIV.IQ',
        standard: 'D2.Eco.2.9-12',
      },
      { id: 'H2-2', text: 'Categorize contributions by industry and type' },
      {
        id: 'H2-3',
        text: 'Cross-reference contribution data with voting records',
        standard: 'D2.Civ.13.9-12',
      },
      {
        id: 'H2-4',
        text: 'Write evidence-based analysis acknowledging limitations',
        standard: 'D3.1.9-12',
      },
    ],
    vocabulary: [
      'PAC',
      'Super PAC',
      'Individual contribution',
      'Bundling',
      'Leadership PAC',
      'Industry contribution',
      'Contribution limit',
      'Disclosure',
    ],
    materials: [
      'Computer/laptop access',
      'Worksheet H2: Campaign Finance Analysis',
      'Industry category guide',
    ],
    activities: [
      {
        title: 'FEC Data Structure',
        description:
          'Understand data hierarchy: Total receipts → Individual contributions → PAC contributions → Industry breakdown.',
        duration: '15 minutes',
        type: 'guided-practice',
        civiqFeature: 'Campaign Finance',
        civiqPath: '/representatives',
      },
      {
        title: 'Committee Analysis',
        description:
          'Select one committee (Finance, Energy, Agriculture). For 5 members: Record top 3 contributing industries, find one relevant vote, record how they voted.',
        duration: '25 minutes',
        type: 'exploration',
        civiqFeature: 'Campaign Finance',
        civiqPath: '/representatives',
      },
      {
        title: 'Evidence-Based Writing',
        description:
          'Write paragraph analyzing findings. Must include: specific data, limitations, alternative explanations.',
        duration: '15 minutes',
        type: 'worksheet',
      },
    ],
    discussionQuestions: [
      {
        question: 'Does money buy votes, or does money follow votes?',
        followUp: 'How would you design research to distinguish?',
      },
      { question: 'Why is transparency in campaign finance important?' },
      { question: 'What did you find that surprised you?' },
    ],
    assessment: 'Students produce analysis paragraph with specific data and appropriate caveats.',
    extensions: [
      'Compare campaign finance of freshman vs. senior members',
      'Research campaign finance reform proposals',
    ],
    printableId: 'worksheet-H2',
    c3Standards: ['D2.Eco.2.9-12', 'D2.Civ.13.9-12', 'D3.1.9-12'],
  },
  {
    id: 'H3',
    title: 'Voting Pattern Analysis',
    gradeLevel: 'high',
    topic: 'representatives',
    duration: '60 minutes',
    essentialQuestion: 'What patterns emerge when we systematically analyze voting records?',
    overview:
      'Students calculate party unity scores and analyze factors affecting voting patterns.',
    objectives: [
      {
        id: 'H3-1',
        text: 'Calculate party unity scores from raw voting data',
        standard: 'D2.Civ.3.9-12',
      },
      {
        id: 'H3-2',
        text: 'Identify bipartisan vs. partisan votes',
        standard: 'D2.Civ.6.9-12',
      },
      { id: 'H3-3', text: 'Compare voting patterns across representatives' },
      {
        id: 'H3-4',
        text: 'Analyze regional, seniority, and other factors affecting votes',
        standard: 'D3.2.9-12',
      },
    ],
    vocabulary: [
      'Party unity',
      'Party-line vote',
      'Bipartisan',
      'Moderate',
      'Ideological spectrum',
      'Success rate',
      'Cross-party vote',
    ],
    materials: [
      'Computer/laptop access',
      'Worksheet H3: Voting Pattern Analysis',
      'Spreadsheet for data collection',
      'Calculator',
    ],
    activities: [
      {
        title: 'Data Collection',
        description:
          'Select 3 representatives to analyze (same state different parties, OR same party different regions). Collect data on 15 votes each.',
        duration: '25 minutes',
        type: 'exploration',
        civiqFeature: 'Voting Records',
        civiqPath: '/representatives',
      },
      {
        title: 'Calculate Metrics',
        description:
          'Calculate party unity score (% voting with party) and success rate (% voting with winning side) for each representative.',
        duration: '15 minutes',
        type: 'worksheet',
      },
      {
        title: 'Pattern Analysis',
        description:
          'Compare your three representatives. Look for patterns by region, seniority, or district competitiveness.',
        duration: '15 minutes',
        type: 'discussion',
      },
    ],
    discussionQuestions: [
      { question: 'What might explain different levels of party loyalty?' },
      { question: 'Do patterns differ on major vs. minor legislation?' },
      { question: 'When is bipartisanship possible?' },
    ],
    assessment: 'Students produce accurate calculations and analysis paragraph with evidence.',
    extensions: ['Analyze "key votes" separately', 'Compare House and Senate voting patterns'],
    printableId: 'worksheet-H3',
    c3Standards: ['D2.Civ.3.9-12', 'D2.Civ.6.9-12', 'D3.2.9-12'],
  },
  {
    id: 'H4',
    title: 'Representation and Demographics',
    gradeLevel: 'high',
    topic: 'demographics',
    duration: '65 minutes',
    essentialQuestion: 'Does Congress look like America, and does it matter?',
    overview:
      'Students compare Congressional demographics to the population, exploring theories of representation.',
    objectives: [
      {
        id: 'H4-1',
        text: 'Compare Congressional demographics to national demographics',
        standard: 'D2.Geo.6.9-12',
      },
      {
        id: 'H4-2',
        text: 'Analyze descriptive vs. substantive representation',
        standard: 'D2.Civ.3.9-12',
      },
      {
        id: 'H4-3',
        text: 'Evaluate multiple perspectives on representational theory',
        standard: 'D4.6.9-12',
      },
      { id: 'H4-4', text: 'Use data to support arguments about representation' },
    ],
    vocabulary: [
      'Descriptive representation',
      'Substantive representation',
      'Demographics',
      'Overrepresentation',
      'Underrepresentation',
      'Constituency',
    ],
    materials: [
      'Computer/laptop access',
      'Worksheet H4: Representation Analysis',
      'Current Congress demographic data',
      'US Census demographic data',
    ],
    activities: [
      {
        title: 'Congressional Demographics',
        description:
          'Collect data on Congress: gender, race/ethnicity, average age, professional backgrounds. Compare to US population.',
        duration: '20 minutes',
        type: 'exploration',
        civiqFeature: 'Representatives',
        civiqPath: '/representatives/all',
      },
      {
        title: 'Your District Analysis',
        description:
          'Compare your representative\'s demographics to your district\'s demographics. How closely do they "match"?',
        duration: '15 minutes',
        type: 'exploration',
        civiqFeature: 'District Profile',
        civiqPath: '/districts',
      },
      {
        title: 'Seminar Discussion',
        description:
          'Structured discussion: Does descriptive representation matter? What factors might be MORE important?',
        duration: '15 minutes',
        type: 'discussion',
      },
    ],
    discussionQuestions: [
      { question: "Can someone represent you effectively if they're different from you?" },
      { question: 'What are the advantages of a Congress that looks like America?' },
      { question: 'What might be MORE important than demographic similarity?' },
    ],
    assessment:
      'Students complete analysis worksheet and participate in discussion using evidence.',
    extensions: [
      'Research how Congressional demographics have changed over time',
      'Compare representation in Congress to other democracies',
    ],
    teacherNotes: [
      'This is a VALUES question, not just a data question',
      "Data informs the debate but doesn't settle it",
      'Encourage multiple valid perspectives',
    ],
    printableId: 'worksheet-H4',
    c3Standards: ['D2.Geo.6.9-12', 'D2.Civ.3.9-12', 'D4.6.9-12'],
  },
  {
    id: 'H5',
    title: 'Comparative State Analysis',
    gradeLevel: 'high',
    topic: 'state-government',
    duration: '60 minutes',
    essentialQuestion: 'How do state legislatures differ, and what explains the variation?',
    overview:
      'Students compare structural features and policies across multiple state legislatures.',
    objectives: [
      {
        id: 'H5-1',
        text: 'Compare structural features of multiple state legislatures',
        standard: 'D2.Civ.5.9-12',
      },
      { id: 'H5-2', text: 'Analyze how state characteristics influence legislative design' },
      {
        id: 'H5-3',
        text: 'Research state legislation on a topic across multiple states',
        standard: 'D2.Civ.8.9-12',
      },
      {
        id: 'H5-4',
        text: 'Develop hypotheses about state policy variation',
        standard: 'D4.2.9-12',
      },
    ],
    vocabulary: [
      'Legislative professionalism',
      'Citizen legislature',
      'Session length',
      'Term limits',
      'Laboratories of democracy',
    ],
    materials: [
      'Computer/laptop access',
      'Worksheet H5: State Comparison Analysis',
      'State legislature fact sheet',
    ],
    activities: [
      {
        title: 'Structure Comparison',
        description:
          'Select 4 states. Use CIV.IQ to collect: number of legislators, term lengths, session type, salary, population.',
        duration: '20 minutes',
        type: 'exploration',
        civiqFeature: 'State Legislature',
        civiqPath: '/state-legislature',
      },
      {
        title: 'Policy Tracking',
        description:
          'Select one policy topic (minimum wage, education, etc.). For each of your 4 states, find current law and recent legislation.',
        duration: '20 minutes',
        type: 'exploration',
        civiqFeature: 'State Bills',
        civiqPath: '/state-bills',
      },
      {
        title: 'Hypothesis Development',
        description:
          'Look for patterns. Develop hypotheses: What predicts legislative structure? What predicts policy position?',
        duration: '15 minutes',
        type: 'discussion',
      },
    ],
    discussionQuestions: [
      { question: 'Why do state legislatures vary so much?' },
      { question: 'Does party control predict policy position?' },
      { question: 'What are the tradeoffs of full-time vs. part-time legislatures?' },
    ],
    assessment: 'Students complete comparative analysis with evidence-based hypotheses.',
    extensions: [
      'Research how one policy spread across states over time',
      'Compare your state to a similar-sized state',
    ],
    printableId: 'worksheet-H5',
    c3Standards: ['D2.Civ.5.9-12', 'D2.Civ.8.9-12', 'D4.2.9-12'],
  },
  {
    id: 'H6',
    title: 'Independent Research Project',
    gradeLevel: 'high',
    topic: 'data-literacy',
    duration: '3-4 class periods',
    essentialQuestion: 'What original civic question can you investigate using public data?',
    overview: 'Students design and execute original research projects using CIV.IQ data.',
    objectives: [
      {
        id: 'H6-1',
        text: 'Design and execute an original research project',
        standard: 'D3.1.9-12',
      },
      {
        id: 'H6-2',
        text: 'Collect and analyze civic data systematically',
        standard: 'D3.2.9-12',
      },
      {
        id: 'H6-3',
        text: 'Present findings with appropriate evidence and caveats',
        standard: 'D3.3.9-12',
      },
      {
        id: 'H6-4',
        text: 'Respond to peer feedback constructively',
        standard: 'D4.1.9-12',
      },
    ],
    vocabulary: [
      'Research question',
      'Methodology',
      'Data collection',
      'Analysis',
      'Findings',
      'Limitations',
      'Peer review',
    ],
    materials: [
      'Computer/laptop access',
      'Worksheet H6: Research Project Framework',
      'Research Project Guide',
      'Presentation rubric',
    ],
    activities: [
      {
        title: 'Phase 1: Research Design (Day 1)',
        description:
          'Students propose research question. Must be testable with CIV.IQ data, specific, and original. Teacher approval required.',
        duration: '1 class period',
        type: 'guided-practice',
      },
      {
        title: 'Phase 2: Data Collection (Day 2)',
        description:
          'Systematically collect data. Minimum 15 data points, at least 2 variables, documented sources.',
        duration: '1 class period',
        type: 'exploration',
        civiqFeature: 'Multiple',
        civiqPath: '/',
      },
      {
        title: 'Phase 3: Analysis & Writing (Day 3)',
        description:
          'Analyze data, write 2-3 page research summary: introduction, methods, findings, analysis, limitations.',
        duration: '1 class period',
        type: 'project',
      },
      {
        title: 'Phase 4: Presentation & Peer Review (Day 4)',
        description:
          'Brief presentations (3-5 min). Present question, data, findings, limitations. Peer feedback.',
        duration: '1 class period',
        type: 'discussion',
      },
    ],
    discussionQuestions: [
      { question: 'What did we learn collectively from all the research projects?' },
      { question: 'What follow-up questions emerged from your research?' },
      { question: 'How could your research be improved with more time/data?' },
    ],
    assessment:
      'Research question quality (20%), Data collection (20%), Analysis accuracy (20%), Limitations acknowledgment (20%), Presentation clarity (20%)',
    extensions: [
      'Develop follow-up research question',
      'Write formal research paper with literature review',
    ],
    printableId: 'worksheet-H6',
    c3Standards: ['D3.1.9-12', 'D3.2.9-12', 'D3.3.9-12', 'D4.1.9-12'],
  },
  {
    id: 'H7',
    title: 'Civic Data Literacy',
    gradeLevel: 'high',
    topic: 'data-literacy',
    duration: '55 minutes',
    essentialQuestion: 'How do we evaluate civic information quality and verify claims?',
    overview:
      'Students learn to evaluate sources, verify political claims, and recognize misleading data.',
    objectives: [
      {
        id: 'H7-1',
        text: 'Identify primary vs. secondary sources for civic data',
        standard: 'D3.1.9-12',
      },
      {
        id: 'H7-2',
        text: 'Evaluate the credibility of civic information sources',
        standard: 'D3.2.9-12',
      },
      { id: 'H7-3', text: 'Verify political claims using government data' },
      {
        id: 'H7-4',
        text: 'Recognize common misleading uses of data',
        standard: 'D4.3.9-12',
      },
    ],
    vocabulary: [
      'Primary source',
      'Secondary source',
      'Verification',
      'Cherry-picking',
      'Misleading axis',
      'Context',
      'Attribution',
    ],
    materials: [
      'Computer/laptop access',
      'Worksheet H7: Information Evaluation',
      'Examples of misleading political graphics',
      'Claim verification checklist',
    ],
    activities: [
      {
        title: 'Source Hierarchy',
        description:
          'Rank sources from most to least reliable: Congress.gov, think tank report, news article, social media post. Explain ranking.',
        duration: '10 minutes',
        type: 'discussion',
      },
      {
        title: 'Claim Verification',
        description:
          'Present 4 claims about Congress. For each: What data would verify it? Navigate CIV.IQ to check.',
        duration: '20 minutes',
        type: 'exploration',
        civiqFeature: 'Multiple',
        civiqPath: '/',
      },
      {
        title: 'Misleading Data Recognition',
        description:
          'Examine examples of misleading political graphics. Identify manipulation tactic and how to fix it.',
        duration: '15 minutes',
        type: 'guided-practice',
      },
      {
        title: 'Real-World Verification',
        description:
          'Find one political claim online. Attempt to verify using CIV.IQ data. Report: claim, verification status, data used.',
        duration: '10 minutes',
        type: 'exploration',
      },
    ],
    discussionQuestions: [
      { question: 'Why prefer primary sources over secondary?' },
      { question: 'What are common ways data is used misleadingly?' },
      { question: 'What principles will you use to evaluate civic information?' },
    ],
    assessment:
      'Students complete information evaluation worksheet and successful claim verification.',
    extensions: [
      'Analyze a political advertisement for data accuracy',
      'Create a "misleading vs. accurate" comparison graphic',
    ],
    printableId: 'worksheet-H7',
    c3Standards: ['D3.1.9-12', 'D3.2.9-12', 'D4.3.9-12'],
  },
];

// ============================================================================
// WORKSHEET CONTENT
// ============================================================================

export interface WorksheetField {
  label: string;
  type: 'text' | 'textarea' | 'checkbox' | 'table' | 'drawing';
  placeholder?: string;
  rows?: number;
  columns?: string[];
  options?: string[];
}

export interface Worksheet {
  id: string;
  lessonId: string;
  title: string;
  gradeLevel: GradeLevel;
  fields: WorksheetField[];
}

export const WORKSHEETS: Worksheet[] = [
  {
    id: 'worksheet-E1',
    lessonId: 'E1',
    title: 'My Representatives',
    gradeLevel: 'elementary',
    fields: [
      { label: 'My ZIP code', type: 'text', placeholder: '00000' },
      { label: 'Senator 1 Name', type: 'text' },
      {
        label: 'Senator 1 Party',
        type: 'checkbox',
        options: ['Democratic', 'Republican', 'Other'],
      },
      { label: 'Senator 2 Name', type: 'text' },
      {
        label: 'Senator 2 Party',
        type: 'checkbox',
        options: ['Democratic', 'Republican', 'Other'],
      },
      { label: 'House Representative Name', type: 'text' },
      {
        label: 'House Representative Party',
        type: 'checkbox',
        options: ['Democratic', 'Republican', 'Other'],
      },
      { label: 'District Number', type: 'text' },
      { label: 'Draw one of your representatives', type: 'drawing' },
      { label: 'One thing I noticed', type: 'textarea', rows: 2 },
    ],
  },
  {
    id: 'worksheet-E2',
    lessonId: 'E2',
    title: "A Representative's Job",
    gradeLevel: 'elementary',
    fields: [
      { label: 'Representative Name', type: 'text' },
      { label: 'State', type: 'text' },
      { label: 'Chamber', type: 'checkbox', options: ['Senate', 'House'] },
      { label: 'Committee 1', type: 'text' },
      { label: 'Committee 2', type: 'text' },
      { label: 'Committee 3', type: 'text' },
      { label: 'What topics do these committees work on?', type: 'textarea', rows: 2 },
      { label: 'One bill they are working on', type: 'text' },
      { label: 'What I think this bill does', type: 'textarea', rows: 2 },
      { label: 'Office phone number', type: 'text' },
      { label: 'If I were a representative, I would work on...', type: 'textarea', rows: 2 },
      { label: 'Draw your representative at work', type: 'drawing' },
    ],
  },
  {
    id: 'worksheet-E3',
    lessonId: 'E3',
    title: 'My District Map',
    gradeLevel: 'elementary',
    fields: [
      { label: 'State', type: 'text' },
      { label: 'District Number', type: 'text' },
      { label: 'Representative Name', type: 'text' },
      { label: 'Sketch your district shape (mark school with ⭐)', type: 'drawing' },
      { label: 'Neighboring District #1', type: 'text' },
      { label: 'Represented by', type: 'text' },
      { label: 'Neighboring District #2', type: 'text' },
      { label: 'Represented by', type: 'text' },
      {
        label: 'Geographic Type',
        type: 'checkbox',
        options: ['Urban (city)', 'Suburban', 'Rural (countryside)', 'Mixed'],
      },
      { label: 'Why are district lines where they are?', type: 'textarea', rows: 2 },
    ],
  },
  {
    id: 'worksheet-E4',
    lessonId: 'E4',
    title: "A Bill's Journey",
    gradeLevel: 'elementary',
    fields: [
      { label: 'Bill Number', type: 'text', placeholder: 'H.R. 000 or S. 000' },
      { label: 'Bill Title', type: 'text' },
      { label: 'Sponsored by', type: 'text' },
      { label: 'What I think this bill would do', type: 'textarea', rows: 2 },
      {
        label: 'Current Status',
        type: 'checkbox',
        options: [
          'Just introduced',
          'In committee',
          'Passed House',
          'Passed Senate',
          'Became law',
          'Did not pass',
        ],
      },
      { label: 'Committee it was referred to', type: 'text' },
      { label: 'Why do most bills NOT become laws?', type: 'textarea', rows: 2 },
      { label: 'If I wrote a bill, it would be about...', type: 'textarea', rows: 2 },
    ],
  },
  {
    id: 'worksheet-E5',
    lessonId: 'E5',
    title: 'Writing to My Representative',
    gradeLevel: 'elementary',
    fields: [
      { label: 'Representative Name', type: 'text' },
      { label: 'Office Address', type: 'text' },
      {
        label: 'Ways to contact them',
        type: 'checkbox',
        options: ['Mail', 'Phone', 'Website form', 'Social media'],
      },
      { label: 'An issue I care about', type: 'text' },
      { label: 'Why I care about this', type: 'textarea', rows: 2 },
      { label: 'My message (use separate paper if needed)', type: 'textarea', rows: 6 },
    ],
  },
];

// ============================================================================
// ASSESSMENT RUBRICS
// ============================================================================

export interface RubricCriterion {
  criterion: string;
  levels: {
    exemplary: string;
    proficient: string;
    developing: string;
    beginning: string;
  };
}

export interface AssessmentRubric {
  id: string;
  gradeLevel: GradeLevel;
  title: string;
  criteria: RubricCriterion[];
}

export const ASSESSMENT_RUBRICS: AssessmentRubric[] = [
  {
    id: 'rubric-elementary',
    gradeLevel: 'elementary',
    title: 'Elementary Assessment Rubric',
    criteria: [
      {
        criterion: 'Identification',
        levels: {
          exemplary: 'Correctly identifies all representatives with details',
          proficient: 'Correctly identifies all representatives',
          developing: 'Identifies some representatives',
          beginning: 'Unable to identify representatives',
        },
      },
      {
        criterion: 'Navigation',
        levels: {
          exemplary: 'Independently navigates CIV.IQ',
          proficient: 'Navigates with minimal help',
          developing: 'Needs frequent assistance',
          beginning: 'Cannot navigate without full support',
        },
      },
      {
        criterion: 'Explanation',
        levels: {
          exemplary: 'Explains representative role clearly',
          proficient: 'Explains basic role',
          developing: 'Partial explanation',
          beginning: 'Cannot explain',
        },
      },
      {
        criterion: 'Engagement',
        levels: {
          exemplary: 'Asks thoughtful questions, eager to explore',
          proficient: 'Participates actively',
          developing: 'Participates when prompted',
          beginning: 'Minimal participation',
        },
      },
    ],
  },
  {
    id: 'rubric-middle',
    gradeLevel: 'middle',
    title: 'Middle School Assessment Rubric',
    criteria: [
      {
        criterion: 'Data Collection',
        levels: {
          exemplary: 'Accurate, complete, well-organized',
          proficient: 'Accurate and complete',
          developing: 'Some errors or gaps',
          beginning: 'Major errors or incomplete',
        },
      },
      {
        criterion: 'Analysis',
        levels: {
          exemplary: 'Identifies multiple patterns with evidence',
          proficient: 'Identifies patterns',
          developing: 'Basic observations only',
          beginning: 'No meaningful analysis',
        },
      },
      {
        criterion: 'Comparison',
        levels: {
          exemplary: 'Sophisticated comparison with context',
          proficient: 'Clear comparison',
          developing: 'Partial comparison',
          beginning: 'No comparison',
        },
      },
      {
        criterion: 'Explanation',
        levels: {
          exemplary: 'Clear, accurate, shows understanding',
          proficient: 'Mostly clear and accurate',
          developing: 'Partially clear',
          beginning: 'Unclear or inaccurate',
        },
      },
    ],
  },
  {
    id: 'rubric-high',
    gradeLevel: 'high',
    title: 'High School Assessment Rubric',
    criteria: [
      {
        criterion: 'Research Design',
        levels: {
          exemplary: 'Original, specific, well-bounded question',
          proficient: 'Good question, testable',
          developing: 'Vague or too broad',
          beginning: 'Not testable',
        },
      },
      {
        criterion: 'Data Collection',
        levels: {
          exemplary: 'Systematic, thorough, documented',
          proficient: 'Complete and accurate',
          developing: 'Some gaps',
          beginning: 'Incomplete',
        },
      },
      {
        criterion: 'Analysis',
        levels: {
          exemplary: 'Sophisticated, acknowledges complexity',
          proficient: 'Sound analysis',
          developing: 'Basic analysis',
          beginning: 'Flawed analysis',
        },
      },
      {
        criterion: 'Limitations',
        levels: {
          exemplary: 'Thoughtfully addresses multiple limitations',
          proficient: 'Acknowledges limitations',
          developing: 'Minimal acknowledgment',
          beginning: 'Ignores limitations',
        },
      },
      {
        criterion: 'Writing',
        levels: {
          exemplary: 'Clear, evidence-based, well-structured',
          proficient: 'Mostly clear with evidence',
          developing: 'Partially supported',
          beginning: 'Unsupported claims',
        },
      },
    ],
  },
];

// ============================================================================
// TEACHER RESOURCES
// ============================================================================

export interface TeacherResource {
  id: string;
  title: string;
  description: string;
  type: 'guide' | 'standards' | 'rubric' | 'quick-reference';
  gradeLevel: GradeLevel | 'all';
  content?: string;
}

export const TEACHER_RESOURCES: TeacherResource[] = [
  {
    id: 'getting-started',
    title: 'Getting Started with CIV.IQ in the Classroom',
    description:
      'A comprehensive guide for teachers on using CIV.IQ as a teaching tool, including tips for navigating the platform and integrating it into lessons.',
    type: 'guide',
    gradeLevel: 'all',
  },
  {
    id: 'ncss-alignment',
    title: 'NCSS C3 Framework Alignment Guide',
    description:
      'Shows how CIV.IQ lessons align with the College, Career, and Civic Life (C3) Framework for Social Studies State Standards.',
    type: 'standards',
    gradeLevel: 'all',
  },
  {
    id: 'quick-reference',
    title: 'CIV.IQ Quick Reference Card',
    description:
      'A one-page reference card showing key CIV.IQ features, navigation paths, and data sources.',
    type: 'quick-reference',
    gradeLevel: 'all',
  },
  {
    id: 'elem-teacher-guide',
    title: 'Elementary Teacher Guide',
    description:
      'Focus: Building civic awareness and comfort with government information. Key skills: Navigation, identification, basic comprehension.',
    type: 'guide',
    gradeLevel: 'elementary',
  },
  {
    id: 'mid-teacher-guide',
    title: 'Middle School Teacher Guide',
    description:
      'Focus: Understanding government as interconnected systems. Key skills: Analysis, comparison, basic data interpretation.',
    type: 'guide',
    gradeLevel: 'middle',
  },
  {
    id: 'high-teacher-guide',
    title: 'High School Teacher Guide',
    description:
      'Focus: Independent civic research and evidence-based argument. Key skills: Research design, data analysis, critical evaluation.',
    type: 'guide',
    gradeLevel: 'high',
  },
  {
    id: 'elem-rubric',
    title: 'Elementary Assessment Rubric',
    description:
      'A rubric for assessing elementary student understanding of civics concepts taught through CIV.IQ.',
    type: 'rubric',
    gradeLevel: 'elementary',
  },
  {
    id: 'mid-rubric',
    title: 'Middle School Assessment Rubric',
    description:
      'A rubric for assessing middle school student research and analysis skills using CIV.IQ data.',
    type: 'rubric',
    gradeLevel: 'middle',
  },
  {
    id: 'high-rubric',
    title: 'High School Assessment Rubric',
    description:
      'A rubric for assessing high school student critical analysis and synthesis using CIV.IQ.',
    type: 'rubric',
    gradeLevel: 'high',
  },
];

// ============================================================================
// C3 STANDARDS ALIGNMENT
// ============================================================================

export interface C3Standard {
  code: string;
  dimension: string;
  description: string;
  lessons: string[];
}

export const C3_STANDARDS: C3Standard[] = [
  // Dimension 2: Civics
  {
    code: 'D2.Civ.1.K-2',
    dimension: 'Civics',
    description: 'Explain what governments are and some of their functions.',
    lessons: ['E1', 'E2'],
  },
  {
    code: 'D2.Civ.3.K-2',
    dimension: 'Civics',
    description: 'Explain how rules function in public settings.',
    lessons: ['E1'],
  },
  {
    code: 'D2.Civ.4.3-5',
    dimension: 'Civics',
    description: 'Explain how government derives its power from the people.',
    lessons: ['E3'],
  },
  {
    code: 'D2.Civ.6.3-5',
    dimension: 'Civics',
    description: 'Explain how people influence others through communication and persuasion.',
    lessons: ['E4'],
  },
  {
    code: 'D2.Civ.9.3-5',
    dimension: 'Civics',
    description: 'Use deliberative processes when making decisions.',
    lessons: ['E5'],
  },
  {
    code: 'D2.Civ.10.3-5',
    dimension: 'Civics',
    description:
      'Identify the beliefs, experiences, perspectives, and values that underlie their own point of view.',
    lessons: ['E5'],
  },
  {
    code: 'D2.Civ.12.3-5',
    dimension: 'Civics',
    description: 'Explain how rules and laws change society and how people change rules and laws.',
    lessons: ['E4'],
  },
  {
    code: 'D2.Civ.1.6-8',
    dimension: 'Civics',
    description:
      'Distinguish the powers and responsibilities of citizens, political parties, interest groups, and the media.',
    lessons: ['M1'],
  },
  {
    code: 'D2.Civ.4.6-8',
    dimension: 'Civics',
    description: 'Explain the powers and limits of the three branches.',
    lessons: ['M1'],
  },
  {
    code: 'D2.Civ.5.6-8',
    dimension: 'Civics',
    description: 'Explain the origins, functions, and structure of government.',
    lessons: ['M2', 'M5'],
  },
  {
    code: 'D2.Civ.6.6-8',
    dimension: 'Civics',
    description: 'Describe the roles of political, civil, and economic organizations.',
    lessons: ['M2', 'M3'],
  },
  {
    code: 'D2.Civ.8.6-8',
    dimension: 'Civics',
    description: 'Analyze ideas and principles contained in the founding documents.',
    lessons: ['M5'],
  },
  {
    code: 'D2.Civ.13.6-8',
    dimension: 'Civics',
    description: 'Analyze the impact of citizens and groups on government policy.',
    lessons: ['M4'],
  },
  {
    code: 'D2.Civ.3.9-12',
    dimension: 'Civics',
    description:
      'Analyze the impact of constitutions, laws, treaties, and international agreements.',
    lessons: ['H3', 'H4'],
  },
  {
    code: 'D2.Civ.5.9-12',
    dimension: 'Civics',
    description:
      "Evaluate citizens' and institutions' effectiveness in addressing social and political problems.",
    lessons: ['H5'],
  },
  {
    code: 'D2.Civ.6.9-12',
    dimension: 'Civics',
    description: 'Critique relationships among governments, civil societies, and economic markets.',
    lessons: ['H3'],
  },
  {
    code: 'D2.Civ.8.9-12',
    dimension: 'Civics',
    description: 'Evaluate multiple perspectives on government policies at all levels.',
    lessons: ['H5'],
  },
  {
    code: 'D2.Civ.10.9-12',
    dimension: 'Civics',
    description:
      'Analyze the impact and the appropriate roles of personal interests and perspectives.',
    lessons: ['H1'],
  },
  {
    code: 'D2.Civ.13.9-12',
    dimension: 'Civics',
    description: 'Evaluate public policies in terms of intended and unintended outcomes.',
    lessons: ['H2'],
  },
  // Dimension 2: Geography
  {
    code: 'D2.Geo.1.3-5',
    dimension: 'Geography',
    description: 'Construct maps and other graphic representations.',
    lessons: ['E3'],
  },
  {
    code: 'D2.Geo.2.6-8',
    dimension: 'Geography',
    description: 'Use maps, satellite images, photographs, and other representations.',
    lessons: ['M6'],
  },
  {
    code: 'D2.Geo.4.6-8',
    dimension: 'Geography',
    description: 'Explain how cultural patterns and economic decisions influence environments.',
    lessons: ['M6'],
  },
  {
    code: 'D2.Geo.6.9-12',
    dimension: 'Geography',
    description:
      'Evaluate the impact of human settlement activities on the environmental and cultural characteristics.',
    lessons: ['H4'],
  },
  // Dimension 2: Economics
  {
    code: 'D2.Eco.1.6-8',
    dimension: 'Economics',
    description: 'Explain how economic decisions affect the well-being of individuals.',
    lessons: ['M4'],
  },
  {
    code: 'D2.Eco.2.9-12',
    dimension: 'Economics',
    description: 'Use marginal benefits and marginal costs to construct an argument.',
    lessons: ['H2'],
  },
  // Dimension 3: Gathering and Evaluating Sources
  {
    code: 'D3.1.6-8',
    dimension: 'Gathering Sources',
    description: 'Gather relevant information from multiple sources.',
    lessons: ['M3', 'M6'],
  },
  {
    code: 'D3.1.9-12',
    dimension: 'Gathering Sources',
    description:
      'Gather relevant information from multiple sources representing a wide range of views.',
    lessons: ['H1', 'H2', 'H6', 'H7'],
  },
  {
    code: 'D3.2.9-12',
    dimension: 'Evaluating Sources',
    description: 'Evaluate the credibility of a source by examining how experts value the source.',
    lessons: ['H1', 'H3', 'H6', 'H7'],
  },
  {
    code: 'D3.3.9-12',
    dimension: 'Developing Claims',
    description: 'Identify evidence that draws information directly from sources.',
    lessons: ['H6'],
  },
  // Dimension 4: Communicating Conclusions
  {
    code: 'D4.1.9-12',
    dimension: 'Communicating',
    description: 'Construct arguments using precise and knowledgeable claims.',
    lessons: ['H6'],
  },
  {
    code: 'D4.2.9-12',
    dimension: 'Communicating',
    description: 'Construct explanations using sound reasoning.',
    lessons: ['H5'],
  },
  {
    code: 'D4.3.9-12',
    dimension: 'Communicating',
    description: 'Present adaptations of arguments and explanations.',
    lessons: ['H7'],
  },
  {
    code: 'D4.6.9-12',
    dimension: 'Taking Informed Action',
    description:
      'Use disciplinary and interdisciplinary lenses to understand the characteristics and causes of problems.',
    lessons: ['H4'],
  },
];

// ============================================================================
// COMBINED CURRICULUM & HELPERS
// ============================================================================

export const EDUCATION_CURRICULUM: Lesson[] = [
  ...ELEMENTARY_LESSONS,
  ...MIDDLE_SCHOOL_LESSONS,
  ...HIGH_SCHOOL_LESSONS,
];

export function getLessonsByGradeLevel(gradeLevel: GradeLevel): Lesson[] {
  return EDUCATION_CURRICULUM.filter(lesson => lesson.gradeLevel === gradeLevel);
}

export function getLessonsByTopic(topic: LessonTopic): Lesson[] {
  return EDUCATION_CURRICULUM.filter(lesson => lesson.topic === topic);
}

export function getLessonById(id: string): Lesson | undefined {
  return EDUCATION_CURRICULUM.find(lesson => lesson.id === id);
}

export function searchLessons(query: string): Lesson[] {
  const lowerQuery = query.toLowerCase();
  return EDUCATION_CURRICULUM.filter(
    lesson =>
      lesson.title.toLowerCase().includes(lowerQuery) ||
      lesson.overview.toLowerCase().includes(lowerQuery) ||
      lesson.essentialQuestion.toLowerCase().includes(lowerQuery) ||
      lesson.vocabulary.some(v => v.toLowerCase().includes(lowerQuery))
  );
}

export function getWorksheetByLessonId(lessonId: string): Worksheet | undefined {
  return WORKSHEETS.find(w => w.lessonId === lessonId);
}

export function getRubricByGradeLevel(gradeLevel: GradeLevel): AssessmentRubric | undefined {
  return ASSESSMENT_RUBRICS.find(r => r.gradeLevel === gradeLevel);
}

export function getC3StandardsByLesson(lessonId: string): C3Standard[] {
  return C3_STANDARDS.filter(s => s.lessons.includes(lessonId));
}
