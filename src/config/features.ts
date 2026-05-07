export const features = {
  search: true,
  particleBackground: true,
  countUpAnimation: true,
  trendingSection: true,
} as const;

export type Features = typeof features;
