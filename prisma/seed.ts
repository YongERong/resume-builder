import { PrismaClient, ExperienceType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create a demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
    },
  })

  console.log('Created user:', user)

  // Create user profile
  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      name: 'John TAN',
      mobile: '9123 4567',
      email: 'John_Tan@gmail.com',
      linkedin: '',
      portfolio: '',
    },
  })

  console.log('Created user profile')

  // Sample experiences from demo
  const experiences = [
    {
      userId: user.id,
      type: ExperienceType.internship,
      title: 'Operations Processes Department, Intern',
      company: 'Total Utility Pte Ltd',
      dateRange: 'Jan 2023 - Jun 2023',
      bullets: [
        'Worked closely with 3 contracted engineers from YY Technologies to improve and optimise operations of the Biogas Engine and Thermal Hydrolysis Plant by 20%',
        'Facilitated in the maintenance and operation of 3 Biogas Engines and 1 Thermal Hydrolysis Plant',
        'Collaborated on process optimization initiatives resulting in improved operational efficiency',
      ],
      tags: ['operations', 'engineering', 'optimization', 'teamwork', 'process-improvement'],
      keywords: ['operations', 'engineering', 'biogas', 'thermal', 'optimization', 'maintenance'],
    },
    {
      userId: user.id,
      type: ExperienceType.work,
      title: 'Sales & Operations Assistant',
      company: 'The ABC Bank Limited',
      dateRange: 'June 2023 - Aug 2023',
      bullets: [
        'Implemented checking criteria for predicting user behaviour to automate checking process, resulting in a decrease of 5% in fraudulent transactions in Thailand market',
        'Analysed regional sales accounts across five countries in Asia Pacific and translated data gathered into insights using data visualisation tool Tableau',
        'Identified key growth areas and presented insights to Sales Director to craft 3 new countries\' market entry strategies',
      ],
      tags: ['sales', 'data-analysis', 'automation', 'fraud-detection', 'tableau', 'market-strategy'],
      keywords: ['sales', 'operations', 'data analysis', 'automation', 'fraud detection', 'tableau', 'asia pacific'],
    },
    {
      userId: user.id,
      type: ExperienceType.education,
      title: 'Bachelor of Engineering (Mechanical Engineering)',
      company: 'Nanyang Technological University, Singapore',
      dateRange: 'Aug 2020 - May 2024',
      bullets: [
        'Dean\'s List for Semester 1, Academic Year 2021/2022',
        'Expected Honours (Distinction), Current CGPA: 4.30/5.00',
        'Second Major in Business',
      ],
      tags: ['mechanical-engineering', 'business', 'academic-excellence', 'honors'],
      keywords: ['engineering', 'mechanical', 'business', 'honors', 'distinction', 'gpa'],
    },
    {
      userId: user.id,
      type: ExperienceType.exchange,
      title: 'Student Exchange Programme',
      company: 'University of Copenhagen',
      dateRange: 'Sep 2023 - Dec 2023',
      bullets: [
        'Gained new perspectives and insights into European Union economic issues through discussions in class',
        'Developed cross-cultural communication skills in international academic environment',
        'Completed coursework in European economics and policy analysis',
      ],
      tags: ['international', 'economics', 'cross-cultural', 'exchange'],
      keywords: ['exchange', 'international', 'europe', 'economics', 'cross-cultural'],
    },
    {
      userId: user.id,
      type: ExperienceType.academic_project,
      title: 'Final Year Project – Design a system for repositioning of bikes in a bike-sharing system',
      company: 'Nanyang Technological University, Singapore',
      dateRange: 'Aug 2023 - May 2024',
      bullets: [
        'Developed a profit-maximisation system to allocate bikes efficiently for bike operators',
        'Optimised the total number of bikes per station and attained an increase of 15% profit margin',
        'Applied machine learning algorithms for demand prediction and resource optimization',
      ],
      tags: ['machine-learning', 'optimization', 'algorithm-design', 'profit-maximization', 'data-science'],
      keywords: ['bike sharing', 'optimization', 'algorithm', 'machine learning', 'profit', 'system design'],
    },
    {
      userId: user.id,
      type: ExperienceType.leadership,
      title: 'Vice President',
      company: 'Engineering Club',
      dateRange: 'Jan 2022 – Jun 2022',
      bullets: [
        'Managed three major fundraising events, secured a total of $10,000 worth of funds through creating awareness of events on social media and reaching out to halls and the student community in NTU',
        'Oversaw publicity efforts and developed outreach strategies to deliver consistent message across various platforms reaching a breakthrough 20% increase of new club members',
        'Led a team of 15 committee members and coordinated cross-functional initiatives',
      ],
      tags: ['leadership', 'fundraising', 'social-media', 'marketing', 'team-management', 'event-planning'],
      keywords: ['leadership', 'vice president', 'fundraising', 'social media', 'marketing', 'team management'],
    },
    {
      userId: user.id,
      type: ExperienceType.technical_skills,
      title: 'Digital Skills',
      company: null,
      dateRange: null,
      bullets: ['AutoCAD', 'MATLAB', 'Python', 'Excel VBA', 'Tableau', 'Photoshop', 'Microsoft Office'],
      tags: ['programming', 'data-analysis', 'design', 'automation', 'visualization'],
      keywords: ['python', 'matlab', 'tableau', 'autocad', 'excel', 'vba', 'data visualization'],
    },
    {
      userId: user.id,
      type: ExperienceType.language_skills,
      title: 'Languages',
      company: null,
      dateRange: null,
      bullets: ['Proficient in English and Chinese', 'conversant in Danish'],
      tags: ['multilingual', 'communication', 'international'],
      keywords: ['english', 'chinese', 'danish', 'multilingual', 'communication'],
    },
    {
      userId: user.id,
      type: ExperienceType.interests,
      title: 'Hobbies & Interests',
      company: null,
      dateRange: null,
      bullets: ['Travelling', 'Playing musical instruments (Guitar and Piano)', 'Sports (Basketball)'],
      tags: ['music', 'sports', 'travel', 'personal-interests'],
      keywords: ['travel', 'music', 'guitar', 'piano', 'basketball', 'sports'],
    },
  ]

  // Create all experiences
  for (const exp of experiences) {
    await prisma.experience.create({
      data: exp,
    })
  }

  console.log('Created', experiences.length, 'sample experiences')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

