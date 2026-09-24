import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Niche from '../models/Niche.js';
import Lead from '../models/Lead.js';
import Appointment from '../models/Appointment.js';

const nichesData = [
  { name: 'Restaurants', icon: 'utensils', color: '#f59e0b', order: 1 },
  { name: 'Real Estate', icon: 'building', color: '#3b82f6', order: 2 },
  { name: 'SaaS Companies', icon: 'laptop', color: '#8b5cf6', order: 3 },
  { name: 'Fitness & Gyms', icon: 'activity', color: '#10b981', order: 4 },
  { name: 'E-Commerce Brands', icon: 'shopping-bag', color: '#ec4899', order: 5 },
  { name: 'Solar & Roofing', icon: 'sun', color: '#f97316', order: 6 },
];

const sampleLeads = [
  // Restaurants
  { businessName: 'The Rustic Olive Bistro', personName: 'Marco Bellini', contact: '+1 (555) 234-5678', email: 'marco@rusticolive.com', website: 'rusticolive.com', location: 'Austin, TX', notes: 'Interested in catering automation, called back twice.', status: 'Appointment' },
  { businessName: 'Golden Dragon Kitchen', personName: 'David Chen', contact: '+1 (555) 345-6789', email: 'dchen@goldendragon.com', website: 'goldendragon.com', location: 'San Francisco, CA', notes: 'Busy during lunch hours, call after 3 PM.', status: 'Callback' },
  { businessName: 'Smokehouse BBQ Pit', personName: 'Hank Miller', contact: '+1 (555) 456-7890', email: 'hank@smokehousepit.com', website: 'smokehousepit.com', location: 'Dallas, TX', notes: 'Owner requested contract proposal by email.', status: 'Closed' },
  { businessName: 'Artisan Bakery & Cafe', personName: 'Sophie Laurent', contact: '+1 (555) 567-8901', email: 'sophie@artisanbakes.com', website: 'artisanbakes.com', location: 'Chicago, IL', notes: 'Not interested at this stage due to budget constraints.', status: 'Not Interested' },
  { businessName: 'Harbor Seafood Grill', personName: 'Captain James', contact: '+1 (555) 678-9012', email: 'james@harborgrill.com', website: 'harborgrill.com', location: 'Seattle, WA', notes: 'No answer on initial cold outreach.', status: 'No Answer' },
  { businessName: 'Noche Tapas Bar', personName: 'Elena Ramos', contact: '+1 (555) 789-0123', email: 'elena@nochetapas.com', website: 'nochetapas.com', location: 'Miami, FL', notes: 'Scheduled demo for next Monday.', status: 'Appointment' },
  { businessName: 'Urban Greens Vegan Bar', personName: 'Liam Carter', contact: '+1 (555) 890-1234', email: 'liam@urbangreens.com', website: 'urbangreens.com', location: 'Portland, OR', notes: 'New lead from directory research.', status: 'New Lead' },
  { businessName: 'Pizzaiolo Verace', personName: 'Antonio Rossi', contact: '+1 (555) 901-2345', email: 'antonio@pizzaiolo.com', website: 'pizzaiolo.com', location: 'New York, NY', notes: 'Do not contact, already has proprietary POS system.', status: 'DNC' },
  { businessName: 'Copper Kettle Diner', personName: 'Brenda Hayes', contact: '+1 (555) 012-3456', email: 'brenda@copperkettle.com', website: 'copperkettle.com', location: 'Nashville, TN', notes: 'Needs follow up regarding seasonal menu launch.', status: 'Follow Up' },
  { businessName: 'Zen Garden Sushi', personName: 'Kenji Takahashi', contact: '+1 (555) 123-4567', email: 'kenji@zengarden.com', website: 'zengardensushi.com', location: 'Denver, CO', notes: 'Signed 6-month tracking agreement.', status: 'Closed' },

  // Real Estate
  { businessName: 'Apex Commercial Realty', personName: 'Victoria Sterling', contact: '+1 (555) 234-9988', email: 'victoria@apexcommercial.com', website: 'apexcommercial.com', location: 'New York, NY', notes: 'High value client, wants agency reporting package.', status: 'Closed' },
  { businessName: 'BlueSky Residential', personName: 'Robert Vance', contact: '+1 (555) 345-8877', email: 'robert@blueskyres.com', website: 'blueskyres.com', location: 'Phoenix, AZ', notes: 'Follow up after board meeting.', status: 'Follow Up' },
  { businessName: 'Coastal Haven Properties', personName: 'Chloe Bennett', contact: '+1 (555) 456-7766', email: 'chloe@coastalhaven.com', website: 'coastalhaven.com', location: 'San Diego, CA', notes: 'Requested demo on lead capture widgets.', status: 'Appointment' },
  { businessName: 'Metro Urban Housing', personName: 'Marcus Wright', contact: '+1 (555) 567-6655', email: 'marcus@metrourban.com', website: 'metrourban.com', location: 'Atlanta, GA', notes: 'Voicemail left, callback scheduled for tomorrow.', status: 'Callback' },
  { businessName: 'Summit Peak Estates', personName: 'Eleanor Vance', contact: '+1 (555) 678-5544', email: 'eleanor@summitpeak.com', website: 'summitpeak.com', location: 'Salt Lake City, UT', notes: 'Not interested right now, reassessing in Q4.', status: 'Not Interested' },
  { businessName: 'Lakeside Living Realty', personName: 'Thomas Green', contact: '+1 (555) 789-4433', email: 'thomas@lakesiderealty.com', website: 'lakesiderealty.com', location: 'Minneapolis, MN', notes: 'No answer on second attempt.', status: 'No Answer' },
  { businessName: 'Pinnacle Property Management', personName: 'Sarah Jenkins', contact: '+1 (555) 890-3322', email: 'sarah@pinnaclepm.com', website: 'pinnaclepm.com', location: 'Charlotte, NC', notes: 'Newly imported lead.', status: 'New Lead' },
  { businessName: 'Horizon Real Estate Group', personName: 'Kevin Patel', contact: '+1 (555) 901-2211', email: 'kevin@horizonreg.com', website: 'horizonreg.com', location: 'Houston, TX', notes: 'Contract finalized and downpayment received.', status: 'Closed' },

  // SaaS
  { businessName: 'CloudPulse Analytics', personName: 'Alex Mercer', contact: '+1 (555) 111-2233', email: 'alex@cloudpulse.io', website: 'cloudpulse.io', location: 'San Jose, CA', notes: 'Demo went great, waiting for CFO sign-off.', status: 'Appointment' },
  { businessName: 'SyncFlow Systems', personName: 'Nadia Petrov', contact: '+1 (555) 222-3344', email: 'nadia@syncflow.dev', website: 'syncflow.dev', location: 'Boston, MA', notes: 'Annual subscription activated.', status: 'Closed' },
  { businessName: 'DataWeave AI', personName: 'Ethan Cole', contact: '+1 (555) 333-4455', email: 'ethan@dataweave.ai', website: 'dataweave.ai', location: 'Seattle, WA', notes: 'Call rescheduled to Friday.', status: 'Callback' },
  { businessName: 'MetricScale HQ', personName: 'Jessica Wu', contact: '+1 (555) 444-5566', email: 'jessica@metricscale.co', website: 'metricscale.co', location: 'Toronto, ON', notes: 'Evaluating alternatives against competitors.', status: 'Follow Up' },
  { businessName: 'TaskForge Enterprise', personName: 'Daniel Foster', contact: '+1 (555) 555-6677', email: 'daniel@taskforge.app', website: 'taskforge.app', location: 'Austin, TX', notes: 'No response after 3 emails.', status: 'No Answer' },
  { businessName: 'OmniDesk CRM', personName: 'Rachel Adams', contact: '+1 (555) 666-7788', email: 'rachel@omnidesk.io', website: 'omnidesk.io', location: 'San Francisco, CA', notes: 'Do not contact, enterprise competitor.', status: 'DNC' },
  { businessName: 'DevStack Tools', personName: 'Lucas Meyer', contact: '+1 (555) 777-8899', email: 'lucas@devstack.tools', website: 'devstack.tools', location: 'Berlin, DE', notes: 'Signed contract for custom CRM pipeline.', status: 'Closed' },
  { businessName: 'VectorScale Cloud', personName: 'Olivia Taylor', contact: '+1 (555) 888-9900', email: 'olivia@vectorscale.net', website: 'vectorscale.net', location: 'Boulder, CO', notes: 'Fresh inbound lead.', status: 'New Lead' },

  // Fitness
  { businessName: 'IronForge Athletic Club', personName: 'Brock Tanner', contact: '+1 (555) 999-1122', email: 'brock@ironforge.fit', website: 'ironforge.fit', location: 'Columbus, OH', notes: 'Signed 12-month retainer.', status: 'Closed' },
  { businessName: 'Pulse Cardio & HIIT', personName: 'Maya Lin', contact: '+1 (555) 888-2233', email: 'maya@pulsecardio.com', website: 'pulsecardio.com', location: 'Orlando, FL', notes: 'Demo scheduled with owner and manager.', status: 'Appointment' },
  { businessName: 'Zenith Yoga Sanctuary', personName: 'Clara Oswald', contact: '+1 (555) 777-3344', email: 'clara@zenithyoga.com', website: 'zenithyoga.com', location: 'Boulder, CO', notes: 'Interested in client scheduling integration.', status: 'Follow Up' },
  { businessName: 'Peak Performance CrossFit', personName: 'Tyler Ward', contact: '+1 (555) 666-4455', email: 'tyler@peakcrossfit.com', website: 'peakcrossfit.com', location: 'Scottsdale, AZ', notes: 'Call back next Tuesday morning.', status: 'Callback' },
  { businessName: 'CorePilates Studio', personName: 'Hannah Lee', contact: '+1 (555) 555-5566', email: 'hannah@corepilates.com', website: 'corepilates.com', location: 'Los Angeles, CA', notes: 'No answer on first outreach.', status: 'No Answer' },
  { businessName: 'Titan Strength Gym', personName: 'Damon Vance', contact: '+1 (555) 444-6677', email: 'damon@titangym.com', website: 'titangym.com', location: 'Las Vegas, NV', notes: 'Requested removal from list.', status: 'DNC' },
  { businessName: 'Elevate Boxing Lab', personName: 'Carlos Vega', contact: '+1 (555) 333-7788', email: 'carlos@elevateboxing.com', website: 'elevateboxing.com', location: 'Philadelphia, PA', notes: 'New lead from local business chamber.', status: 'New Lead' },

  // E-Commerce
  { businessName: 'Nordic Wool Apparel', personName: 'Astrid Lind', contact: '+1 (555) 121-2323', email: 'astrid@nordicwool.com', website: 'nordicwool.com', location: 'Minneapolis, MN', notes: 'High order volume store, onboarding next week.', status: 'Closed' },
  { businessName: 'Lumina Home Decor', personName: 'Julian Croft', contact: '+1 (555) 232-3434', email: 'julian@luminahome.com', website: 'luminahome.com', location: 'Nashville, TN', notes: 'Demo presentation booked.', status: 'Appointment' },
  { businessName: 'PureBotanics Skincare', personName: 'Zoe Morales', contact: '+1 (555) 343-4545', email: 'zoe@purebotanics.com', website: 'purebotanics.com', location: 'Santa Monica, CA', notes: 'Needs case study on DTC conversion.', status: 'Follow Up' },
  { businessName: 'UrbanGear Tech Supply', personName: 'Leo Kramer', contact: '+1 (555) 454-5656', email: 'leo@urbangeartech.com', website: 'urbangeartech.com', location: 'Seattle, WA', notes: 'Requested callback after warehouse inventory.', status: 'Callback' },
  { businessName: 'ArtisanRoast Coffee Co.', personName: 'Miles Davis', contact: '+1 (555) 565-6767', email: 'miles@artisanroast.com', website: 'artisanroast.com', location: 'Portland, OR', notes: 'Not interested at this time.', status: 'Not Interested' },
  { businessName: 'Velvet & Silk Botanicals', personName: 'Camilla Grey', contact: '+1 (555) 676-7878', email: 'camilla@velvetsilk.com', website: 'velvetsilk.com', location: 'Charleston, SC', notes: 'New lead via ecom scrape.', status: 'New Lead' },

  // Solar & Roofing
  { businessName: 'Solaria Energy Solutions', personName: 'Garrett Ford', contact: '+1 (555) 787-8989', email: 'garrett@solariaenergy.com', website: 'solariaenergy.com', location: 'Phoenix, AZ', notes: 'Signed contract for regional installer tracking.', status: 'Closed' },
  { businessName: 'Apex Roofing & Solar', personName: 'Travis Stone', contact: '+1 (555) 898-9090', email: 'travis@apexroofsolar.com', website: 'apexroofsolar.com', location: 'San Antonio, TX', notes: 'Strategy session booked for Thursday.', status: 'Appointment' },
  { businessName: 'BrightSun Residential', personName: 'Melanie Scott', contact: '+1 (555) 909-0101', email: 'melanie@brightsunres.com', website: 'brightsunres.com', location: 'Sacramento, CA', notes: 'Requested follow up after license renewal.', status: 'Follow Up' },
  { businessName: 'Vanguard Solar Pros', personName: 'Derek Bishop', contact: '+1 (555) 010-1212', email: 'derek@vanguardsolar.com', website: 'vanguardsolar.com', location: 'Tampa, FL', notes: 'Will call back on Friday.', status: 'Callback' },
  { businessName: 'Summit Shingle & Panel', personName: 'Dean Harris', contact: '+1 (555) 121-2323', email: 'dean@summitshingle.com', website: 'summitshingle.com', location: 'Denver, CO', notes: 'No answer on cold call.', status: 'No Answer' },
  { businessName: 'EcoPower Panels', personName: 'Alicia Gomez', contact: '+1 (555) 232-3434', email: 'alicia@ecopowerpanels.com', website: 'ecopowerpanels.com', location: 'Albuquerque, NM', notes: 'New lead from green expo.', status: 'New Lead' }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trackme');
    console.log('Connected to MongoDB');

    // Clear existing
    await Lead.deleteMany({});
    await Niche.deleteMany({});
    await Appointment.deleteMany({});
    console.log('Cleared existing leads, niches, and appointments');

    // Create Niches
    const createdNiches = [];
    for (const n of nichesData) {
      const niche = await Niche.create(n);
      createdNiches.push(niche);
      console.log(`Created niche: ${n.name}`);
    }

    // Dates distribution: June 2026, July 2026, August 2026, September 2026 (today is Sep 24, 2026)
    const dates = [
      // September 2026 (current month)
      new Date(2026, 8, 24, 11, 30),
      new Date(2026, 8, 24, 9, 15),
      new Date(2026, 8, 23, 14, 20),
      new Date(2026, 8, 22, 10, 0),
      new Date(2026, 8, 20, 16, 45),
      new Date(2026, 8, 18, 13, 10),
      new Date(2026, 8, 15, 11, 0),
      new Date(2026, 8, 12, 15, 30),
      new Date(2026, 8, 8, 10, 45),
      new Date(2026, 8, 5, 9, 0),
      new Date(2026, 8, 2, 14, 15),

      // August 2026 (last month)
      new Date(2026, 7, 28, 10, 30),
      new Date(2026, 7, 25, 15, 0),
      new Date(2026, 7, 22, 11, 20),
      new Date(2026, 7, 19, 16, 0),
      new Date(2026, 7, 15, 9, 45),
      new Date(2026, 7, 12, 14, 10),
      new Date(2026, 7, 8, 11, 0),
      new Date(2026, 7, 4, 13, 30),
      new Date(2026, 7, 1, 10, 0),

      // July 2026
      new Date(2026, 6, 29, 14, 0),
      new Date(2026, 6, 24, 11, 30),
      new Date(2026, 6, 20, 15, 45),
      new Date(2026, 6, 16, 10, 15),
      new Date(2026, 6, 11, 16, 0),
      new Date(2026, 6, 6, 9, 30),
      new Date(2026, 6, 2, 13, 20),

      // June 2026
      new Date(2026, 5, 27, 11, 0),
      new Date(2026, 5, 22, 14, 30),
      new Date(2026, 5, 18, 10, 15),
      new Date(2026, 5, 14, 15, 0),
      new Date(2026, 5, 8, 11, 45),
      new Date(2026, 5, 3, 9, 30)
    ];

    let leadIdx = 0;
    for (const leadData of sampleLeads) {
      // Assign to appropriate niche
      let nicheId = createdNiches[0]._id;
      if (leadIdx < 10) nicheId = createdNiches[0]._id; // Restaurants
      else if (leadIdx < 18) nicheId = createdNiches[1]._id; // Real Estate
      else if (leadIdx < 26) nicheId = createdNiches[2]._id; // SaaS
      else if (leadIdx < 33) nicheId = createdNiches[3]._id; // Fitness
      else if (leadIdx < 39) nicheId = createdNiches[4]._id; // E-Commerce
      else nicheId = createdNiches[5]._id; // Solar

      const chosenDate = dates[leadIdx % dates.length];
      
      const newLead = new Lead({
        ...leadData,
        niche: nicheId,
        createdAt: chosenDate,
        updatedAt: chosenDate
      });
      await newLead.save();

      // If status is Appointment, also create an Appointment record
      if (leadData.status === 'Appointment') {
        const apptDate = new Date(chosenDate);
        apptDate.setDate(apptDate.getDate() + 2);
        apptDate.setHours(14, 0, 0, 0);

        await Appointment.create({
          lead: newLead._id,
          niche: nicheId,
          dateTime: apptDate,
          duration: 30,
          status: 'Scheduled',
          notes: `Demo call with ${leadData.personName}`
        });
      }

      leadIdx++;
    }

    console.log(`Successfully seeded ${leadIdx} leads across ${createdNiches.length} niches with dates from June to September 2026.`);
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
