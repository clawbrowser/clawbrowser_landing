# Blog Publishing Guide

## How to publish an article

1. Create a `.md` file in `web/content/blog/`
2. Name it with dashes, no spaces — this becomes the URL  
   `my-article-title.md` → `clawbrowser.com/blog/my-article-title`
3. Commit and push to GitHub → site rebuilds automatically

---

## File structure

Every article starts with a frontmatter block (between the `---` lines), then the content below.

```
---
title: "Your Article Title Here"
excerpt: "One sentence shown on the blog card. Keep it under 160 characters."
date: "2025-05-20"
author: "Jane Smith"
tags: ["agents", "how-to"]
---

Your article content starts here...
```

### Frontmatter fields

| Field | Required | Notes |
|-------|----------|-------|
| `title` | Yes | Shown as page heading and card title |
| `excerpt` | Yes | Shown on blog index card. 1–2 sentences. |
| `date` | Yes | Format: `YYYY-MM-DD` |
| `author` | Yes | Your name or team name |
| `tags` | No | List of topics. Used for filtering later. |

---

## Writing content

Everything below the second `---` is your article. Uses standard Markdown.

### Headings

```markdown
## Section heading
### Sub-section
```

Use `##` for main sections, `###` for sub-sections. Don't use `#` (that's the title, already rendered from frontmatter).

---

### Paragraphs

Just write text. Blank line between paragraphs.

```markdown
First paragraph here.

Second paragraph here.
```

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

Renders as a clean table with borders.

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

### Images

Place image files in `web/public/blog/`. Then reference them in your article:

```markdown
![Description of image](/blog/my-image.png)
```

**Supported formats:** `.png`, `.jpg`, `.gif`, `.webp`  
**Recommended width:** 1200px or wider for cover images, 800px+ for inline  
**File naming:** use dashes, no spaces (`my-chart-q1.png` not `my chart q1.png`)

To add an image, either:
- Ask a developer to add it to `web/public/blog/`
- Or if you have repo access: drop the file in `web/public/blog/` and commit it alongside your `.md` file

---

### Blockquotes

```markdown
> This is a highlighted quote or callout.
```

---

### Horizontal rule (section divider)

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
tags: ["performance", "architecture"]
---

Browser automation at scale is expensive. A single Chrome instance uses 150–300MB of RAM.
Run 100 in parallel and you're hemorrhaging memory before your app even starts.

## The problem

We profiled our early architecture and found this:

| Sessions | RAM (naive) | RAM (pooled) |
|----------|-------------|--------------|
| 10       | 2 GB        | 400 MB       |
| 50       | 12 GB       | 1.2 GB       |
| 100      | 28 GB       | 2.8 GB       |

## What we changed

Instead of one process per session, we share browser processes across isolated contexts.

```bash
# Each "session" is a lightweight context, not a full browser
claw session start --profile user-42
```

![Architecture diagram showing shared browser pool](/blog/pool-architecture.png)

## Result

**10x memory reduction.** Same isolation guarantees. No changes to the API your agents call.
```

---

## Checklist before publishing

- [ ] Frontmatter has `title`, `excerpt`, `date`, `author`
- [ ] Date is in `YYYY-MM-DD` format
- [ ] Filename uses dashes only, ends in `.md`
- [ ] Images are in `web/public/blog/` and paths start with `/blog/`
- [ ] Preview looks correct locally (`pnpm dev` then open `localhost:3000/blog`)

---

## Questions?

Ask a developer or open an issue in the GitHub repo.
