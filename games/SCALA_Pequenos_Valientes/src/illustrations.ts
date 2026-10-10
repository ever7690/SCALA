import type { Lesson } from './content.ts';

export const storyIcon = (id: string): string => `<span class="toy-icon story-icon" aria-hidden="true"><img src="/icons/stories/${id}.webp" alt="" width="256" height="256" decoding="async"></span>`;
export const storyIllustration = (lesson: Lesson): string => `<figure class="story-illustration"><img src="/stories/${lesson.id}.webp" alt="Ilustración de ${lesson.title}" width="1280" height="853" decoding="async" fetchpriority="high"></figure>`;
