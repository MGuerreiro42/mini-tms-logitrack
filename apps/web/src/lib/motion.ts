// For JS-driven animations, which can't read CSS variables; mirrors the motion tokens in globals.css.
export const MOTION = {
  durationBase: 200,
  easeEnter: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

export const LIST_ANIMATION = {
  duration: MOTION.durationBase,
  easing: MOTION.easeEnter,
};
