---
name: query-concert-stats-search
description: Resolve song, producer, series, and character names to catalogue entries with GET /api/v1/search and /api/v1/filters.json before answering a concert-stats question. Use whenever a query names a song, producer, series, or character and you need the id, the canonical title, or the exact character name; also use it to decide what to do when nothing matches.
---

# Search and id resolution

Base URL: `https://miku-concert-stats.rjiazhen.top`

## `GET /api/v1/filters.json`

Valid series ids, character names, producer names, and the catalogue year range. Read it before building a filtered request, and never guess a series id, character name, or producer name.

## `GET /api/v1/search?q=<text>`

`q` is 1–80 characters. Song titles match the original, Japanese, English, and Chinese names; producers and series match their names as a case-insensitive substring. Optional `type=songs|producers|series` (default `all`) and `limit` (default 10, maximum 25).

Encode `q` before sending it. Raw Japanese or Chinese in the query string gets **400 with an empty body** from the CDN, before this endpoint runs — that is an encoding failure, not "no match". Use `?q=%E3%83%A1%E3%83%AB%E3%83%88`, `curl -G --data-urlencode 'q=メルト' https://miku-concert-stats.rjiazhen.top/api/v1/search`, or an ASCII title (`?q=Melt`; the encoded Chinese title works the same way). The row that comes back tells you which title matched through `name` / `nameEn` / `nameZh`.

```json
{
  "query": "melt",
  "type": "all",
  "counts": { "songs": 6, "producers": 0, "series": 0 },
  "songs": [
    {
      "id": 1322,
      "name": "メルト",
      "nameZh": "融化",
      "producer": "ryo",
      "characters": ["初音ミク"],
      "showCount": 90,
      "eventCount": 61,
      "firstYear": 2010,
      "approximate": false,
      "url": "https://miku-concert-stats.rjiazhen.top/songs/1322"
    }
  ],
  "producers": [],
  "series": []
}
```

Songs are ordered exact title first, then prefix, then substring; popularity breaks ties. If several different songs match and none is an exact title match, name the candidates and ask which one the user means.

Search matches `nameZh` and the Chinese aliases recorded for it, but every response carries only the canonical `nameZh` — read that field for the title you show. Traditional-character spellings and translations nobody has recorded are not indexed: when such a query returns no song, retry once with the primary Chinese title or the original/Japanese name before telling the user the catalogue has no record of it.

## Ids are this catalogue's own

Ids follow VocaDB where a matching entry exists, but a local entry can carry a reserved id instead, so never assume an id is valid on VocaDB.

- Series ids of `900000000` and above are local placeholders for one-off lives with no VocaDB series (ミクFES, 夏祭初音鑑, GALAXY LIVE, …).
- Songs and 演出 can likewise use a local id when VocaDB has no entry.
- Never build an id yourself; take it from `search`, `filters.json`, or a payload you already received.
- Never print an id in prose. Say the work's name; an id may appear only inside a link target.

## How to answer with it

1. Search once with the name the user gave you. If they used a Chinese alias, search that wording first; the API already indexes registered aliases.
2. When two plausible songs come back, name both (in the user's language) and ask which one they mean instead of picking silently.
3. When nothing matches and the wording may be traditional characters, an unrecorded translation, or an English rendering, retry once with the original/Japanese title or `type=songs`.
4. Still nothing: say the catalogue has no record of it, then answer what you can from other sources, marked as outside the catalogue.

## Common mistakes

- Sending raw Japanese or Chinese in `q`; the CDN rejects the URI with an empty `400` before the search code sees the query. Encode it or search `nameEn` / `nameZh`.
- Reading that empty `400` as "no such song" and switching to a web search. It is an encoding failure; retry encoded once before concluding anything.
- Reporting a search result count as "how many times it was performed" — `counts.songs` is the number of matching songs.
- Using a Chinese alias as the answer title. Show `nameZh` and add the alias once in parentheses at most.
- Retrying the same query many times in different languages. One retry is enough.
