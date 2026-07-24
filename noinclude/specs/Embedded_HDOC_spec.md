# License Notice

This specification is part of the Default Web project and is licensed under 
**Creative Commons Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0)**.

You are free to share, copy, and redistribute this specification in any medium or format, 
provided you give appropriate credit, provide a link to the license, and do **not** 
modify the content. 

For details, see: https://creativecommons.org/licenses/by-nd/4.0/

---

# Embedded HDOC Specification (Draft)

**Status:** Early draft — subject to change
**Document Type:** Embedded HDOC (Embedded Hypertext Document)


An **Embedded HDOC** allows an HDOC to coexist inside a regular HTML page.
The goal is to serve **both the original HTML page and an HDOC from the same URL**, making content available to both ordinary visitors and HDOC-aware clients.

---

## 1. Overview

* **Purpose:** Embed HDOC content inside a standard HTML page without requiring a separate URL.
* **Behavior:** Ordinary visitors see the HTML page. HDOC-aware software constructs an HDOC from the HTML and JSON data.
* **Use Case:** Works with existing websites, e.g., WordPress pages, without duplicating content.

---

## 2. Embedding Rules

### 2.1 Marking the HTML Content

The element containing the main visible content of the page **must** have the class:

```html
class="hdoc-content"
```

This signals to client apps which element to extract.

---

### 2.2 HDOC JSON Data

A `<script>` tag with `type="application/json"` and `id="hdoc-data"` contains all additional information needed to construct the HDOC.

Example:

```html
<script type="application/json" id="hdoc-data">
{
  "lang": "en",
  "forced": true,
  "removal-selectors": ".some-class,.other-class",
  "header": {
    "h1": "The Title",
    "author": "John Doe",
    "date": "October 13, 2025"
  },
  "panels": { ... },
  "connections": [ ... ]
}
</script>
```

#### Fields:

* **lang** (optional): IETF language tag (e.g. `"en"`, `"ar"`) identifying the primary language of the document. Clients use this to set text direction (LTR/RTL) and other locale-sensitive rendering.
* **forced** (optional): Boolean. When `true`, HDOC-aware clients should always render the page as an HDOC, including when it is opened directly as the main document. When absent or `false`, the client shows the original HTML page to direct visitors and uses the embedded HDOC only when the page is loaded as a connected document.
* **removal-selectors** (optional): CSS selectors to remove unwanted elements from the content.
* **header** (optional):

  * `h1`: Page title
  * `author`: Author name
  * `date`: Publication date
* **panels** (optional): Defines top, sidebar, comments, and bottom panels for standardized UI (see HDOC panels spec). Also accepts the deprecated `side` field (see §2.3) for backward compatibility.
* **connections** (optional): Array of connection objects (see specification at `specs/connections.md`).
* **republishing-policy** (optional): Republishing policy for the document. Allowed values: `"allow"` or `"do-not-republish"`. When present, the client inserts `<republishing-policy>{value}</republishing-policy>` inside the `<metadata>` block of the reconstructed HDOC XML. When absent, no tag is included (implicitly allowed). See the HDOC specification (section 3.2) for full semantics.

---

### 2.3 Panels JSON Structure

Example:

```json
"panels": {
  "top": {
    "site-name": "My website",
    "home-url": "https://example.com",
    "site-logo": "https://example.com/icon.png",
    "links": [
      { "href": "https://example.com/archive", "text": "Archive" }
    ]
  },
  "post-nav": {
    "prev": { "href": "https://example.com/older-post/", "title": "Older Post Title" },
    "next": { "href": "https://example.com/newer-post/", "title": "Newer Post Title" }
  },
  "sidebar": {
    "side": "right",
    "items": [
      {
        "type": "search",
        "action": "https://example.com/?s=%s",
        "placeholder": "Search…",
        "target": "_self"
      },
      {
        "type": "links",
        "title": "Popular Posts",
        "items": [
          { "href": "https://example.com/post-slug/", "text": "Post Title" },
          { "href": "https://example.com/another/", "text": "Another Post", "target": "_blank", "rel": "noopener" }
        ]
      },
      {
        "type": "recent-comments",
        "title": "Recent Comments",
        "format": "{author} on {post}",
        "comments": [
          { "post-href": "https://example.com/post-slug/", "post-title": "Post Title", "author": "Jane", "excerpt": "Comment excerpt…" }
        ]
      }
    ]
  },
  "comments": {
    "url": "http://example.com/json-comments/?post=19",
    "title": "Comments",
    "empty": "No comments yet",
    "leave-comment-url": "http://example.com/sw-comment-form/?post=19",
    "reply-label": "Reply",
    "leave-comment-label": "Leave a comment"
  },
  "bottom": {
    "sections": [
      {
        "title": "Section 1",
        "links": [{ "href": "https://example.com/about", "text": "About us" }]
      },
      {
        "title": "Section 2",
        "links": [{ "href": "https://example.com/contacts", "text": "Contacts" }]
      }
    ],
    "bottom-message": "This is a bottom message"
  }
}
```

**`post-nav` fields:**

| Field | Type | Description |
|-------|------|-------------|
| `post-nav.prev` | object | `{ href, title }` — omit if no previous post |
| `post-nav.next` | object | `{ href, title }` — omit if no next post |

**`sidebar` fields:**

| Field | Type | Description |
|-------|------|-------------|
| `sidebar.side` | string | `"left"` or `"right"` (default `"right"`) |
| `sidebar.items[]` | array | Ordered list of sidebar widgets; multiple items of the same type are allowed |
| `sidebar.items[].type` | string | `"search"`, `"links"`, or `"recent-comments"` |
| `sidebar.items[].action` | string | *(type=search)* URL template; `%s` replaced with URL-encoded search term |
| `sidebar.items[].placeholder` | string | *(type=search)* Optional input hint text |
| `sidebar.items[].target` | string | *(type=search)* `"_self"` (default) or `"_blank"` |
| `sidebar.items[].title` | string | *(type=links / recent-comments)* Optional section heading |
| `sidebar.items[].items[]` | array | *(type=links)* Each: `{ href, text, target?, rel? }` |
| `sidebar.items[].format` | string | *(type=recent-comments)* Template for each item; default `"{author} on {post}"`. Placeholders: `{author}`, `{post}` |
| `sidebar.items[].comments[]` | array | *(type=recent-comments)* Each: `{ post-href, post-title, author, excerpt? }` |

**`comments` fields** (corresponds to the HDOC `<comments>` panel, §7.3 of the HDOC spec — a direct sibling of `top`/`post-nav`/`sidebar`/`bottom`, not nested inside `side`):

| Field | Type | Description |
|-------|------|-------------|
| `comments.url` | string | URL of a static-comments JSON array (see Static Comments Specification) |
| `comments.title` | string | Optional section heading |
| `comments.empty` | string | Optional message shown when there are no comments |
| `comments.leave-comment-url` | string | Optional URL of the comment submission form. When absent, all posting UI is hidden (read-only); existing comments are still shown |
| `comments.reply-label` | string | Optional label for the per-comment Reply button. Used only when `leave-comment-url` is present |
| `comments.leave-comment-label` | string | Optional label for the section-level Leave a comment button. Used only when `leave-comment-url` is present |

**`side` field (deprecated):** older embedded HDOCs may instead carry a `side` object (`{ ipage, comments: {...} }`, the same `comments` shape as above) in place of the top-level `comments` field. This form is deprecated — superseded by the top-level `comments` field — and kept only so clients can keep rendering older documents. `side.ipage` has no equivalent in the new form and is no longer supported going forward. This section will be removed in a future revision of this spec.

---

### 2.4 Connections JSON Structure

Embedded HDOC connections follow the same structure as HDOC floating links:

```json
"connections": [
  {
    "url": "https://example.com/dates",
    "title": "Dates",
    "hash": "d79712",
    "flinks": [
      "i:769;l:256;h:ff3d6e;e:Vy4=_i:0;l:8;h:e68ee0;e:RXM=",
      "i:1278;l:16;h:512358;e:THM=_i:35;l:11;h:1e5fac;e:Y3M="
    ]
  },
  {
    "url": "https://example.com/collage",
    "title": "Collage",
    "hash": "54dfa4",
    "flinks": [
      "i:2029;l:97;h:72bcf5;e:RS4=_p|x:79.772;y:142.467;r:0.147",
      "i:2423;l:79;h:7f7a20;e:Qi4=_p|x:81.226;y:142.1;r:0.147"
    ]
  }
]
```

---

## 3. Notes

* Clients must extract content from `.hdoc-content` and parse the JSON to build an HDOC.
* `document.title` is used automatically if `header.h1` is not provided.
* This format is **still a draft**; fields may be added in the future.
* The Embedded HDOC format allows a website to **maintain a single URL** while making content available to both HTML and HDOC-aware software.