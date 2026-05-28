require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const School = require('../models/School');
const Scholarship = require('../models/Scholarship');
const { Admin } = require('../models/index');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing
  await Promise.all([School.deleteMany(), Scholarship.deleteMany()]);

  // Create admin
  const existingAdmin = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
  if (!existingAdmin) {
    await Admin.create({
      firstName: 'Platform',
      lastName: 'Admin',
      email: process.env.ADMIN_EMAIL || 'admin@scholarsgate.com',
      password: process.env.ADMIN_PASSWORD || 'Admin@123456',
      role: 'platform_admin',
    });
    console.log('Admin created');
  }

  const schools = await School.insertMany([
    {
      name: 'Phillips Exeter Academy',
      type: 'boarding',
      category: 'private',
      location: { city: 'Exeter', state: 'New Hampshire', country: 'USA' },
      founded: 1781,
      overview: 'One of the most prestigious boarding schools in the United States, Phillips Exeter Academy is known for its rigorous academics and the Harkness method of education.',
      tuition: { annual: 60000, boarding: 18000, currency: 'USD' },
      stats: { totalStudents: 1080, internationalStudents: 230, studentTeacherRatio: '5:1', avgClassSize: 12, collegeAcceptanceRate: 99, satAverage: 1480 },
      programs: ['STEM', 'Humanities', 'Arts', 'Athletic Excellence', 'Leadership'],
      facilities: ['Squash Courts', 'Ice Rink', 'Olympic Pool', 'Theater', 'Art Studios', '900-seat Library'],
      images: { logo: '', hero: '' },
      accreditation: ['NEASC'],
      featured: true,
    },
    {
      name: 'Andover (Phillips Academy)',
      type: 'boarding',
      category: 'private',
      location: { city: 'Andover', state: 'Massachusetts', country: 'USA' },
      founded: 1778,
      overview: 'Phillips Academy Andover is a leading independent boarding school offering a transformative education to talented students from around the world.',
      tuition: { annual: 62000, boarding: 19000, currency: 'USD' },
      stats: { totalStudents: 1150, internationalStudents: 280, studentTeacherRatio: '4:1', avgClassSize: 13, collegeAcceptanceRate: 99, satAverage: 1490 },
      programs: ['STEM', 'Visual Arts', 'Performing Arts', 'Athletics', 'Community Service'],
      facilities: ['Peabody Museum', 'Addison Gallery', 'Athletic Complex', 'Science Center'],
      images: { logo: '', hero: '' },
      accreditation: ['NEASC'],
      featured: true,
    },
    {
      name: 'The Lawrenceville School',
      type: 'boarding',
      category: 'private',
      location: { city: 'Lawrenceville', state: 'New Jersey', country: 'USA' },
      founded: 1810,
      overview: 'The Lawrenceville School is a world-class boarding school known for its house system, passionate community, and academic excellence.',
      tuition: { annual: 58000, boarding: 17000, currency: 'USD' },
      stats: { totalStudents: 830, internationalStudents: 190, studentTeacherRatio: '6:1', collegeAcceptanceRate: 98, satAverage: 1460 },
      programs: ['Math & Science', 'Humanities', 'Arts', 'Global Studies'],
      facilities: ['House System', 'Chapel', 'Athletic Fields', 'Innovation Lab'],
      images: { logo: '', hero: '' },
      accreditation: ['MSA'],
      featured: true,
    },
  ]);

  const scholarships = [
    {
      school: schools[0]._id,
      name: 'Global Excellence Full Scholarship',
      type: 'full',
      coveragePercentage: 100,
      annualValue: 78000,
      totalValue: 312000,
      duration: { years: 4, renewable: true, renewalCriteria: 'Maintain 3.5+ GPA' },
      benefits: {
        fullTuition: true, boarding: true, meals: true, books: true,
        healthInsurance: true, satPrep: true, mentorship: true, collegeGuidance: true,
        leadershipPrograms: true, stemMentorship: true, academicCounseling: true,
      },
      remainingTuition: 0,
      enrollmentDeposit: 500,
      eligibility: { grades: ['9', '10'], minGpa: 3.7, nationalities: [], ageMin: 13, ageMax: 16 },
      applicationDeadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      description: 'The most prestigious scholarship offered by Phillips Exeter Academy, covering 100% of all costs for exceptional international students.',
      highlights: ['Fully funded', 'No remaining costs', 'Elite mentorship network', '4-year commitment'],
      slotsTotal: 15,
      featured: true,
    },
    {
      school: schools[1]._id,
      name: 'Andover International Merit Award',
      type: 'merit',
      coveragePercentage: 75,
      annualValue: 60000,
      totalValue: 240000,
      duration: { years: 4, renewable: true, renewalCriteria: 'Maintain 3.4+ GPA' },
      benefits: {
        tuition: true, boarding: true, meals: true, satPrep: true,
        mentorship: true, collegeGuidance: true, academicCounseling: true,
      },
      remainingTuition: 21000,
      enrollmentDeposit: 500,
      eligibility: { grades: ['9', '10', '11'], minGpa: 3.5, ageMin: 13, ageMax: 17 },
      applicationDeadline: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
      description: 'A premier merit-based scholarship for outstanding international students demonstrating academic excellence and leadership potential.',
      highlights: ['75% coverage', 'Full boarding', 'SAT prep included', 'Alumni network access'],
      slotsTotal: 25,
      featured: true,
    },
    {
      school: schools[2]._id,
      name: 'Lawrenceville STEM Excellence Scholarship',
      type: 'stem',
      coveragePercentage: 80,
      annualValue: 60000,
      totalValue: 240000,
      duration: { years: 4, renewable: true },
      benefits: {
        tuition: true, boarding: true, meals: true, stemMentorship: true,
        mentorship: true, academicCounseling: true, internship: true, satPrep: true,
      },
      remainingTuition: 15000,
      enrollmentDeposit: 500,
      eligibility: { grades: ['9', '10'], minGpa: 3.6, ageMin: 13, ageMax: 16 },
      applicationDeadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      description: 'Designed for exceptional STEM-focused students from around the world who have demonstrated outstanding potential in mathematics and sciences.',
      highlights: ['80% coverage', 'STEM research internship', 'Industry mentors', 'Full boarding'],
      slotsTotal: 20,
      featured: true,
    },
  ];

  await Scholarship.insertMany(scholarships);
  console.log(`Seeded ${schools.length} schools and ${scholarships.length} scholarships`);
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
