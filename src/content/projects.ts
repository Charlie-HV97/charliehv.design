// Project data for the portfolio
// Edit this file to add, remove, or reorder projects.

export interface Project {
  slug: string;
  title: string;
  category: string;
  description: string;
  coverImage: string;
}

export const projects: Project[] = [
  {
    slug: 'loyalty-and-strategy',
    title: 'Loyalty and Strategy',
    category: 'UX & Product Design',
    description:
      'Led the redesign of the loyalty program experience, focusing on customer engagement and retention strategies across digital touchpoints.',
    coverImage: '/images/covers/live_01.png',
  },
  {
    slug: 'point-of-sale',
    title: 'Point of Sale',
    category: 'UX & Product Design',
    description:
      'Designed the point-of-sale experience, modernizing the checkout flow and integrating digital solutions for in-store retail.',
    coverImage: '/images/covers/live_02.png',
  },
  {
    slug: 'ux-research',
    title: 'UX Research',
    category: 'UX & Product Design',
    description:
      'Conducted user research initiatives to inform product decisions, including usability testing, interviews, and data analysis.',
    coverImage: '/images/covers/live_03.png',
  },
  {
    slug: 'creative-direction',
    title: 'Creative Direction',
    category: 'Creative Direction',
    description:
      'Art direction and creative strategy across brand campaigns, in-store experiences, and digital marketing.',
    coverImage: '/images/covers/live_04.png',
  },
  {
    slug: 'design-systems',
    title: 'Design Systems Engineering',
    category: 'UX & Product Design',
    description:
      'Built and maintained a scalable design system, creating reusable components and establishing design standards across teams.',
    coverImage: '/images/covers/live_05.png',
  },
  {
    slug: 'specialty-pharmacy',
    title: 'Specialty Pharmacy',
    category: 'UX & Product Design',
    description:
      'Designed the digital experience for specialty pharmacy services, streamlining complex workflows for patients and pharmacists.',
    coverImage: '/images/covers/live_06.png',
  },
  {
    slug: 'furniture-design',
    title: 'Furniture Design',
    category: 'Physical Craft',
    description:
      'Sometimes I also make physical stuff. If only I had a woodworking space in NYC.',
    coverImage: '/images/covers/live_07.png',
  },
  {
    slug: 'photography',
    title: 'Photography work',
    category: 'Visual Craft',
    description:
      'A selection of photographic work spanning street photography, architecture, and environmental portraits.',
    coverImage: '/images/covers/live_08.jpg',
  },
];

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
