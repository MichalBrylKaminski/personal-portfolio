import { basics, labelParts } from '../lib/cv';

/** Copy and settings that don't belong in cv.json. */
export const site = {
  title: basics.name,
  /** Appended to the name in the home page `<title>`. */
  tagline: '.NET Developer & AWS Solutions Architect',
  /** Meta description (~155 chars); the hero shows the longer `basics.summary`. */
  description:
    '.NET developer with over a decade of experience building ticket-selling platforms for the travel industry. AWS Certified Solutions Architect.',
  /** Short facts in the hero's readout card, next to the ones derived from cv.json. */
  readout: {
    role: labelParts[0] ?? '',
    domain: 'Travel & ticketing',
    certs: 'AWS SAA · AWS CCP',
  },
  writingIntro: 'C#, ASP.NET Core and messaging, published on Code Maze. New posts land on the blog.',
  contactIntro: 'Email is the quickest way to reach me — LinkedIn works too.',
  blog: {
    title: 'Notes on .NET, messaging & the cloud',
    description:
      'Write-ups from building distributed systems in C#: message buses, sagas, testing, and AWS. Earlier posts first appeared on Code Maze.',
    authorBlurb: 'Building ticket-selling platforms for the travel industry at DataArt. AWS Certified Solutions Architect.',
  },
};
