import type { CourseCategory, CourseLevel } from '../models/course.model.js';

/** Public sample videos (MP4 test clips and freely available YouTube lectures). */
const mp4 = {
  bunny: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_2MB.mp4',
  jellyfish: 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4',
  sintel: 'https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4',
  flower: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  friday: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4',
};
const yt = (id: string) => `https://www.youtube.com/watch?v=${id}`;

interface SeedLesson {
  title: string;
  videoUrl: string;
  durationMinutes: number;
  isFreePreview?: boolean;
}

export interface SeedCourse {
  title: string;
  slug: string;
  summary: string;
  description: string;
  category: CourseCategory;
  level: CourseLevel;
  price: number;
  instructor: string;
  isPublished: boolean;
  modules: { title: string; lessons: SeedLesson[] }[];
}

export const seedCourses: SeedCourse[] = [
  {
    title: 'Modern JavaScript from scratch',
    slug: 'modern-javascript-from-scratch',
    summary: 'Variables to async code: the language behind every web page, explained one idea at a time.',
    description:
      'You start with values, functions and the DOM, then move to arrays, objects, modules and asynchronous code with promises and async/await. Every module ends with a small exercise you can run in the browser. No prior programming experience is needed.',
    category: 'development',
    level: 'beginner',
    price: 1499,
    instructor: 'Ananya Iyer',
    isPublished: true,
    modules: [
      { title: 'Getting started', lessons: [
        { title: 'What JavaScript does in a page', videoUrl: yt('PkZNo7MFNFg'), durationMinutes: 12, isFreePreview: true },
        { title: 'Setting up your editor', videoUrl: mp4.bunny, durationMinutes: 6 },
      ] },
      { title: 'Core language', lessons: [
        { title: 'Values, variables and types', videoUrl: mp4.jellyfish, durationMinutes: 14 },
        { title: 'Functions and scope', videoUrl: mp4.sintel, durationMinutes: 16 },
        { title: 'Arrays and objects', videoUrl: mp4.flower, durationMinutes: 18 },
      ] },
      { title: 'Asynchronous code', lessons: [
        { title: 'Promises', videoUrl: mp4.friday, durationMinutes: 15 },
        { title: 'async and await', videoUrl: mp4.bunny, durationMinutes: 12 },
      ] },
    ],
  },
  {
    title: 'React for working developers',
    slug: 'react-for-working-developers',
    summary: 'Components, state, effects and data fetching, the way production React apps are built today.',
    description:
      'A practical course for developers who know JavaScript. You build a small catalogue app step by step: components and props, state, effects, forms, routing and server data with TanStack Query. The last module covers testing with Testing Library.',
    category: 'development',
    level: 'intermediate',
    price: 2499,
    instructor: 'Kabir Malhotra',
    isPublished: true,
    modules: [
      { title: 'Thinking in components', lessons: [
        { title: 'Why React', videoUrl: yt('SqcY0GlETPk'), durationMinutes: 10, isFreePreview: true },
        { title: 'Props and composition', videoUrl: mp4.sintel, durationMinutes: 14 },
      ] },
      { title: 'State and effects', lessons: [
        { title: 'useState in practice', videoUrl: mp4.jellyfish, durationMinutes: 16 },
        { title: 'Effects without surprises', videoUrl: mp4.flower, durationMinutes: 18 },
      ] },
      { title: 'Data and testing', lessons: [
        { title: 'Fetching with TanStack Query', videoUrl: mp4.friday, durationMinutes: 20 },
        { title: 'Testing components', videoUrl: mp4.bunny, durationMinutes: 15 },
      ] },
    ],
  },
  {
    title: 'Interface design fundamentals',
    slug: 'interface-design-fundamentals',
    summary: 'Hierarchy, spacing, type and colour: the decisions that make a screen easy to use.',
    description:
      'A free introduction to interface design. You learn to read a layout the way users do, to build a type scale, to choose colours that pass contrast checks and to space elements on a grid. Each lesson redesigns a real screen.',
    category: 'design',
    level: 'beginner',
    price: 0,
    instructor: 'Riya Desai',
    isPublished: true,
    modules: [
      { title: 'Seeing a layout', lessons: [
        { title: 'Visual hierarchy', videoUrl: yt('yfoY53QXEnI'), durationMinutes: 11, isFreePreview: true },
        { title: 'Spacing and grids', videoUrl: mp4.flower, durationMinutes: 9 },
      ] },
      { title: 'Type and colour', lessons: [
        { title: 'Building a type scale', videoUrl: mp4.jellyfish, durationMinutes: 12 },
        { title: 'Colour and contrast', videoUrl: mp4.sintel, durationMinutes: 13 },
      ] },
    ],
  },
  {
    title: 'Data analysis with Python and pandas',
    slug: 'data-analysis-with-python-and-pandas',
    summary: 'Load, clean, explore and chart real datasets with pandas and Matplotlib.',
    description:
      'You work with a public dataset of Indian railway timetables. You load it with pandas, clean missing values, group and aggregate, then chart your findings with Matplotlib. Basic Python is enough to follow.',
    category: 'data',
    level: 'intermediate',
    price: 1999,
    instructor: 'Vikram Nair',
    isPublished: true,
    modules: [
      { title: 'First look at the data', lessons: [
        { title: 'Notebooks and pandas', videoUrl: yt('r-uOLxNrNk8'), durationMinutes: 15, isFreePreview: true },
        { title: 'Loading a CSV', videoUrl: mp4.bunny, durationMinutes: 8 },
      ] },
      { title: 'Cleaning', lessons: [
        { title: 'Missing values', videoUrl: mp4.friday, durationMinutes: 14 },
        { title: 'Types and dates', videoUrl: mp4.jellyfish, durationMinutes: 12 },
      ] },
      { title: 'Answering questions', lessons: [
        { title: 'Group by and aggregate', videoUrl: mp4.sintel, durationMinutes: 17 },
        { title: 'Charts that explain', videoUrl: mp4.flower, durationMinutes: 16 },
      ] },
    ],
  },
  {
    title: 'SQL you can trust',
    slug: 'sql-you-can-trust',
    summary: 'Write queries that return the right rows: joins, grouping, indexes and transactions.',
    description:
      'Most SQL bugs come from a join that duplicates rows or a filter in the wrong place. This course teaches SELECT, joins, grouping, subqueries, indexes and transactions with small, checkable examples on a shop database.',
    category: 'data',
    level: 'beginner',
    price: 999,
    instructor: 'Meera Rao',
    isPublished: true,
    modules: [
      { title: 'Reading data', lessons: [
        { title: 'SELECT and WHERE', videoUrl: yt('HXV3zeQKqGY'), durationMinutes: 13, isFreePreview: true },
        { title: 'Sorting and limits', videoUrl: mp4.jellyfish, durationMinutes: 7 },
      ] },
      { title: 'Combining tables', lessons: [
        { title: 'Inner and outer joins', videoUrl: mp4.bunny, durationMinutes: 16 },
        { title: 'Grouping without duplicates', videoUrl: mp4.sintel, durationMinutes: 14 },
      ] },
    ],
  },
  {
    title: 'Pricing your freelance work',
    slug: 'pricing-your-freelance-work',
    summary: 'Set a day rate, write a quote and say no to scope creep, with worked examples in rupees.',
    description:
      'A free short course for freelance designers and developers. You calculate a sustainable rate from your costs, turn it into fixed-price quotes, and learn how to handle change requests and late payments.',
    category: 'business',
    level: 'beginner',
    price: 0,
    instructor: 'Sameer Khan',
    isPublished: true,
    modules: [
      { title: 'Your rate', lessons: [
        { title: 'From costs to a day rate', videoUrl: mp4.friday, durationMinutes: 10, isFreePreview: true },
        { title: 'Fixed price or time and materials', videoUrl: mp4.flower, durationMinutes: 9 },
      ] },
      { title: 'Quotes and clients', lessons: [
        { title: 'Writing a quote', videoUrl: mp4.bunny, durationMinutes: 11 },
        { title: 'Handling scope creep', videoUrl: mp4.jellyfish, durationMinutes: 8 },
      ] },
    ],
  },
  {
    title: 'Phone photography: light and composition',
    slug: 'phone-photography-light-and-composition',
    summary: 'Take better pictures with the phone you already have, by reading light and framing on purpose.',
    description:
      'You learn to find good light at any time of day, to compose with lines and negative space, and to edit with free apps without overdoing it. Every lesson ends with a photo assignment.',
    category: 'photography',
    level: 'beginner',
    price: 799,
    instructor: 'Tara Menon',
    isPublished: true,
    modules: [
      { title: 'Light', lessons: [
        { title: 'Reading natural light', videoUrl: mp4.flower, durationMinutes: 9, isFreePreview: true },
        { title: 'Shooting at night', videoUrl: mp4.sintel, durationMinutes: 10 },
      ] },
      { title: 'Composition and editing', lessons: [
        { title: 'Lines and negative space', videoUrl: mp4.jellyfish, durationMinutes: 8 },
        { title: 'Editing without overdoing it', videoUrl: mp4.friday, durationMinutes: 12 },
      ] },
    ],
  },
  {
    title: 'Content marketing for small brands',
    slug: 'content-marketing-for-small-brands',
    summary: 'Plan a content calendar that brings customers, not just likes.',
    description:
      'A draft course used to show the admin workflow: it is not published yet. It covers audience research, a weekly content calendar, and measuring what actually brings sales.',
    category: 'marketing',
    level: 'intermediate',
    price: 1299,
    instructor: 'Neha Kapoor',
    isPublished: false,
    modules: [
      { title: 'Planning', lessons: [{ title: 'Who you are writing for', videoUrl: mp4.bunny, durationMinutes: 10 }] },
    ],
  },
];
