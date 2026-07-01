# License Notice

This specification is part of the Default Web project and is licensed under 
**Creative Commons Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0)**.

You are free to share, copy, and redistribute this specification in any medium or format, 
provided you give appropriate credit, provide a link to the license, and do **not** 
modify the content. 

For details, see: https://creativecommons.org/licenses/by-nd/4.0/

---

# CDOC Specification (Draft)

**Status:** Early draft — subject to change
**Document Type:** CDOC (Collage Document)

A **CDOC** is a static, 2D collage document. Like HDOCs, CDOCs cannot contain scripts and do not execute code. CDOCs support arbitrary SVG content, including images and text.

CDOCs may optionally include `<copy-info>` and `<connections>` sections, consistent with the shared conventions across all Default Web document types.

---

## Structure Overview

A CDOC has the following top-level structure:

```xml
<cdoc>
  <metadata>…</metadata>
  <fallback>…</fallback>
  <svg>…</svg>
  <copy-info>…</copy-info>
  <connections>…</connections>
</cdoc>
```

The only required sections are `<metadata>` and a single inline `<svg>` element.

---

# 1. `<metadata>` Section

The metadata format for CDOC is identical in spirit to HDOC metadata.

Example:

```xml
<metadata>
  <title>Title of my post</title>
</metadata>
```

### Rules

* `<metadata>` **must appear before** the `<svg>` section.
* `<title>` is optional but recommended.
* Additional metadata fields may be defined in future versions of the spec (e.g., authorship, timestamps, tags).

### 1.1 `<republishing-policy>` (optional)

Declares the author's policy regarding republishing this document. Has the same semantics as in HDOC (see HDOC specification, section 3.2).

```xml
<metadata>
  <title>Title of my post</title>
  <republishing-policy>allow</republishing-policy>
</metadata>
```

Allowed values: `allow` or `do-not-republish`. When absent, republishing is implicitly allowed.

---

# 2. Fallback

The `<fallback>` section is intended to contain HTML content shown to users who do not have compatible software to properly view the document.

Typically, this section includes a message explaining that special software (such as a browser extension or dedicated client) is required to view the document correctly, often with one or more hyperlinks. For this reason, raw HTML is allowed inside the `<fallback>` tags.

During parsing by a compliant client, the `<fallback>` element MUST be removed entirely before the document is processed as XML.

---

# 3. `<svg>` Section

All CDOC content is contained within a **single inline `<svg>` element**.

Example:

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
    ... collage content ...
</svg>
```

### Allowed Content

* Any valid SVG element is allowed.
* CDOCs may contain:

  * Images
  * Text
  * Shapes
  * Paths
  * Groups
  * Any other valid SVG constructs

### Script Restrictions

* **Scripts are forbidden.**
  No `<script>` tags or event-driven JavaScript are allowed.
* Inline event handlers (e.g., `onclick="…"`) are also forbidden.

### CSS and Classes

* Inline styles are allowed.
* Use of classes is allowed, but future versions of this spec may impose restrictions to ensure interoperability and consistent rendering across clients.

---


# 4. `<copy-info>` Section

The `<copy-info>` section follows the same principles as in HDOCs:

* It maps resources used inside the CDOC to stable external URLs.
* It may include mappings not only for images but also for URLs of embedded documents.

The detailed structure is defined in the shared `copy-info` spec (not yet final).

Example placeholder:

```xml
<copy-info>
  <!-- mapping entries go here -->
</copy-info>
```

---

# 5. `<connections>` Section

A CDOC may include a `<connections>` section that defines:

* Documents this CDOC connects to
* Floating links that visually bind one part of the collage to another document

The structure and format of `<connections>` is **identical** across:

* HDOC
* CDOC
* CONDOC

**See: CONNECTIONS specification.**

Inside CDOCs, floating link ends will typically include:

* **Point ends** (`p|x:…;y:…;r:…`) referencing positions in the collage.
* Optional text ends may become relevant when CDOCs contain textual overlays.

---

# Example CDOC

```xml
<cdoc>
  <metadata>
    <title>Title of my post</title>
  </metadata>

  <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
      <!-- collage content here -->
  </svg>

  <copy-info>
      <!-- optional -->
  </copy-info>

  <connections>
      <!-- optional -->
  </connections>
</cdoc>
```