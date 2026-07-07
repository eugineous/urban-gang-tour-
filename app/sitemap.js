import { getAllPeople, getBlogPosts, getAllGalleryAlbums, getAllEvents } from '@/lib/cms';

const BASE_URL = 'https://urbangangtour.co.ke';

const STATIC_ROUTES = [
  { path: '/', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/events', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/stops', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/crew', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/performers', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/shop', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/partners', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/gallery', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/tickets', changeFrequency: 'daily', priority: 0.9 },
  { path: '/press', changeFrequency: 'daily', priority: 0.8 },
];

export default async function sitemap() {
  const now = new Date();

  // Static routes
  const staticEntries = STATIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  // Dynamic routes — fetched from Redis; gracefully degrade if unavailable
  let dynamicEntries = [];

  try {
    const [people, blogPosts, galleryAlbums, events] = await Promise.all([
      getAllPeople(),
      getBlogPosts('published'),
      getAllGalleryAlbums(),
      getAllEvents(),
    ]);

    // /people/[slug]
    const peopleEntries = (people || []).map((person) => ({
      url: `${BASE_URL}/people/${person.slug}`,
      lastModified: person.updatedAt ? new Date(person.updatedAt) : now,
      changeFrequency: 'monthly',
      priority: 0.7,
    }));

    // /press/[slug]
    const pressEntries = (blogPosts || []).map((post) => ({
      url: `${BASE_URL}/press/${post.slug}`,
      lastModified: post.updatedAt ? new Date(post.updatedAt) : now,
      changeFrequency: 'monthly',
      priority: 0.7,
    }));

    // /gallery/[slug]
    const galleryEntries = (galleryAlbums || []).map((album) => ({
      url: `${BASE_URL}/gallery/${album.slug}`,
      lastModified: album.updatedAt ? new Date(album.updatedAt) : now,
      changeFrequency: 'monthly',
      priority: 0.7,
    }));

    // /schools/[slug]
    const schoolEntries = (events || []).map((event) => ({
      url: `${BASE_URL}/schools/${event.slug}`,
      lastModified: event.updatedAt ? new Date(event.updatedAt) : now,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    dynamicEntries = [
      ...peopleEntries,
      ...pressEntries,
      ...galleryEntries,
      ...schoolEntries,
    ];
  } catch {
    // Redis unavailable (e.g. during build without credentials) — return only static routes
    return staticEntries;
  }

  return [...staticEntries, ...dynamicEntries];
}
