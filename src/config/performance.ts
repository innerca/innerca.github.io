export const performance = {
  particleCount: 60,
  particleCountMobile: 30,
  connectDist: 100,
  fpsThreshold: 16.6,
  canvasScale: 0.5,
} as const;

export type Performance = typeof performance;
