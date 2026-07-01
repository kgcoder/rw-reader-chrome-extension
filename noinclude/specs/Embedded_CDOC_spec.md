# License Notice

This specification is part of the Default Web project and is licensed under 
**Creative Commons Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0)**.

You are free to share, copy, and redistribute this specification in any medium or format, 
provided you give appropriate credit, provide a link to the license, and do **not** 
modify the content. 

For details, see: https://creativecommons.org/licenses/by-nd/4.0/

---

# Embedded CDOC Specification (Draft)

**Status:** Early draft — subject to change
**Document Type:** Embedded CDOC (Embedded Collage Document)


An **Embedded CDOC** allows a CDOC to coexist inside a regular HTML page.
The goal is to serve **both the original HTML page and a CDOC from the same URL**, making content available to both ordinary visitors and CDOC-aware clients.

---

## 1. Overview

* **Purpose:** Embed CDOC content inside a standard HTML page without requiring a separate URL.
* **Behavior:** Ordinary visitors see the HTML page. CDOC-aware software extracts and renders the collage from the embedded JSON data.
* **Use Case:** Works with existing websites without duplicating content or using a separate URL.

---

## 2. Embedding Rules

### 2.1 CDOC JSON Data

A `<script>` tag with `type="application/json"` and `id="cdoc-source"` contains the CDOC source code as a JSON-encoded string.

Example:

```html
<script type="application/json" id="cdoc-source">
{
  "source": "<cdoc>\n\n<metadata>\n<title>My Collage</title>\n</metadata>\n\n<svg width=\"800\" height=\"600\" ...>...</svg>\n\n</cdoc>"
}
</script>
```

#### Fields:

* **source** (required): The complete source code of a standalone CDOC document, serialized as a JSON string.

---

### 2.2 The `source` Field

The value of `source` must be a valid standalone CDOC document — the same XML that would be served at a `.cdoc` URL. It is a string containing the full `<cdoc>…</cdoc>` XML.

A minimal example of what the `source` string contains (shown here unescaped for readability):

```xml
<cdoc>

<metadata>
<title>Collage Title</title>
</metadata>

<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <!-- SVG content -->
</svg>

<connections>
  <doc url="https://example.com/page" title="Page Title" hash="d79712">
i:769;l:256;h:ff3d6e;e:Vy4=_p|x:42.5;y:118.3;r:0.147
  </doc>
</connections>

</cdoc>
```

The CDOC structure inside `source` follows the standalone CDOC format:

* Root element: `<cdoc>`
* `<metadata>` (optional) — contains `<title>` and optionally `<republishing-policy>`
* `<svg>` (required) — the collage image; must have numeric `width` and `height` attributes
* `<connections>` (optional) — outgoing connections (same format as in HDOC)

The `<metadata>` block may include a `<republishing-policy>` tag with the value `allow` or `do-not-republish`. When absent, republishing is implicitly allowed. See the HDOC specification (section 3.2) for full semantics.

---

## 3. Client Detection

A client detects an Embedded CDOC by locating a `<script type="application/json" id="cdoc-source">` element in the HTML page, parsing its text content as JSON, and reading the `source` field.

Detection order when parsing an HTML page:

1. Check for Embedded HDOC (`id="hdoc-data"`).
2. If not found, check for Embedded CDOC (`id="cdoc-source"`).
3. If not found, check for Embedded CONDOC (`id="condoc-source"`).

---

## 4. Notes

* The `source` value is passed directly to the CDOC parser — it must be a valid CDOC document.
* The `<fallback>` element is stripped by the parser before XML parsing, consistent with standalone CDOC parsing rules.
* This format is **still a draft**; fields may be added in the future.
* The Embedded CDOC format allows a website to **maintain a single URL** while making a collage available to both HTML and CDOC-aware software.
