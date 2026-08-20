/** Owned elevation and motion vocabulary. */
import { themeMotion, themeShadows } from './theme';

export const shadows = themeShadows;
export const transitions = {
  fast: `${themeMotion['duration-fast']} ${themeMotion['ease-standard']}`,
  normal: `${themeMotion['duration-normal']} ${themeMotion['ease-standard']}`,
  slow: `${themeMotion['duration-slow']} ${themeMotion['ease-standard']}`,
} as const;

export type Shadows = typeof shadows;
export type Transitions = typeof transitions;
