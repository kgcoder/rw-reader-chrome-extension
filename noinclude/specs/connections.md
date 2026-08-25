# License Notice

This specification is part of the Reader's Web project and is licensed under 
**Creative Commons Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0)**.

You are free to share, copy, and redistribute this specification in any medium or format, 
provided you give appropriate credit, provide a link to the license, and do **not** 
modify the content. 

For details, see: https://creativecommons.org/licenses/by-nd/4.0/

---

# Connections Specification (Draft)

**Status:** Early draft — subject to change

Documents of types **HDOC**, **CDOC**, and **CONDOC** may include a `<connections>` section. This section defines a set of outbound connections from the current document to other documents, along with optional *floating links* that visually anchor the connection to specific locations (text ranges, points, coordinates, etc.).

A `<connections>` section contains one or more `<doc>` elements.

---

## `<doc>` Element

Represents a document that this document connects to.

**Attributes**

| Attribute | Required | Description                                                                                              |
| --------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `url`     | Yes      | URL of the connected document.                                                                           |
| `title`   | No       | Title of the connected document (informational only).                                                    |
| `hash`    | No       | SHA-256 hash of the connected document’s content. Used to detect whether floating links may be outdated. |

**Hashing rules:**

* **HDOC:** Hash is computed over the `textContent` of the HDOC, *not* its HTML serialization.
  (Whitespace and markup differences must not shift indices.)
* **CDOC:** Hash is computed over the entire `<svg>` element, including the `<svg>` tag itself.

**Hash verification:**
Hash generation is implemented in current tooling but verification on load is not yet required. Future client implementations *should* verify the hash and mark connections as potentially outdated if the hash does not match.

---

## Floating Links

A `<doc>` element may contain zero or more floating links.
Each floating link is a **single line of text** composed of **two ends**, separated by an underscore `_`.

**Example:**

```
i:6771;l:22;h:abb7b7;e:MjE=_i:35;l:22
```

Floating links bind a specific part of the current document to a specific part of the connected document.

A floating link must consist of:

```
<endA>_<endB>
```

Each *end* may be:

* a **text end** (HDOC)
* a **point end** (CDOC)
* (future) other end types such as rectangular regions, image-relative targets, 3D coordinates, Xanalinks, etc.

The type of end used is determined by the document type:

* HDOCs: use **text ends**.
* CDOCs: use **point ends** (current spec) and will support additional shapes later.

Point-to-point links between two collages are not yet supported.

---

# End Types

## 1. Text End

Text ends reference character ranges in HDOCs.

**General form:**

```
t|i:<index>;l:<length>;h:<hash>;e:<ends>
```

The `t|` prefix is optional. Most text ends appear without it:

```
i:47703;l:33;h:c85272;e:QTI=
```

### Fields

| Field | Required | Description                                                                    |
| ----- | -------- | ------------------------------------------------------------------------------ |
| `i`   | Yes      | Index of the first highlighted character.                                      |
| `l`   | Yes      | Length of the highlighted segment.                                             |
| `h`   | Yes      | SHA-256 hash of the *hashed range* (not necessarily the highlight range).      |
| `hi`  | No       | Index of hashed range (if different from `i`).                                 |
| `hl`  | No       | Length of hashed range (if different from `l`).                                |
| `e`   | Yes*     | First and last character of the hashed range, concatenated and Base64-encoded. |

*`e` may be omitted under certain conditions (see below).

### Purpose of Hashes

Hashes exist to allow client software to **repair broken links** when text changes.

Clients may scan the document for a substring whose hash matches the one stored in the link. When a highlighted segment is not unique or too short, the hashing range expands.

### Hashing rules

* Hashes are created for unique text segments ≥10 characters when possible.
  (The 10-character threshold is tooling-specific, not a required standard.)
* If the highlighted text is not unique or too short, the hashed range expands, typically extending left.
* When the highlight is unique and ≥10 chars, `hi` and `hl` can be omitted because the hashed range equals the highlighted range.

### Omission rules

* For text-to-text links, if both ends have identical hashes, the second hash may be omitted.
* If the hashed-range ends (`e`) are the same for both ends, the second `e` may also be omitted.
* If both conditions hold, the second end may be reduced to as little as `i:<index>;l:<length>`.

### Why store hashed range endpoints (`e`)

Without `e`, repairing broken links may require testing thousands of possible positions.
With endpoints, the repair process becomes nearly instantaneous with large documents.

---

## 2. Point End

Used in **CDOCs** (collages) today, and will be used in **SDOCs** (3D scenes) in the future.

**Format:**

```
p|x:<float>;y:<float>;r:<float>
```

| Field    | Description                             |
| -------- | --------------------------------------- |
| `x`, `y` | Absolute 2D coordinates in the collage. |
| `r`      | Radius of the visible marker.           |

This marks a precise location on an image or collage element.

---

# Future Extensions (Non-normative)

The CONNECTIONS format is intentionally extensible. Possible future additions:

* **Multiple ends per link**, enabling one annotation to reference several places.
* **Link types** (reference, commentary, correction, annotation-only, etc.).
* **Additional CDOC targets** such as rectangle regions, overlays, or text items.
* **Image-relative coordinates**, so links survive layout changes.
* **3D point ends** for SDOCs.
* **Xanalinks**, a more advanced end type used when an HDOC includes an `<edl>` section and supports stable content addressing.
  Xanalinks may be combined with any other end type.

---

# Example

```xml
<hdoc>
  <content>
    Content of the document...
  </content>

  <connections>

    <doc url="https://example.com/dates" title="Dates" hash="d79712">
      i:6771;l:22;h:abb7b7;e:MjE=_i:35;l:22
      i:7494;l:34;h:7ac799;e:TzI=_i:59;l:28;h:3fa088
      i:47703;l:33;h:c85272;e:QTI=_i:116;l:27;h:8de52f
    </doc>

    <doc url="https://example.com/collage" title="Collage" hash="54dfa4">
      i:611629;l:149;h:f01591;e:VGw=_p|x:31.166;y:209.243;r:0.297
      i:238781;hi:238774;l:12;hl:19;h:858f4c;e:dmE=_p|x:45.462;y:218.567;r:0.209
    </doc>

  </connections>
</hdoc>
```