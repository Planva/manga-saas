import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPosts } from "@/content/blog";
import { getSystemSettings } from "@/utils/system-settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Blog",
  description: "Insights on building AI-powered translation pipelines, SaaS growth, and product delivery.",
  alternates: {
    canonical: "/blog",
  },
};

export default async function BlogIndex() {
  const settings = await getSystemSettings();
  if (!settings.blogEnabled) return notFound();
  const posts = getAllPosts();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <header className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Blog</p>
        <h1 className="text-4xl font-bold text-foreground">Ship faster. Stay reliable.</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Long-form notes on AI translation, production pipelines, and product craft. Built to stay simple today, with room to grow into multiple locales later.
        </p>
      </header>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {posts.map((post) => {
          return (
            <article key={post.slug} className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{new Date(post.publishedAt).toLocaleDateString("en")}</span>
              </div>
              <h2 className="mt-3 text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{post.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                    #{tag}
                  </span>
                ))}
              </div>
              <div className="mt-5">
                <Link
                  href={`/blog/${post.slug}`}
                  className="text-sm font-medium text-primary hover:text-primary/80 underline decoration-primary/40 underline-offset-4"
                >
                  Read article
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
