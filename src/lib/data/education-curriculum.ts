/**
 * Education Curriculum - Civics lessons for K-12 educators
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
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
  type: 'exploration' | 'discussion' | 'worksheet' | 'project';
  civiqFeature?: string; // CIV.IQ feature to use
  civiqPath?: string; // URL path on CIV.IQ
}

export interface DiscussionQuestion {
  question: string;
  followUp?: string;
}

export interface Lesson {
  id: string;
  title: string;
  gradeLevel: GradeLevel;
  topic: LessonTopic;
  duration: string;
  overview: string;
  objectives: LearningObjective[];
  vocabulary: string[];
  activities: Activity[];
  discussionQuestions: DiscussionQuestion[];
  assessment?: string;
  extensions?: string[];
  printableId?: string; // ID for downloadable worksheet
}

export type LessonTopic =
  | 'representatives'
  | 'how-government-works'
  | 'legislation'
  | 'elections'
  | 'civic-participation'
  | 'campaign-finance'
  | 'state-government';

export const LESSON_TOPICS: Record<LessonTopic, string> = {
  representatives: 'Representatives & Congress',
  'how-government-works': 'How Government Works',
  legislation: 'Bills & Laws',
  elections: 'Elections & Voting',
  'civic-participation': 'Civic Participation',
  'campaign-finance': 'Campaign Finance',
  'state-government': 'State Government',
};

export const GRADE_LEVEL_INFO: Record<
  GradeLevel,
  { label: string; grades: string; description: string; color: string }
> = {
  elementary: {
    label: 'Elementary',
    grades: 'K-5',
    description: 'Foundational civics concepts with hands-on exploration',
    color: 'civiq-green',
  },
  middle: {
    label: 'Middle School',
    grades: '6-8',
    description: 'Deeper analysis of government structure and processes',
    color: 'civiq-blue',
  },
  high: {
    label: 'High School',
    grades: '9-12',
    description: 'Advanced civics with data analysis and critical thinking',
    color: 'civiq-red',
  },
};

// ============================================================================
// ELEMENTARY SCHOOL LESSONS (K-5)
// ============================================================================

const ELEMENTARY_LESSONS: Lesson[] = [
  {
    id: 'elem-who-represents-me',
    title: 'Who Represents Me?',
    gradeLevel: 'elementary',
    topic: 'representatives',
    duration: '45 minutes',
    overview:
      'Students discover who their elected representatives are at the federal level by exploring their congressional district using their ZIP code.',
    objectives: [
      {
        id: 'obj-1',
        text: 'Identify their U.S. Representative and two Senators',
        standard: 'D2.Civ.3.K-2',
      },
      {
        id: 'obj-2',
        text: 'Understand that representatives are elected to speak for the people in their area',
        standard: 'D2.Civ.6.3-5',
      },
      {
        id: 'obj-3',
        text: 'Locate basic information about their representatives (name, party, photo)',
      },
    ],
    vocabulary: ['Representative', 'Senator', 'Congress', 'District', 'Elected', 'Government'],
    activities: [
      {
        title: 'Find Your Representatives',
        description:
          "Use CIV.IQ to look up representatives by entering your school's ZIP code. Record the names of your U.S. Representative and two Senators.",
        duration: '15 minutes',
        type: 'exploration',
        civiqFeature: 'ZIP Code Lookup',
        civiqPath: '/',
      },
      {
        title: 'Representative Profile Cards',
        description:
          'Create a simple profile card for each representative with their name, photo, party, and one interesting fact.',
        duration: '20 minutes',
        type: 'project',
      },
      {
        title: 'Class Discussion: What Do Representatives Do?',
        description:
          'Discuss as a class what it means to represent people and why we need representatives.',
        duration: '10 minutes',
        type: 'discussion',
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
      {
        question: 'What makes a good representative?',
      },
    ],
    assessment:
      'Students can correctly name their U.S. Representative and at least one Senator, and explain that representatives are elected to make decisions for the people.',
    extensions: [
      'Write a letter to your representative about something important to you',
      'Compare representatives from different states - how are they similar or different?',
    ],
    printableId: 'elem-who-represents-me-worksheet',
  },
  {
    id: 'elem-three-branches',
    title: 'The Three Branches of Government',
    gradeLevel: 'elementary',
    topic: 'how-government-works',
    duration: '50 minutes',
    overview:
      'Students learn about the three branches of the federal government and how they work together, with a focus on Congress (the legislative branch).',
    objectives: [
      {
        id: 'obj-1',
        text: 'Name the three branches of government',
        standard: 'D2.Civ.4.K-2',
      },
      {
        id: 'obj-2',
        text: 'Explain the main job of each branch',
        standard: 'D2.Civ.5.3-5',
      },
      {
        id: 'obj-3',
        text: 'Understand why we have three separate branches',
      },
    ],
    vocabulary: [
      'Legislative',
      'Executive',
      'Judicial',
      'Branch',
      'Congress',
      'President',
      'Supreme Court',
      'Checks and Balances',
    ],
    activities: [
      {
        title: 'Branch Sorting Game',
        description:
          'Sort cards with different government jobs (makes laws, enforces laws, interprets laws, signs bills, declares laws unconstitutional) into three branches.',
        duration: '15 minutes',
        type: 'exploration',
      },
      {
        title: 'Explore Congress on CIV.IQ',
        description:
          'Look at the committees page to see how Congress organizes its work. Count how many committees there are.',
        duration: '15 minutes',
        type: 'exploration',
        civiqFeature: 'Committees',
        civiqPath: '/committees',
      },
      {
        title: 'Three Branches Poster',
        description:
          'Create a poster showing the three branches with pictures and the main job of each.',
        duration: '20 minutes',
        type: 'project',
      },
    ],
    discussionQuestions: [
      {
        question: 'Why do you think we have three branches instead of just one?',
        followUp: 'What could go wrong if one person or group made all the decisions?',
      },
      {
        question: 'Which branch do you think is most important? Why?',
      },
      {
        question: 'If you could work in government, which branch would you want to work in?',
      },
    ],
    assessment: 'Students can name all three branches and describe the main job of each branch.',
    printableId: 'elem-three-branches-worksheet',
  },
  {
    id: 'elem-how-bill-becomes-law',
    title: 'How a Bill Becomes a Law',
    gradeLevel: 'elementary',
    topic: 'legislation',
    duration: '45 minutes',
    overview:
      "Students learn the basic steps of how an idea becomes a law, from introduction in Congress to the President's signature.",
    objectives: [
      {
        id: 'obj-1',
        text: 'Describe the basic steps of how a bill becomes a law',
        standard: 'D2.Civ.8.3-5',
      },
      {
        id: 'obj-2',
        text: 'Understand that laws start as ideas from citizens and representatives',
      },
      {
        id: 'obj-3',
        text: 'Identify where a bill is in the legislative process',
      },
    ],
    vocabulary: ['Bill', 'Law', 'Congress', 'Vote', 'Committee', 'Veto', 'Pass'],
    activities: [
      {
        title: 'Bill Journey Story',
        description:
          'Follow along as the teacher tells the story of "Billy the Bill" and his journey to become a law. Act out the different steps.',
        duration: '15 minutes',
        type: 'exploration',
      },
      {
        title: 'Find Real Bills',
        description:
          'Use CIV.IQ to look at the latest bills page. Find one bill and identify: Who introduced it? What is it about?',
        duration: '15 minutes',
        type: 'exploration',
        civiqFeature: 'Latest Bills',
        civiqPath: '/legislation',
      },
      {
        title: 'Sequence Cards',
        description:
          'Put cards showing the steps of how a bill becomes a law in the correct order.',
        duration: '15 minutes',
        type: 'worksheet',
      },
    ],
    discussionQuestions: [
      {
        question: 'Why do you think it takes so many steps for a bill to become a law?',
      },
      {
        question:
          'If you could make one new law, what would it be? Who would you talk to about it?',
      },
      {
        question: "What happens if the President doesn't like a bill?",
      },
    ],
    assessment:
      'Students can describe at least 4 steps in the process of how a bill becomes a law.',
    printableId: 'elem-bill-to-law-worksheet',
  },
  {
    id: 'elem-your-district',
    title: 'Your Congressional District',
    gradeLevel: 'elementary',
    topic: 'representatives',
    duration: '40 minutes',
    overview:
      'Students explore their congressional district, learning about the community their representative serves.',
    objectives: [
      {
        id: 'obj-1',
        text: 'Identify their congressional district number',
        standard: 'D2.Geo.2.3-5',
      },
      {
        id: 'obj-2',
        text: 'Understand that districts are geographic areas with one representative',
      },
      {
        id: 'obj-3',
        text: 'Describe some features of their district',
      },
    ],
    vocabulary: ['District', 'Boundary', 'Map', 'Community', 'Population'],
    activities: [
      {
        title: 'Map Your District',
        description:
          'Use CIV.IQ to find your district and view its boundaries on a map. Identify cities or landmarks in your district.',
        duration: '15 minutes',
        type: 'exploration',
        civiqFeature: 'District Map',
        civiqPath: '/districts',
      },
      {
        title: 'District Facts',
        description:
          'Look up information about your district including population and area. Compare with a neighboring district.',
        duration: '15 minutes',
        type: 'exploration',
        civiqFeature: 'District Profile',
        civiqPath: '/districts',
      },
      {
        title: 'Draw Your District',
        description: 'Draw a simple map of your district and label important places you know.',
        duration: '10 minutes',
        type: 'project',
      },
    ],
    discussionQuestions: [
      {
        question: 'Why do you think some districts are bigger than others?',
      },
      {
        question: 'What are some special things about the community in your district?',
      },
    ],
    assessment:
      'Students can state their district number and describe at least two features of their district.',
    printableId: 'elem-your-district-worksheet',
  },
];

// ============================================================================
// MIDDLE SCHOOL LESSONS (6-8)
// ============================================================================

const MIDDLE_SCHOOL_LESSONS: Lesson[] = [
  {
    id: 'mid-tracking-legislation',
    title: 'Tracking Real Legislation',
    gradeLevel: 'middle',
    topic: 'legislation',
    duration: '60 minutes',
    overview:
      'Students learn to track the progress of real bills through Congress, understanding the legislative process through authentic data.',
    objectives: [
      {
        id: 'obj-1',
        text: 'Navigate congressional bill information to find status and sponsors',
        standard: 'D2.Civ.9.6-8',
      },
      {
        id: 'obj-2',
        text: 'Analyze the steps a bill takes through Congress',
        standard: 'D2.Civ.11.6-8',
      },
      {
        id: 'obj-3',
        text: 'Identify the committees involved in reviewing legislation',
      },
    ],
    vocabulary: [
      'Sponsor',
      'Co-sponsor',
      'Committee referral',
      'Markup',
      'Floor vote',
      'Conference committee',
      'Enrolled bill',
    ],
    activities: [
      {
        title: 'Bill Status Investigation',
        description:
          'Use CIV.IQ to find 3 bills currently in Congress. For each, record: title, sponsor, current status, and which committee is reviewing it.',
        duration: '20 minutes',
        type: 'exploration',
        civiqFeature: 'Legislation Tracker',
        civiqPath: '/legislation',
      },
      {
        title: "Follow Your Representative's Bills",
        description:
          'Look up your representative and find bills they have sponsored. Analyze what topics they focus on.',
        duration: '20 minutes',
        type: 'exploration',
        civiqFeature: 'Representative Bills',
        civiqPath: '/representatives',
      },
      {
        title: 'Legislative Journey Map',
        description:
          'Create a flowchart showing all the steps a bill takes from introduction to becoming law, including potential stopping points.',
        duration: '20 minutes',
        type: 'project',
      },
    ],
    discussionQuestions: [
      {
        question: 'Why do you think most bills never become laws?',
        followUp: 'What are some of the hurdles bills face?',
      },
      {
        question: 'How does the committee system help or slow down the legislative process?',
      },
      {
        question: 'If you were a representative, what kind of bill would you introduce?',
      },
    ],
    assessment:
      'Students can accurately describe the current status of a bill and explain the next steps it needs to take to become law.',
    extensions: [
      'Track a single bill over several weeks and report on its progress',
      'Compare the types of bills sponsored by representatives from different parties',
    ],
    printableId: 'mid-tracking-legislation-worksheet',
  },
  {
    id: 'mid-committee-deep-dive',
    title: 'Committee Deep Dive',
    gradeLevel: 'middle',
    topic: 'how-government-works',
    duration: '55 minutes',
    overview:
      'Students explore how congressional committees work, their role in shaping legislation, and how members are assigned.',
    objectives: [
      {
        id: 'obj-1',
        text: 'Explain the purpose and types of congressional committees',
        standard: 'D2.Civ.6.6-8',
      },
      {
        id: 'obj-2',
        text: 'Analyze committee membership and leadership',
      },
      {
        id: 'obj-3',
        text: 'Describe how committees influence legislation',
      },
    ],
    vocabulary: [
      'Standing committee',
      'Select committee',
      'Subcommittee',
      'Chair',
      'Ranking member',
      'Jurisdiction',
      'Hearing',
      'Markup',
    ],
    activities: [
      {
        title: 'Committee Explorer',
        description:
          "Browse CIV.IQ's committee pages. Choose one committee to investigate in depth. Find its members, recent bills, and jurisdiction.",
        duration: '20 minutes',
        type: 'exploration',
        civiqFeature: 'Committees',
        civiqPath: '/committees',
      },
      {
        title: 'Committee Assignments Analysis',
        description:
          'Look at which committees your representatives serve on. Why might they have chosen those committees?',
        duration: '15 minutes',
        type: 'exploration',
        civiqFeature: 'Representative Committees',
        civiqPath: '/representatives',
      },
      {
        title: 'Mock Committee Hearing',
        description:
          'Role-play a committee hearing on a current issue. Some students are committee members, others are witnesses.',
        duration: '20 minutes',
        type: 'project',
      },
    ],
    discussionQuestions: [
      {
        question: 'Why do you think Congress divides its work into committees?',
      },
      {
        question:
          'How might serving on a particular committee help a representative serve their district?',
      },
      {
        question: 'What makes someone qualified to be a committee chair?',
      },
    ],
    assessment:
      'Students can explain the role of committees in the legislative process and describe the structure of a specific committee.',
    printableId: 'mid-committee-deep-dive-worksheet',
  },
  {
    id: 'mid-voting-records',
    title: 'Analyzing Voting Records',
    gradeLevel: 'middle',
    topic: 'representatives',
    duration: '50 minutes',
    overview:
      'Students learn to interpret congressional voting records to understand how representatives make decisions.',
    objectives: [
      {
        id: 'obj-1',
        text: 'Interpret voting record data for a representative',
        standard: 'D2.Civ.10.6-8',
      },
      {
        id: 'obj-2',
        text: 'Analyze patterns in how representatives vote',
      },
      {
        id: 'obj-3',
        text: "Evaluate whether a representative's votes align with their stated positions",
      },
    ],
    vocabulary: [
      'Roll call vote',
      'Yea',
      'Nay',
      'Present',
      'Party-line vote',
      'Bipartisan',
      'Abstain',
    ],
    activities: [
      {
        title: 'Voting Record Review',
        description:
          "Look up your representative's recent votes on CIV.IQ. Record 5 votes and whether they voted Yea, Nay, or Present.",
        duration: '15 minutes',
        type: 'exploration',
        civiqFeature: 'Voting Records',
        civiqPath: '/representatives',
      },
      {
        title: 'Pattern Analysis',
        description:
          'Compare how two representatives from different parties voted on the same bills. What patterns do you notice?',
        duration: '20 minutes',
        type: 'exploration',
        civiqFeature: 'Compare Representatives',
        civiqPath: '/compare',
      },
      {
        title: 'Voting Record Report Card',
        description:
          'Create a "report card" for your representative based on issues you care about.',
        duration: '15 minutes',
        type: 'project',
      },
    ],
    discussionQuestions: [
      {
        question: 'How can citizens use voting records to hold representatives accountable?',
      },
      {
        question: 'Why might a representative vote against their party?',
      },
      {
        question: 'Should representatives always vote how their constituents want?',
      },
    ],
    assessment:
      'Students can accurately read and interpret a voting record and identify voting patterns.',
    printableId: 'mid-voting-records-worksheet',
  },
  {
    id: 'mid-district-demographics',
    title: 'Understanding Your District',
    gradeLevel: 'middle',
    topic: 'representatives',
    duration: '55 minutes',
    overview:
      'Students analyze demographic and economic data about their congressional district to understand the community their representative serves.',
    objectives: [
      {
        id: 'obj-1',
        text: 'Analyze demographic data about their congressional district',
        standard: 'D2.Geo.4.6-8',
      },
      {
        id: 'obj-2',
        text: 'Connect district characteristics to representative priorities',
      },
      {
        id: 'obj-3',
        text: 'Compare their district to others',
      },
    ],
    vocabulary: [
      'Demographics',
      'Census',
      'Population',
      'Median income',
      'Urban',
      'Rural',
      'Constituency',
    ],
    activities: [
      {
        title: 'District Data Analysis',
        description:
          'Use CIV.IQ to find demographic and economic data about your district. Record population, area, and economic indicators.',
        duration: '20 minutes',
        type: 'exploration',
        civiqFeature: 'District Profile',
        civiqPath: '/districts',
      },
      {
        title: 'District Comparison',
        description:
          'Compare your district to a neighboring district or one from a different state. What differences do you notice?',
        duration: '20 minutes',
        type: 'exploration',
        civiqFeature: 'District Comparison',
        civiqPath: '/districts',
      },
      {
        title: 'Constituent Priorities',
        description:
          'Based on the data, predict what issues might be most important to people in your district.',
        duration: '15 minutes',
        type: 'discussion',
      },
    ],
    discussionQuestions: [
      {
        question: 'How might a rural district have different needs than an urban district?',
      },
      {
        question:
          'How should representatives balance the needs of different groups in their district?',
      },
    ],
    assessment:
      "Students can describe key characteristics of their district and explain how these might influence their representative's priorities.",
    printableId: 'mid-district-demographics-worksheet',
  },
  {
    id: 'mid-state-vs-federal',
    title: 'State vs. Federal Government',
    gradeLevel: 'middle',
    topic: 'state-government',
    duration: '50 minutes',
    overview:
      'Students compare state and federal government structures, understanding federalism and the division of powers.',
    objectives: [
      {
        id: 'obj-1',
        text: 'Compare the structure of state and federal governments',
        standard: 'D2.Civ.4.6-8',
      },
      {
        id: 'obj-2',
        text: 'Explain the concept of federalism',
      },
      {
        id: 'obj-3',
        text: 'Identify which level of government handles different issues',
      },
    ],
    vocabulary: [
      'Federalism',
      'Reserved powers',
      'Concurrent powers',
      'State legislature',
      'Governor',
      'Constitution',
    ],
    activities: [
      {
        title: 'State Legislature Exploration',
        description:
          'Use CIV.IQ to explore your state legislature. How many chambers does it have? How many legislators?',
        duration: '15 minutes',
        type: 'exploration',
        civiqFeature: 'State Legislature',
        civiqPath: '/state-legislature',
      },
      {
        title: 'Power Sorting',
        description:
          'Sort different government responsibilities (education, national defense, roads, etc.) into state, federal, or shared powers.',
        duration: '15 minutes',
        type: 'worksheet',
      },
      {
        title: 'Comparison Chart',
        description:
          'Create a chart comparing your state legislature to Congress (number of members, term lengths, leadership).',
        duration: '20 minutes',
        type: 'project',
      },
    ],
    discussionQuestions: [
      {
        question: 'Why do we have both state and federal governments?',
      },
      {
        question:
          'What are the advantages of letting states make their own decisions on some issues?',
      },
    ],
    assessment:
      'Students can explain the basic concept of federalism and correctly categorize powers as state, federal, or shared.',
    printableId: 'mid-state-federal-worksheet',
  },
];

// ============================================================================
// HIGH SCHOOL LESSONS (9-12)
// ============================================================================

const HIGH_SCHOOL_LESSONS: Lesson[] = [
  {
    id: 'high-campaign-finance',
    title: 'Following the Money: Campaign Finance Analysis',
    gradeLevel: 'high',
    topic: 'campaign-finance',
    duration: '75 minutes',
    overview:
      'Students analyze real campaign finance data to understand how elections are funded and the potential influence of money in politics.',
    objectives: [
      {
        id: 'obj-1',
        text: 'Interpret campaign finance data including contributions and expenditures',
        standard: 'D2.Civ.13.9-12',
      },
      {
        id: 'obj-2',
        text: 'Analyze the sources of campaign funding for specific candidates',
      },
      {
        id: 'obj-3',
        text: 'Evaluate arguments about the role of money in elections',
      },
    ],
    vocabulary: [
      'PAC',
      'Super PAC',
      'Individual contribution',
      'FEC',
      'Disclosure',
      'Dark money',
      'Bundling',
      'Small dollar donor',
    ],
    activities: [
      {
        title: 'Finance Profile Analysis',
        description:
          'Use CIV.IQ to examine the campaign finance data for your representative. Analyze: Total raised, top contributors, funding sources breakdown.',
        duration: '25 minutes',
        type: 'exploration',
        civiqFeature: 'Campaign Finance',
        civiqPath: '/representatives',
      },
      {
        title: 'Comparative Analysis',
        description:
          'Compare campaign finance data between two representatives - one from each party, or incumbents vs. challengers. What patterns emerge?',
        duration: '25 minutes',
        type: 'exploration',
        civiqFeature: 'Compare Representatives',
        civiqPath: '/compare',
      },
      {
        title: 'Policy Position Paper',
        description:
          'Write a position paper on campaign finance reform using evidence from your research.',
        duration: '25 minutes',
        type: 'project',
      },
    ],
    discussionQuestions: [
      {
        question: 'Does campaign finance data reveal potential conflicts of interest?',
        followUp: 'How can voters use this information?',
      },
      {
        question: 'Should there be limits on campaign contributions? Why or why not?',
      },
      {
        question: 'How does money in politics affect equal representation?',
      },
    ],
    assessment:
      'Students can accurately analyze campaign finance data and write a well-supported argument about campaign finance policy.',
    extensions: [
      'Research a specific PAC and analyze its contribution patterns',
      'Compare campaign finance laws in different countries',
    ],
    printableId: 'high-campaign-finance-worksheet',
  },
  {
    id: 'high-party-voting-analysis',
    title: 'Party Alignment and Voting Patterns',
    gradeLevel: 'high',
    topic: 'representatives',
    duration: '70 minutes',
    overview:
      'Students analyze voting patterns to understand party alignment, bipartisanship, and ideological positioning of representatives.',
    objectives: [
      {
        id: 'obj-1',
        text: 'Calculate and interpret party alignment scores',
        standard: 'D2.Civ.10.9-12',
      },
      {
        id: 'obj-2',
        text: 'Identify factors that influence voting patterns',
      },
      {
        id: 'obj-3',
        text: 'Evaluate the impact of partisanship on governance',
      },
    ],
    vocabulary: [
      'Party alignment',
      'Bipartisanship',
      'Ideological spectrum',
      'Moderate',
      'Caucus',
      'Whip',
      'Party discipline',
    ],
    activities: [
      {
        title: 'Alignment Score Analysis',
        description:
          'Use CIV.IQ to find party alignment data for multiple representatives. Create a spectrum showing where each falls.',
        duration: '25 minutes',
        type: 'exploration',
        civiqFeature: 'Party Alignment',
        civiqPath: '/representatives',
      },
      {
        title: 'Cross-Party Vote Investigation',
        description:
          'Find bills that received significant bipartisan support. Analyze what made these bills different from party-line votes.',
        duration: '20 minutes',
        type: 'exploration',
        civiqFeature: 'Voting Records',
        civiqPath: '/legislation',
      },
      {
        title: 'Representation Analysis Essay',
        description:
          "Write an analysis of whether your representative's voting record reflects the values of your district.",
        duration: '25 minutes',
        type: 'project',
      },
    ],
    discussionQuestions: [
      {
        question: 'When should representatives prioritize party loyalty vs. constituent interests?',
      },
      {
        question: 'Is increasing partisanship a problem for democracy? Why or why not?',
      },
      {
        question: 'What incentives do representatives have to work across party lines?',
      },
    ],
    assessment:
      'Students can accurately interpret party alignment data and write a nuanced analysis of voting patterns.',
    printableId: 'high-party-voting-worksheet',
  },
  {
    id: 'high-representative-comparison',
    title: 'Comprehensive Representative Comparison',
    gradeLevel: 'high',
    topic: 'representatives',
    duration: '80 minutes',
    overview:
      'Students conduct in-depth comparative analysis of representatives using multiple data points including votes, bills, and funding.',
    objectives: [
      {
        id: 'obj-1',
        text: 'Synthesize multiple data sources to evaluate representative performance',
        standard: 'D2.Civ.14.9-12',
      },
      {
        id: 'obj-2',
        text: 'Develop criteria for evaluating elected officials',
      },
      {
        id: 'obj-3',
        text: 'Present evidence-based conclusions about representative effectiveness',
      },
    ],
    vocabulary: [
      'Legislative effectiveness',
      'Constituent services',
      'Accountability',
      'Transparency',
      'Metrics',
    ],
    activities: [
      {
        title: 'Multi-Factor Comparison',
        description:
          "Use CIV.IQ's comparison tool to analyze two representatives across all available metrics: voting records, sponsored bills, committee assignments, and campaign finance.",
        duration: '30 minutes',
        type: 'exploration',
        civiqFeature: 'Compare Representatives',
        civiqPath: '/compare',
      },
      {
        title: 'Evaluation Framework Development',
        description:
          'In groups, develop a framework for evaluating representatives. What factors matter most? How should they be weighted?',
        duration: '25 minutes',
        type: 'discussion',
      },
      {
        title: 'Research Presentation',
        description:
          'Prepare a presentation comparing two representatives using your evaluation framework.',
        duration: '25 minutes',
        type: 'project',
      },
    ],
    discussionQuestions: [
      {
        question:
          'What makes an effective representative? Is it passing bills, serving constituents, or something else?',
      },
      {
        question: 'How can voters make informed decisions when there is so much data to consider?',
      },
      {
        question: 'Should representatives be evaluated on their intentions or their results?',
      },
    ],
    assessment:
      'Students can conduct comprehensive research using multiple data sources and present evidence-based conclusions.',
    extensions: [
      'Create an interactive dashboard comparing representatives on custom criteria',
      'Interview local civic leaders about what they look for in representatives',
    ],
    printableId: 'high-representative-comparison-worksheet',
  },
  {
    id: 'high-legislative-analysis',
    title: 'In-Depth Legislative Analysis',
    gradeLevel: 'high',
    topic: 'legislation',
    duration: '90 minutes',
    overview:
      'Students conduct thorough analysis of significant legislation, including stakeholder interests, amendments, and potential impacts.',
    objectives: [
      {
        id: 'obj-1',
        text: 'Analyze the content and potential impact of legislation',
        standard: 'D2.Civ.11.9-12',
      },
      {
        id: 'obj-2',
        text: 'Identify stakeholders and their positions on legislation',
      },
      {
        id: 'obj-3',
        text: 'Trace the evolution of a bill through amendments and negotiations',
      },
    ],
    vocabulary: [
      'Legislative intent',
      'Stakeholder',
      'Amendment',
      'Fiscal impact',
      'Regulatory impact',
      'Implementation',
    ],
    activities: [
      {
        title: 'Bill Deep Dive',
        description:
          'Select a significant piece of legislation from CIV.IQ. Analyze its sponsors, cosponsors, committee journey, and current status.',
        duration: '30 minutes',
        type: 'exploration',
        civiqFeature: 'Bill Details',
        civiqPath: '/legislation',
      },
      {
        title: 'Stakeholder Mapping',
        description:
          'Identify all stakeholders affected by the bill. Map their positions (support, oppose, neutral) and their influence.',
        duration: '30 minutes',
        type: 'project',
      },
      {
        title: 'Mock Amendment Process',
        description: 'Propose amendments to the bill and debate them in a mock committee session.',
        duration: '30 minutes',
        type: 'discussion',
      },
    ],
    discussionQuestions: [
      {
        question: 'How do competing interests shape the final version of legislation?',
      },
      {
        question: 'What is the role of compromise in the legislative process?',
      },
      {
        question: 'How can citizens influence legislation before it becomes law?',
      },
    ],
    assessment:
      'Students can produce a comprehensive legislative analysis including stakeholder mapping and impact assessment.',
    printableId: 'high-legislative-analysis-worksheet',
  },
  {
    id: 'high-civic-participation',
    title: 'Effective Civic Participation',
    gradeLevel: 'high',
    topic: 'civic-participation',
    duration: '65 minutes',
    overview:
      'Students develop practical skills for civic engagement, learning how to effectively communicate with representatives and participate in the democratic process.',
    objectives: [
      {
        id: 'obj-1',
        text: 'Identify multiple methods of civic participation',
        standard: 'D2.Civ.2.9-12',
      },
      {
        id: 'obj-2',
        text: 'Develop skills for effective advocacy',
      },
      {
        id: 'obj-3',
        text: 'Create an action plan for civic engagement',
      },
    ],
    vocabulary: [
      'Advocacy',
      'Constituent',
      'Public comment',
      'Testimony',
      'Petition',
      'Town hall',
      'Grassroots',
    ],
    activities: [
      {
        title: 'Issue Research',
        description:
          'Use CIV.IQ to research how your representatives have voted on an issue you care about. Find relevant bills and votes.',
        duration: '20 minutes',
        type: 'exploration',
        civiqFeature: 'Voting Records',
        civiqPath: '/representatives',
      },
      {
        title: 'Advocacy Letter Writing',
        description:
          'Draft a professional letter to your representative about a policy issue, using specific data from your research.',
        duration: '25 minutes',
        type: 'project',
      },
      {
        title: 'Civic Action Plan',
        description:
          'Create a personal civic action plan identifying 3-5 ways you can participate in democracy over the next year.',
        duration: '20 minutes',
        type: 'project',
      },
    ],
    discussionQuestions: [
      {
        question: 'What forms of civic participation are most effective? Why?',
      },
      {
        question: 'How has technology changed how citizens can engage with government?',
      },
      {
        question: 'What responsibilities do citizens have in a democracy?',
      },
    ],
    assessment:
      'Students can demonstrate knowledge of multiple participation methods and produce an effective advocacy letter.',
    extensions: [
      'Actually send your letter to your representative',
      'Organize a voter registration drive at school',
      'Attend a local government meeting and report back',
    ],
    printableId: 'high-civic-participation-worksheet',
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
      lesson.vocabulary.some(v => v.toLowerCase().includes(lowerQuery))
  );
}

// Teacher resources data
export interface TeacherResource {
  id: string;
  title: string;
  description: string;
  type: 'guide' | 'standards' | 'worksheet' | 'rubric';
  gradeLevel: GradeLevel | 'all';
  downloadPath?: string;
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
    id: 'elem-assessment-rubric',
    title: 'Elementary Assessment Rubric',
    description:
      'A rubric for assessing elementary student understanding of civics concepts taught through CIV.IQ.',
    type: 'rubric',
    gradeLevel: 'elementary',
  },
  {
    id: 'mid-assessment-rubric',
    title: 'Middle School Assessment Rubric',
    description:
      'A rubric for assessing middle school student research and analysis skills using CIV.IQ data.',
    type: 'rubric',
    gradeLevel: 'middle',
  },
  {
    id: 'high-assessment-rubric',
    title: 'High School Assessment Rubric',
    description:
      'A rubric for assessing high school student critical analysis and synthesis using CIV.IQ.',
    type: 'rubric',
    gradeLevel: 'high',
  },
];
