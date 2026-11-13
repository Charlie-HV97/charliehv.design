// Project data for the portfolio
// Curated for Principal Product Designer & Systems Strategy positioning

export interface Project {
  slug: string;
  title: string;
  subtitle?: string;
  category: string;
  role?: string;
  impactMetric?: string;
  description: string;
  coverImage: string;
  isCraft?: boolean;
}

export const featuredProjects: Project[] = [
  {
    slug: 'ai-prototyping',
    title: 'AI-Led Prototyping Systems & Async Review',
    subtitle: 'Multi-Brand Capability, Automated Heuristics & Live Showcase Hubs',
    category: 'DesignOps, AI Tooling & Systems Architecture',
    role: 'Lead Design Technologist & AI Strategy Lead',
    impactMetric: 'Quarters to Days | 2 Live Showcase Hubs',
    description:
      'Architected a repeatable AI-led prototyping engine across two distinct brand systems (Retail & Health100), replacing slow synchronous walkthroughs with always-on showcase hubs, automated heuristic QA, and in-context review.',
    coverImage: '/images/ai-prototyping/fs-app-hub-home.png',
  },
  {
    slug: 'point-of-sale',
    title: 'Next-Gen Point of Sale Modernization',
    subtitle: 'Enterprise Retail Architecture Across Thousands of Locations',
    category: 'Enterprise Systems Architecture & Hardware UX',
    role: 'Principal Design & Research Lead',
    impactMetric: '$300M+ Operational Savings | 9,000+ Stores',
    description:
      'Led the end-to-end design and research strategy to modernize CVS’s retail checkout across 9,000+ stores. Untangled decades of legacy technical debt and physical cashier ergonomics, elevating platform usability to an 88 Grade A while delivering over $300M in operational savings.',
    coverImage: '/images/covers/live_02.png',
  },
  {
    slug: 'loyalty-and-strategy',
    title: 'Omnichannel Loyalty & Strategy',
    subtitle: 'CVS ExtraCare & ExtraCare Plus (80M+ Members)',
    category: 'Consumer Growth & Monetization',
    role: 'Lead Product Designer & Growth Strategist',
    impactMetric: '$60M Incremental Margin | 80M+ Active Members',
    description:
      'Led product design and conversion strategy for the nation\'s largest retail loyalty ecosystem. Built frictionless in-lane enrollment flows and in-app gamification that generated $60M in incremental margin across 80M+ active members.',
    coverImage: '/images/covers/live_01.png',
  },
  {
    slug: 'specialty-pharmacy',
    title: 'Specialty Pharmacy & Clinical AI',
    subtitle: 'Complex Medical Verification & Human-in-the-Loop AI',
    category: 'Healthcare Systems & Human-in-the-Loop AI',
    role: 'Lead Product Designer & Lead Researcher',
    impactMetric: 'Mitigated Root Cause of 80% Bad Debt',
    description:
      'Transformed dense verification workflows for specialty pharmacy representatives, designing trustworthy, human-in-the-loop AI interfaces that mitigate clinical risk and safeguard patient care.',
    coverImage: '/images/covers/live_06.png',
  },
  {
    slug: 'design-systems',
    title: 'Enterprise Design Systems Engineering',
    subtitle: 'Multi-Platform Tokens, Slot Architecture & Governance',
    category: 'Design Systems Architecture & Developer Parity',
    role: 'Design Systems Lead',
    impactMetric: '50% Reduction in Production Overhead',
    description:
      'Architected multi-platform design tokens and component libraries across customer-facing and colleague platforms, establishing tight developer parity and cutting redundant production overhead across engineering teams.',
    coverImage: '/images/covers/live_05.png',
  },
  {
    slug: 'ux-conference',
    title: 'UX@CVS 2026: Enterprise Community & Analytics',
    subtitle: 'Unifying 3 Business Units & Real-Time Measurement',
    category: 'Enterprise Design Operations & Culture',
    role: 'Planning Committee & Analytics Platform Lead',
    impactMetric: 'NPS 67 | 493 Attendees Across 5 Business Units',
    description:
      'Eliminated organizational IT barriers across CVS, Aetna, and Caremark to open our company-wide UX conference, building a zero-dependency web application and real-time analytics dashboard.',
    coverImage: '/images/ux-conference/2_live_analytics_dashboard_showi.png',
  },
  {
    slug: 'creative-direction',
    title: 'Creative Direction & Brand Scaling',
    subtitle: 'Omnichannel Brand-to-Product Unification',
    category: 'Omnichannel Brand & Product Systems',
    role: 'Creative Lead & Strategist',
    impactMetric: 'Unified In-Store, Digital & CRM Channels',
    description:
      'Served as the central creative node aligning physical in-store collateral, CRM communications, and digital experiences for high-visibility nationwide loyalty initiatives.',
    coverImage: '/images/covers/live_04.png',
  },
];

export const craftProjects: Project[] = [
  {
    slug: 'furniture-design',
    title: 'Furniture & Object Design',
    category: 'Industrial Design & Joinery',
    description:
      'Explorations in solid wood joinery, ergonomic seating, and functional physical craft.',
    coverImage: '/images/covers/live_07.png',
    isCraft: true,
  },
  {
    slug: 'photography',
    title: 'Photography Work',
    category: 'Visual Craft & Photography',
    description:
      'Studies in light, architectural geometry, and environmental framing.',
    coverImage: '/images/covers/live_08.jpg',
    isCraft: true,
  },
];

export const projects: Project[] = [
  ...featuredProjects,
  // Retain ux-research slug in main registry so existing links continue to resolve smoothly
  {
    slug: 'ux-research',
    title: 'UX Research & Behavioral Testing',
    category: 'Research Leadership',
    description:
      'Foundational qual/quant triangulation and evaluative testing across retail and healthcare systems.',
    coverImage: '/images/covers/live_03.png',
  },
  ...craftProjects,
];

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
