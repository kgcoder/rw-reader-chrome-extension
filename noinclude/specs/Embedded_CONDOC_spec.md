# License Notice

This specification is part of the Default Web project and is licensed under 
**Creative Commons Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0)**.

You are free to share, copy, and redistribute this specification in any medium or format, 
provided you give appropriate credit, provide a link to the license, and do **not** 
modify the content. 

For details, see: https://creativecommons.org/licenses/by-nd/4.0/

---

# Embedded CONDOC Specification (Draft)

**Status:** Early draft — subject to change
**Document Type:** Embedded CONDOC (Embedded Connection Document)


An **Embedded CONDOC** allows a CONDOC to coexist inside a regular HTML page.
The goal is to serve **both the original HTML page and a CONDOC from the same URL**, making content available to both ordinary visitors and CONDOC-aware clients.

---

## 1. Overview

* **Purpose:** Embed CONDOC content inside a standard HTML page without requiring a separate URL.
* **Behavior:** Ordinary visitors see the HTML page. CONDOC-aware software extracts the connection document from the embedded JSON data.
* **Use Case:** Allows any page to annotate a third-party URL with connections without creating a separate `.condoc` file.

---

## 2. Embedding Rules

### 2.1 CONDOC JSON Data

A `<script>` tag with `type="application/json"` and `id="condoc-source"` contains the CONDOC source code as a JSON-encoded string.

Example:

```html
<script type="application/json" id="condoc-source">
{
  "source": "<condoc>\n\n<title>My Connections</title>\n\n<main>https://example.com/some-article</main>\n\n</condoc>"
}
</script>
```

#### Fields:

* **source** (required): The complete source code of a standalone CONDOC document, serialized as a JSON string.

---

### 2.2 The `source` Field

The value of `source` must be a valid standalone CONDOC document — the same XML that would be served at a `.condoc` URL. It is a string containing the full `<condoc>…</condoc>` XML.

A minimal example of what the `source` string contains (shown here unescaped for readability):

```xml
<condoc>

<title>Connection Title</title>

<description>Optional description of this connection document.</description>

<main>https://example.com/some-external-article</main>

<connections>
  <doc url="https://example.com/related-page" title="Related Page">
i:12;l:44;h:ff3d6e;e:Vy4=_p|x:42.5;y:118.3;r:0.147
  </doc>
</connections>

</condoc>
```

The CONDOC structure inside `source` follows the standalone CONDOC format:

* Root element: `<condoc>`
* `<title>` (optional) — plain-text title of this connection document
* `<description>` (optional) — plain-text description
* `<main>` (required) — URL of the external document to load as the main (left-panel) document
* `<connections>` (optional) — outgoing connections linking anchors in the main document to pages on the right

---

## 3. Client Detection

A client detects an Embedded CONDOC by locating a `<script type="application/json" id="condoc-source">` element in the HTML page, parsing its text content as JSON, and reading the `source` field.

Detection order when parsing an HTML page:

1. Check for Embedded HDOC (`id="hdoc-data"`).
2. If not found, check for Embedded CDOC (`id="cdoc-source"`).
3. If not found, check for Embedded CONDOC (`id="condoc-source"`).

---

## 4. Notes

* The `source` value is passed directly to the CONDOC parser — it must be a valid CONDOC document.
* The `<fallback>` element is stripped by the parser before XML parsing, consistent with standalone CONDOC parsing rules.
* The `<main>` element is required; if absent or empty, the client will reject the document.
* This format is **still a draft**; fields may be added in the future.
* The Embedded CONDOC format allows a website to **maintain a single URL** while making connection annotations available to both HTML and CONDOC-aware software.
