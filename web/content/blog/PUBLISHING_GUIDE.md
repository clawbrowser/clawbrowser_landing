# Blog Publishing Guide

## How to publish an article — quick version

1. Create a `.md` file in `web/content/blog/`
2. Name it with dashes, no spaces — this becomes the URL  
   `my-article.md` → `clawbrowser.ai/blog/my-article`
3. Commit and push to GitHub → site rebuilds → post appears automatically

---

## File structure

Every article starts with a frontmatter block (between the `---` lines), then the content below.

```
---
title: "Your Article Title"
excerpt: "One sentence shown on the blog card. Keep it under 160 characters."
date: "2025-06-01"
author: "Your Name"
tags: ["agents", "how-to"]
coverImage: "/blog/my-cover.jpg"
---

Your article content starts here...
```

### Frontmatter fields

| Field | Required | Notes |
|-------|----------|-------|
| `title` | Yes | Shown as page heading and card title |
| `excerpt` | Yes | Shown on blog index card. 1–2 sentences. |
| `date` | Yes | Format: `YYYY-MM-DD` |
| `author` | Yes | Your name or team name (fallback if no authorName) |
| `tags` | No | List of topics. Used for filtering. |
| `coverImage` | No | Path to cover image. Falls back to auto icon if omitted. |
| `authorName` | No | Full name shown on the article page |
| `authorRole` | No | Job title shown under the name |
| `authorGithub` | No | Full URL to GitHub profile |
| `authorTwitter` | No | Full URL to X / Twitter profile |

---

## Cover image

### Step 1 — add your image file

Place the image in:

```
web/public/blog/
```

Example: `web/public/blog/my-article-cover.jpg`

**Recommendations:**
- Formats: `.jpg`, `.png`, `.webp`
- Size: 1200×630px recommended, minimum 800px wide
- File naming: lowercase, dashes only — `my-cover.jpg` not `my cover.jpg`

### Step 2 — reference it in frontmatter

```markdown
coverImage: "/blog/my-article-cover.jpg"
```

The path must start with `/blog/`.

### Example

Image file at `web/public/blog/fingerprinting-cover.jpg`:

```markdown
---
title: "Browser Fingerprinting Explained"
coverImage: "/blog/fingerprinting-cover.jpg"
---
```

If `coverImage` is not set, the card shows an automatic icon based on the article's first tag. This is fine — cover images are optional.

---

## Writing content

Everything below the second `---` is your article body in standard Markdown.

### Headings

```markdown
## Section heading
### Sub-section
```

Use `##` for main sections, `###` for sub-sections. Don't use `#` — that's the page title, already rendered from the `title` field.

---

### Paragraphs

Just write text. Blank line between paragraphs.

---

### Bold and italic

```markdown
**bold text**
*italic text*
```

---

### Lists

Bullet list:
```markdown
- First item
- Second item
- Third item
```

Numbered list:
```markdown
1. First step
2. Second step
3. Third step
```

---

### Tables

```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Value A  | Value B  | Value C  |
| Value D  | Value E  | Value F  |
```

---

### Code blocks

Inline code (short snippets):
```markdown
Use the `claw navigate` command.
```

Full code block — specify language for syntax highlighting:

````markdown
```bash
claw navigate https://example.com --session work
claw extract "product name and price" --json
```
````

````markdown
```python
import subprocess
result = subprocess.run(["claw", "extract", "title"], capture_output=True)
```
````

Supported languages: `bash`, `python`, `javascript`, `typescript`, `json`, `sql`, and most others.

---

### Images inside the article

**Single image (one version for all themes):**

```markdown
![Description of image](/blog/my-image.png)
```

The file must be placed in `web/public/blog/`.

---

**Image with separate light and dark versions:**

If you have two versions of an image (one for light theme, one for dark), use this instead:

```html
<!-- themed-image light="/blog/my-image-light.png" dark="/blog/my-image-dark.png" alt="Description of image" -->
```

Place both files in `web/public/blog/`:
```
web/public/blog/my-image-light.png   ← shown in light theme
web/public/blog/my-image-dark.png    ← shown in dark theme
```

The image switches automatically when the reader toggles the theme. The `alt` field is required for SEO.

---

### CTA block

Insert a call-to-action banner anywhere in the article body:

```html
<!-- CTA -->
```

Typically placed after the first or second section — before the reader loses interest. Can be used multiple times.

---

### Blockquotes

```markdown
> This is a highlighted quote or callout.
```

---

### Horizontal divider

```markdown
---
```

---

## Full article example

```markdown
---
title: "How We Cut Browser Memory Usage by 10x"
excerpt: "We went from 30GB RAM for 100 sessions to under 3GB. Here's exactly how."
date: "2025-06-01"
author: "Clawbrowser Team"
authorName: "Alex Kim"
authorRole: "Software Engineer"
authorGithub: "https://github.com/alexkim"
authorTwitter: "https://x.com/alexkim"
tags: ["performance", "architecture"]
coverImage: "/blog/memory-cover.jpg"
---

Browser automation at scale is expensive. A single Chrome instance uses 150–300MB of RAM.

## The problem

We profiled our early architecture and found this:

| Sessions | RAM (naive) | RAM (pooled) |
|----------|-------------|--------------|
| 10       | 2 GB        | 400 MB       |
| 100      | 28 GB       | 2.8 GB       |

<!-- CTA -->

## What we changed

Instead of one process per session, we share browser processes across isolated contexts.

```bash
claw session start --profile user-42
```

<!-- themed-image light="/blog/pool-architecture-light.png" dark="/blog/pool-architecture-dark.png" alt="Architecture diagram" -->

## Result

**10x memory reduction.** Same isolation guarantees. No changes to the API your agents call.
```

---

## Checklist before publishing

- [ ] Frontmatter has `title`, `excerpt`, `date`, `author`
- [ ] Date is in `YYYY-MM-DD` format
- [ ] Filename uses dashes and lowercase only, ends in `.md`
- [ ] If using a cover image — file is in `web/public/blog/` and path starts with `/blog/`
- [ ] Images inside the article are also in `web/public/blog/`
- [ ] Themed images have both `light` and `dark` files uploaded
- [ ] All `alt` attributes filled in (required for SEO)
- [ ] `<!-- CTA -->` placed at least once in longer articles

---

## Questions?

Open an issue in the GitHub repo or reach out to the dev team.
