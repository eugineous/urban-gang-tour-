export default function sitemap() {
  const base = 'https://urban-gang-tour.vercel.app';
  const routes = ['', '/about', '/events', '/stops', '/performers', '/shop', '/crew', '/partners', '/contact', '/gallery/koinange', '/gallery/loreto', '/gallery/gathirimu'];
  return routes.map(route => ({
    url: `${base}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: route === '' ? 1 : 0.8,
  }));
}
