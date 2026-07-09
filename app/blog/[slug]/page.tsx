import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BLOG_POSTS, findBlogPost } from "@/content/blog";
import Nav from "../../_components/Nav";
import Footer from "../../_components/Footer";

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = findBlogPost(slug);
  if (!post) return {};
  const url = `/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.teaser,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.teaser,
      url,
      type: "article",
      publishedTime: post.date,
      images: [{ url: post.img, width: 1200, height: 630, alt: post.title }],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = findBlogPost(slug);
  if (!post) notFound();

  const idx = BLOG_POSTS.findIndex((p) => p.slug === slug);
  const nextPost = BLOG_POSTS[(idx + 1) % BLOG_POSTS.length];

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    description: post.teaser,
    image: [`https://urbangangtour.co.ke${post.img}`],
    datePublished: post.date,
    dateModified: post.date,
    author: [
      { "@type": "Person", name: "Eugine Micah" },
      { "@type": "Person", name: "Lucy Ogunde" },
    ],
    publisher: {
      "@type": "Organization",
      name: "Urban Gang Tour",
      logo: { "@type": "ImageObject", url: "https://urbangangtour.co.ke/assets/brand/logo_transparent.png" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://urbangangtour.co.ke/blog/${post.slug}` },
    articleSection: post.tag,
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://urbangangtour.co.ke/" },
      { "@type": "ListItem", position: 2, name: "Urban News", item: "https://urbangangtour.co.ke/blog" },
      { "@type": "ListItem", position: 3, name: post.title, item: `https://urbangangtour.co.ke/blog/${post.slug}` },
    ],
  };

  return (
    <div className="min-h-screen bg-paper">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Nav />

      <article className="mx-auto max-w-[880px] px-6 pb-16 pt-10 sm:px-10">
        <Link href="/blog" className="inline-flex items-center gap-2 text-[13px] font-bold uppercase text-magenta transition hover:-translate-x-1">
          &larr; All stories
        </Link>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="-rotate-2 rounded-full border-2 border-ink bg-gold px-3.5 py-1.5 font-display text-xs uppercase tracking-wide text-ink">
            {post.tag}
          </div>
          <time dateTime={post.date} className="text-[13px] font-bold uppercase tracking-wide text-ink/55">
            {post.dateLabel} &middot; Urban News Desk
          </time>
        </div>

        <h1 className="mt-4 font-display text-[clamp(36px,5vw,58px)] uppercase leading-[0.95]">{post.title}</h1>

        <div className="relative mt-7 h-[320px] w-full overflow-hidden rounded-2xl border-4 border-ink shadow-[8px_8px_0_#111] sm:h-[440px]">
          <Image src={post.img} alt={post.title} fill priority sizes="(max-width: 768px) 100vw, 760px" className="object-cover" />
        </div>

        {post.paras.map((p, i) => (
          <p key={i} className="mt-[22px] text-[16px] leading-[1.8] text-ink/85">
            {p}
          </p>
        ))}

        <blockquote className="mt-8 -rotate-1 rounded-r-2xl border-l-[5px] border-ink bg-cyan/25 px-6 py-6 font-marker text-xl leading-normal text-ink">
          {post.quote}
        </blockquote>

        <div className="mt-8 grid grid-cols-3 gap-3">
          {post.strip.map((s, i) => (
            <div key={i} className="relative h-[150px] w-full overflow-hidden rounded-xl border-[3px] border-ink sm:h-[180px]">
              <Image src={s} alt="" fill loading="lazy" sizes="33vw" className="object-cover" />
            </div>
          ))}
        </div>

        <div className="mt-9 flex flex-wrap gap-3.5">
          <Link
            href="/gallery"
            className="rounded-xl border-[3px] border-ink bg-white px-5 py-3 font-sans text-[13px] font-bold uppercase text-ink shadow-sm3 transition-transform hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            More in the Gallery
          </Link>
          <Link
            href="/book"
            className="rounded-xl border-[3px] border-ink bg-magenta px-5 py-3 font-sans text-[13px] font-bold uppercase text-white shadow-sm3 transition-transform hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            Bring the Tour to Your Institution &rarr;
          </Link>
        </div>

        <div className="mt-14 border-t-2 border-dashed border-ink/30 pt-8">
          <div className="text-[11px] font-bold uppercase tracking-wide text-ink/45">Next story</div>
          <Link href={`/blog/${nextPost.slug}`} className="mt-2 block font-display text-2xl uppercase leading-tight text-ink transition-colors hover:text-magenta">
            {nextPost.title} &rarr;
          </Link>
        </div>
      </article>

      <Footer />
    </div>
  );
}
