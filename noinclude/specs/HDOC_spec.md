# License Notice

This specification is part of the Default Web project and is licensed under 
**Creative Commons Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0)**.

You are free to share, copy, and redistribute this specification in any medium or format, 
provided you give appropriate credit, provide a link to the license, and do **not** 
modify the content. 

For details, see: https://creativecommons.org/licenses/by-nd/4.0/

---

# HDOC Specification (Draft)

**Status:** Early draft — subject to change
**Document Type:** HDOC (Hypertext Document)

HDOC is a static, script-free hypertext document format designed for the Default Web.
It provides predictable rendering, visible connections, and long-term stability.
This specification defines the structure, required/optional components, and parsing rules for HDOC documents.

---

# 1. Overview

HDOC is an XML-based document format that may contain an embedded HTML fragment.
The key goals of the format are:

* **Static** — No JavaScript; no inline or custom CSS.
* **Standardized** — All clients render HDOCs consistently.
* **Interoperable** — Visible connections, comments, panels, and metadata behave identically across clients.
* **Self-contained** — No dependencies except images and iframes referenced inside content.

An HDOC represents one hypertext document.
It may optionally reference:

* a paired interactive HTML page,
* a JSON comments document,
* parent/origin documents (when the HDOC is a copy),
* media remappings (when copied),
* outgoing connections (via the shared *Connections* format).

---

# 2. Root Structure

The root element of every HDOC is:

```xml
<hdoc lang="en"> … </hdoc>
```

### `lang` attribute (optional)

An IETF language tag (e.g. `"en"`, `"ar"`, `"he"`, `"fr"`) identifying the primary language of the document. Clients use this to set text direction (LTR/RTL) and may use it for font selection, hyphenation, and other locale-sensitive rendering. When absent, clients should fall back to their own default or detect language from context.

Children (in this order):

1. `<metadata>` (optional)
2. `<header>` (optional)
3. `<fallback>` (optional)
4. `<content>` (required)
5. `<panels>` (optional)
6. `<copy-info>` (optional; required only for copies)
7. `<connections>` (optional; defined in a separate specification)

Any additional elements are **invalid**.

---

# 3. Metadata

The metadata section functions similarly to the `<head>` section in HTML.

```xml
<metadata>
    <title>Visible title here</title>
    <!-- more metadata types may be added later -->
</metadata>
```

## 3.1 `<title>` (optional, but strongly recommended)

Contains the document’s title in plain text.
Client software may display this in browser UI, tabs, link previews, etc.

---

## 3.2 `<republishing-policy>` (optional)

Declares the author’s policy regarding republishing this document.

**Republishing** means copying an existing HDOC or CDOC and hosting it at a new URL — typically to create a stable snapshot so that visible connections to that document never break due to the original being updated, moved or deleted.

```xml
<republishing-policy>allow</republishing-policy>
```

or

```xml
<republishing-policy>do-not-republish</republishing-policy>
```

Allowed values:

* `allow` — the author explicitly permits republishing.
* `do-not-republish` — the author explicitly prohibits republishing.

When this tag is **absent**, republishing is **implicitly allowed** by default. Using HDOC or CDOC formats is understood as consent to the republishing mechanism that keeps visible connections stable.

---

# 4. Header

The `<header>` section contains **visible metadata** intended for display, such as title, author, and date.
It is optional, but recommended for human-readable documents.

```xml
<header>
    <h1>Visible Title</h1>
    <author>Author Name</author>
    <date>2025-10-15</date>
</header>
```

Rules:

* `<h1>` content **must be plain text only**. Any HTML inside must be stripped.
* Clients may choose which header fields to show.
* Additional header fields may be added in future versions.

If the header is omitted, the title *may* appear inside `<content>`, but this is discouraged because updates may break floating links.

---

# 5. Fallback

The `<fallback>` section is intended to contain HTML content shown to users who do not have compatible software to properly view the document.

Typically, this section includes a message explaining that special software (such as a browser extension or dedicated client) is required to view the document correctly, often with one or more hyperlinks. For this reason, raw HTML is allowed inside the `<fallback>` tags.

During parsing by a compliant client, the `<fallback>` element MUST be removed entirely before the document is processed as XML.

---

# 6. Content

The `<content>` element contains the **HTML** or plain text content of the document.

```xml
<content><p>This is a paragraph.</p></content>
```

### Requirements:

* HTML begins **immediately after the opening tag**, with no indentation or whitespace before the first element (recommended for compatibility).
* HTML must not contain:

  * `<script>` tags
  * `<style>` tags
  * inline styles
  * custom CSS classes
* Only predefined CSS classes (from a global default list) may be used.

All HTML appears **only** inside `<content>`.
The rest of the HDOC is XML.

Parsing note:
Clients must extract the HTML block from `<content>` using a **regular expression** before parsing the XML (details below).

* `<content>` may include `type="text"`.
* When `type="text"`, the content must be treated as *literal plain text*.
* Before rendering, the content must be **escaped**, so any HTML inside is shown as source code, not interpreted.

---

# 7. Panels

The `<panels>` section defines standardized UI panels that appear in all clients.
It may contain six types of panels: `<top>`, `<post-nav>`, `<sidebar>`, `<comments>`, `<side>` (**deprecated**, see §7.4), and `<bottom>`.

```xml
<panels>
    <top>…</top>
    <post-nav>…</post-nav>
    <sidebar>…</sidebar>
    <comments>…</comments>
    <bottom>…</bottom>
</panels>
```

All panels are **optional**.

---

## 7.1 `<top>` Panel

Contains branding and navigation links.

Allowed child elements:

### 7.1.1 `<site-name>`

```xml
<site-name href="https://example.com">My Site</site-name>
```

* Either `<site-name>` **or** `<logo>` may be used (not both).

### 7.1.2 `<logo>`

```xml
<logo src="https://example.com/logo.png" href="https://example.com"/>
```

Attributes:

* `src` (required) — image URL
* `href` (optional)

### 7.1.3 `<a>`

```xml
<a href="https://example.com/about">About</a>
```

Multiple allowed.

---

## 7.2 `<post-nav>` Panel

Previous/next post navigation.

```xml
<post-nav>
    <prev href="https://example.com/older-post/">Older Post Title</prev>
    <next href="https://example.com/newer-post/">Newer Post Title</next>
</post-nav>
```

Child elements:

* `<prev href="…">` — link to the previous (older) post. Text content is the post title. Omit if no previous post exists.
* `<next href="…">` — link to the next (newer) post. Text content is the post title. Omit if no next post exists.

---

## 7.3 `<comments>` Panel

Contains the document's comment thread.

```xml
<comments
    title="Comments"
    empty="No comments yet"
    leave-comment-url="https://example.com/sw-comment-form/?post=19"
    reply-label="Reply"
    leave-comment-label="Leave a comment"
>https://…/comments.json</comments>
```

Attributes:

* `title` (optional)
* `empty` (optional) — message shown when there are no comments
* `leave-comment-url` (optional) — URL of the comment submission form for posting a top-level comment on this document. When absent, all posting UI ("Leave a comment" button and all "Reply" buttons) is hidden and the section is read-only. Existing comments are still displayed regardless.
* `reply-label` (optional) — label for the per-comment Reply button (e.g. `"Reply"`). Used only when `leave-comment-url` is present.
* `leave-comment-label` (optional) — label for the section-level Leave a comment button (e.g. `"Leave a comment"`). Used only when `leave-comment-url` is present.

Content:

* URL of a static-comments JSON array (see Static Comments Specification)

`<comments>` is a direct child of `<panels>` (a sibling of `<top>`, `<post-nav>`, `<sidebar>`, and `<bottom>`). It supersedes the deprecated `<side><comments>…</comments></side>` form described below.

---

## 7.4 `<side>` Panel (deprecated)

**Deprecated** — superseded by the `<comments>` panel (§7.3). Clients should treat this section as informational only, for understanding older documents; new documents should use `<comments>` directly under `<panels>` instead. This section will be removed in a future revision of this spec.

Contains comments or an interactive page.

```xml
<side> … </side>
```

### Child elements:

#### 7.4.1 `<comments>`

Same attributes and content as the `<comments>` panel described in §7.3, but nested inside `<side>` instead of being a direct child of `<panels>`.

#### 7.4.2 `<ipage>`

URL of an interactive HTML page displayed in the side panel.

```xml
<ipage>https://…/interactive</ipage>
```

---

## 7.5 `<bottom>` Panel

```xml
<bottom>
    <section title="About">
        <a href="https://example.com/me">About Me</a>
    </section>
    <bottom-message>All rights reserved 2025</bottom-message>
</bottom>
```

Child elements:

### 7.5.1 `<section>`

Attributes:

* `title` (optional)

Contains multiple `<a>` elements.

### 7.5.2 `<bottom-message>`

Contains plain text.

---

## 7.6 `<sidebar>` Panel

A persistent visible column displayed alongside the document content. Unlike `<comments>` (which is opened on demand via a button), the sidebar is visible on page load.

```xml
<sidebar side="right">
    <search action="https://example.com/?s=%s" placeholder="Search…" target="_self"/>
    <links title="Popular Posts">
        <a href="https://example.com/post-slug/">Post Title</a>
        <a href="https://example.com/another-post/" target="_blank" rel="noopener">Another Post</a>
    </links>
    <recent-comments title="Recent Comments" format="{author} on {post}">
    <comment post-href="https://example.com/post-slug/" post-title="Post Title" author="Jane" excerpt="Comment excerpt…"/>
</recent-comments>
</sidebar>
```

**Attributes:**

* `side` (optional) — `"left"` or `"right"` (default: `"right"`). Preferred placement when space allows.

**Display behavior:**

* When sufficient horizontal space is available (full-width view), the sidebar is rendered as a column on the preferred side of the main content.
* When space is insufficient (narrow view, split-screen mode) or when the `<comments>` panel is open, the sidebar content flows to the bottom, below the main content and above the `<bottom>` panel.
* All child sections are optional.

### 7.6.1 `<search>`

Renders a search input.

```xml
<search action="https://example.com/?s=%s" placeholder="Search…" target="_self"/>
```

Attributes:

* `action` (required) — URL template. The client replaces `%s` with the URL-encoded search term before navigating.
* `placeholder` (optional) — hint text shown inside the input field.
* `target` (optional) — where to open the search results page. Accepts `"_self"` (default, same tab) or `"_blank"` (new tab).

### 7.6.2 `<links>`

A titled list of arbitrary links. Multiple `<links>` blocks are allowed.

```xml
<links title="Popular Posts">
    <a href="https://example.com/post-slug/">Post Title</a>
    <a href="https://example.com/another-post/" target="_blank" rel="noopener">Another Post</a>
</links>
```

Attributes on `<links>`:

* `title` (optional) — section heading.

Attributes on each `<a>`:

* `href` (required) — destination URL.
* `target` (optional) — where to open the link (`"_self"`, `"_blank"`, etc.).
* `rel` (optional) — link relationship (e.g. `"noopener"`, `"nofollow"`).

Text content of each `<a>` is the link label.

### 7.6.3 `<recent-comments>`

A list of recent comments across the site.

```xml
<recent-comments title="Recent Comments" format="{author} on {post}">
    <comment post-href="https://example.com/post-slug/" post-title="Post Title" author="Jane" excerpt="Comment excerpt…"/>
</recent-comments>
```

Attributes on `<recent-comments>`:

* `title` (optional) — section heading.
* `format` (optional) — template string for rendering each item. Default: `"{author} on {post}"`. Placeholders: `{author}` (commenter name) and `{post}` (post title, linked to `post-href`). Reorder freely to suit any language: e.g. `"{post} · {author}"` or `"{post}に{author}がコメント"`.

Attributes on each `<comment>`:

* `post-href` (required) — URL of the post the comment belongs to.
* `post-title` (required) — title of the post.
* `author` (required) — display name of the commenter.
* `excerpt` (optional) — short excerpt of the comment text.

---

# 8. Copy Info

`<copy-info>` is used only when the HDOC is a copy of another HDOC.
In that case, this section becomes **required**.

```xml
<!-- direct copy of the original -->
<copy-info original="https://example.com/original" copied-at="2025-01-01T12:00:00Z">
    <media-mappings>…</media-mappings>
</copy-info>

<!-- copy of a copy -->
<copy-info original="https://example.com/original" copied-at="2025-01-01T12:00:00Z">
    <via copied-at="2025-06-01T09:00:00Z">https://mirror.com/copy1</via>
    <media-mappings>…</media-mappings>
</copy-info>
```

Attributes of `<copy-info>`:

* `original` (required): URL of the true original document
* `copied-at` (required): ISO-8601 timestamp of when the **first copy** in the chain was made — the oldest date in the log

---

## 8.1 `<via>` (optional, repeatable)

Each `<via>` entry records an intermediate copy in the chain, in ascending chronological order. The last `<via>` is the copy the current document was directly copied from.

Attributes:

* `copied-at` (required): ISO-8601 timestamp of when that copy was made

Content: the URL of that intermediate copy.

**How to extend the chain when copying a copy:** take the existing `<copy-info>` as-is, then append a new `<via copied-at="today">` with the URL you copied from and today's date. Never modify the existing `copied-at` attribute on `<copy-info>`.

---

## 8.2 `<media-mappings>` (optional)

Contains URL rewriting rules for media resources (images, audio, video, etc.) embedded in the content. Use this when the copy hosts media files locally instead of loading them from the original server.

Each `<mapping>` rule is applied as a **prefix replacement**: any resource URL that starts with `from` has that prefix replaced with `to`. A full URL in `from` acts as an exact match.

```xml
<media-mappings>
    <mapping from="https://example.com/media/" to="https://copy.com/media/" />
    <mapping from="https://cdn.example.com/img.jpg" to="https://copy.com/img.jpg" />
</media-mappings>
```

Rules are applied in order; the first match wins.

---

# 9. Connections

Connections are defined using the shared *Connections* format.
They may appear in HDOC, CDOC, CONDOC documents.

```xml
<connections> … </connections>
```

Specification: `specs/connections.md` (not included here)

---

# 10. Parsing Rules for HDOC Documents

An HDOC document contains a mixture of:
* XML — used for all structural elements
* HTML — allowed only inside the `<content>` and `<fallback>` elements

To prevent embedded HTML from interfering with XML parsing, compliant clients MUST process HDOC documents using the following steps, in order:

### Step 1: Remove `<fallback>` element (if present)

The `<fallback>` element exists solely to provide alternative content for environments that do not support the HDOC format. It commonly contains raw HTML that may break XML parsing.

Before any XML parsing occurs, the `<fallback>` element and all of its contents MUST be removed entirely.

### Step 2: Strip HTML from `<h1>`

If the `<h1>` element contains HTML markup, all tags MUST be removed, and only the resulting plain text content MUST be preserved.

### Step 3: Extract the HTML block from `<content>`

The `<content>` element typically contains raw HTML. This HTML MUST be extracted as a string (for example, using a regular expression or equivalent mechanism) and stored separately before XML parsing.

### Step 4: Parse the remaining document as XML

After the `<fallback>` element has been removed and the `<content>` HTML has been extracted, the remaining document MUST be parsed as XML.

### Step 5: Sanitize the HTML found in `<content>`

The HTML extracted from `<content>` MUST be sanitized according to the client’s security model before rendering.

---

# 11. Future Additions

Future versions of HDOC may add:

* `<footer>` element
* Additional metadata fields
* More structured header fields
* Standardized themes and CSS class lists
* More copy-tracking capabilities

Everything in this document is subject to change during the draft phase.