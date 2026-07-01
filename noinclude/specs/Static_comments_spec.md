# License Notice

This specification is part of the Default Web project and is licensed under 
**Creative Commons Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0)**.

You are free to share, copy, and redistribute this specification in any medium or format, 
provided you give appropriate credit, provide a link to the license, and do **not** 
modify the content. 

For details, see: https://creativecommons.org/licenses/by-nd/4.0/

---

# Static Comments Specification (Draft)

**Status:** Early draft — subject to change

HDOCs and Embedded HDOCs may include a **comments section** displayed in a side panel. Comments are provided as a **JSON array**. The schema is based on the [WordPress Comments API](https://developer.wordpress.org/rest-api/reference/comments/), but it is **not limited to WordPress sites** and can be used on any website.

### Key Differences from WordPress

* **Comment ID (`id`)**: Unlike WordPress, the `id` in the Default Web context **can be either an integer or a string**, providing more flexibility for different backends.

### Future Extensions

* Additional fields may be added to support **visible connections** between a comment and specific text segments in the host document.

### Example (JSON structure)

```json
[
  {
    "id": "c1",
    "parent": 0,
    "author_name": "Alice",
    "author_email": "alice@example.com",
    "date": "2025-12-01T14:30:00Z",
    "content": "This is a comment.",
    "reply-url": "https://example.com/sw-comment-form/?post=19&parent_id=c1"
  },
  {
    "id": 2,
    "parent": 0,
    "author_name": "Bob",
    "author_email": "bob@example.com",
    "date": "2025-12-01T15:10:00Z",
    "content": "Another comment.",
    "reply-url": "https://example.com/sw-comment-form/?post=19&parent_id=2"
  }
]
```

* `id`: Unique identifier for the comment (integer or string). Must be present when `reply-url` is used, since the backend uses it to build the reply URL.
* `parent`: ID of the parent comment (integer or string), or `0` for a top-level comment.
* `author_name`: Name of the comment author.
* `author_email`: Email of the comment author.
* `date`: ISO 8601 timestamp of the comment.
* `content`: Comment text.
* `reply-url` (optional): Full URL of the comment form pre-configured to post a reply to this specific comment. The backend constructs the complete URL; the reader uses it as-is without modification. When absent, no Reply button is shown for that comment. When the document has commenting closed, `reply-url` is omitted from all comments.