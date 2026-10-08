import type { ImageMetadata } from 'astro';
import { basics } from './cv';

const images = import.meta.glob<{ default: ImageMetadata }>('/src/assets/*.{png,jpg,jpeg,webp,avif}', { eager: true });

/** The optional avatar: `src/assets/<basename of basics.image>`; undefined falls back to initials. */
export const avatar: ImageMetadata | undefined = (() => {
  const basename = basics.image?.split('/').pop();
  return basename ? images[`/src/assets/${basename}`]?.default : undefined;
})();
