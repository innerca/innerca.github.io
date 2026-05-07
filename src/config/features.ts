export const features = {
  search: true,
  particleBackground: true,
  countUpAnimation: true,
} as const;

export type Features = typeof features;
