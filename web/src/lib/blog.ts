import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

const BLOG_DIR = path.join(process.cwd(), "content/blog");

export interface PostMeta {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  tags: string[];
  coverImage?: string;
}

export interface PostHeading {
  id: string;
  text: string;
  level: number;
}

export type ContentSegment =
  | { type: "html"; content: string }
  | { type: "code"; lang: string; value: string };

export interface Post extends PostMeta {
  segments: ContentSegment[];
  headings: PostHeading[];
}

function fileSlug(filename: string) {
  return filename.replace(/\.md$/, "");
}

function toId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** Add id attributes to h2/h3 in rendered HTML */
function addHeadingIds(html: string): string {
  return html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_, level, inner) => {
    const text = inner.replace(/<[^>]+>/g, "");
    const id = toId(text);
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
}

async function markdownToHtml(md: string): Promise<string> {
  const result = await remark().use(remarkGfm).use(remarkHtml, { sanitize: false }).process(md);
  return addHeadingIds(result.toString());
}

/** Split markdown into alternating html/code segments */
async function parseSegments(content: string): Promise<ContentSegment[]> {
  const segments: ContentSegment[] = [];
  const fence = /^```([\w-]*)\n([\s\S]*?)^```/gm;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fence.exec(content)) !== null) {
    const before = content.slice(lastIndex, match.index);
    if (before.trim()) {
      segments.push({ type: "html", content: await markdownToHtml(before) });
    }
    segments.push({
      type: "code",
      lang: match[1] || "",
      value: match[2].replace(/\n$/, ""),
    });
    lastIndex = match.index + match[0].length;
  }

  const after = content.slice(lastIndex);
  if (after.trim()) {
    segments.push({ type: "html", content: await markdownToHtml(after) });
  }

  return segments;
}

function extractHeadings(markdown: string): PostHeading[] {
  const headings: PostHeading[] = [];
  const re = /^(#{2})\s+(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown)) !== null) {
    const level = m[1].length;
    const text = m[2].trim();
    headings.push({ id: toId(text), text, level });
  }
  return headings;
}

export function getAllPostMeta(): PostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md") && f !== "PUBLISHING_GUIDE.md");

  const posts = files.map((filename) => {
    const slug = fileSlug(filename);
    const raw = fs.readFileSync(path.join(BLOG_DIR, filename), "utf8");
    const { data } = matter(raw);
    return {
      slug,
      title: data.title ?? slug,
      excerpt: data.excerpt ?? "",
      date: data.date ? String(data.date) : "",
      author: data.author ?? "",
      tags: data.tags ?? [],
      coverImage: data.coverImage,
    } satisfies PostMeta;
  });

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPost(slug: string): Promise<Post | null> {
  const filepath = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(filepath)) return null;

  const raw = fs.readFileSync(filepath, "utf8");
  const { data, content } = matter(raw);

  const [segments, headings] = await Promise.all([
    parseSegments(content),
    Promise.resolve(extractHeadings(content)),
  ]);

  return {
    slug,
    title: data.title ?? slug,
    excerpt: data.excerpt ?? "",
    date: data.date ? String(data.date) : "",
    author: data.author ?? "",
    tags: data.tags ?? [],
    coverImage: data.coverImage,
    segments,
    headings,
  };
}

export function getAllSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md") && f !== "PUBLISHING_GUIDE.md")
    .map((f) => fileSlug(f));
}
