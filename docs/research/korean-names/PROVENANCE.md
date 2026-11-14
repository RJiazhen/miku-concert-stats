# Korean song and character name research

Research only. No repository code was changed. The parent can forward `mapping-for-code-worker.json` to the Mac writer for local tests and review.

Accessed: 2026-11-14 12:45–12:47 CST (Asia/Shanghai).

## Catalog inventory (current worktree)

Read-only metadata from:

`/Users/a1/projects/full-stack/miku-concert-stats.worktrees/feat-ui-korean/public/data/catalog.sqlite`

plus `data/characters.json`.

| Set | Count | Role as denominator |
|---|---:|---|
| All catalog songs | 590 | Full song inventory |
| Songs with a `vocadb.net` source URL | 563 | Songs eligible for VocaDB name lookup |
| Non-VocaDB songs (wiki/manual IDs, mostly `2000000xxx`) | 27 | Out of VocaDB scope in this pass |
| Catalog characters in `data/characters.json` | 22 | Full character inventory, not only the six Crypton vocals |

The figure “345” is not the current catalog size. Existing Chinese title files cover 397 of the 590 songs; they were used only as a format reference, not as Korean evidence.

## Reliability hierarchy

1. **Official licensed source first.** Used only when a rights-holder or official product page itself prints a Hangul name. In this pass: SBS A&T’s HISTORY page for SeeU. The Korean Google Play listing for Crypton’s official MIKUNAVI app is recorded as official-app-store evidence, but authorship of that Korean text is not independently confirmed.
2. **VocaDB documented public API, second.** `GET https://vocadb.net/api/songs/{id}?fields=Names&lang=Default` and `GET https://vocadb.net/api/artists?…&fields=Names`. Korean is not a `lang` value (only Default, Japanese, Romaji, English). Aliases are stored as `language: Unspecified`. A name was accepted only when it contains Hangul syllables, belongs to the correct catalog/VocaDB id, and is not ambiguous.
3. **Nothing was invented.** Well-known transliterations were not added without a source. Artist/producer names were ignored. Wikipedia, namu.wiki, and fandom pages were not used as official evidence.

VocaDB policy ([Entry Names and Aliases](https://wiki.vocadb.net/docs/entry-names-and-aliases)) forbids machine translation, but that is a community rule, not a guarantee. All VocaDB Hangul names are labeled **community catalog**, not official.

## Songs

Existing project cache at `…/worktrees/main/data/cache` (mtime 2026-11-07 22:51–22:52 CST, Asia/Shanghai) already contained some `fields=Names` song payloads. 147 of 563 VocaDB catalog songs had a `names` array there; 52 of those had Hangul aliases.

Documented `GET /api/songs` has **no** `ids` batch parameter (confirmed in [swagger](https://vocadb.net/swagger/v1/swagger.json) and the [public API docs](https://wiki.vocadb.net/docs/public-api)). The remaining 416 VocaDB catalog songs were **not** fetched one-by-one. Absence from the accepted list is not evidence that a song lacks a Korean alias.

The 52 Hangul candidates were then live-checked:

- 51 songs have exactly one Hangul alias; all 51 still matched the live API at 2026-11-14 12:46–12:47 CST (Asia/Shanghai). Rate-limited (~350 ms), `User-Agent: miku-concert-stats-research/0.1`, `fields=Names` only. `robots.txt` allows `/` and does not disallow `/api`.
- 1 song excluded as ambiguous: [番凩 / 8241](https://vocadb.net/S/8241) has both `츠가이코가라시` and `한 쌍의 소슬바람`.

Coverage of accepted community titles: **51 / 563** VocaDB songs, or **51 / 590** of the full catalog, from an inspected Names subset of 147.

Examples of live evidence (language remains `Unspecified`):

- Song 20 [ワールズエンド・ダンスホール](https://vocadb.net/S/20): `월즈 엔드 댄스홀` — https://vocadb.net/api/songs/20?fields=Names&lang=Default
- Song 1508 [裏表ラバーズ](https://vocadb.net/S/1508): `겉과 속의 러버즈` — https://vocadb.net/api/songs/1508?fields=Names&lang=Default
- Song 610187 [メズマライザー](https://vocadb.net/S/610187): `메스머라이저` — https://vocadb.net/api/songs/610187?fields=Names&lang=Default

No official Korean song-title source (licensed soundtrack, rights-holder page, or official store title) was verified in this pass. Do not describe these 51 titles as official.

## Characters

All 22 canonical keys from `data/characters.json` were researched. Recommended Hangul display names:

| Canonical | Recommended Korean | Reliability |
|---|---|---|
| 初音ミク | 하츠네 미쿠 | Crypton MIKUNAVI Korean Play listing and VocaDB artist 1 alias agree |
| 鏡音リン | 카가미네 린 | Same, VocaDB artist 14 |
| 鏡音レン | 카가미네 렌 | Same, VocaDB artist 15 |
| SeeU | 시유 | Official: SBS A&T HISTORY, `보컬로이드 캐릭터 "시유(SeeU)" 탄생` — https://www.sbsant.co.kr/history/ . Also on VocaDB artist 193 as `시유 (한국어)` |
| 重音テト | 카사네 테토 | VocaDB artist 116 community alias only |
| 可不 | 카후 | VocaDB artist 83928 community alias only |
| 星界 | 세카이 | VocaDB artist 99953 community alias only |
| 巡音ルカ | *unresolved* | Play listing uses `메구린 루카`; VocaDB artist 2 uses `메구리네 루카`. Do not auto-pick |
| MEIKO, KAITO, GUMI, IA, flower, MAYU, 寒音ジミ, 神威がくぽ, 結月ゆかり, 東北ずん子, 音街ウナ, 猫村いろは, 歌愛ユキ, galaco | *keep original* | No verified Hangul character-level name |

MIKUNAVI evidence: https://play.google.com/store/apps/details?hl=ko&id=jp.co.crypton.mikunavi (developer: Crypton Future Media). The Korean description names “하츠네 미쿠”, “카가미네 린”, “카가미네 렌”, “메구린 루카”, “MEIKO”, and “KAITO”. The sentence is slightly broken around MEIKO/KAITO. The English listing uses the Latin/English forms. This was **not** confirmed to be a Crypton-authored Korean style guide; treat it as official-app-store-listing evidence with that caveat. MEIKO and KAITO stay in Latin on that page and on VocaDB; do not invent 메이코 or 카이토.

음街ウナ: Hangul appears only on variant product names (for example `오토마치 우나 SV`). Those strings were not reduced to a character display name.

## Limits

- Official Korean song titles were not found in the time box.
- 416 of 563 VocaDB songs still have no inspected `names` field.
- VocaDB cannot mark an alias as Korean in the API; validation is Hangul script + id match + no ambiguity.
- Play Store Korean text may not be a formal Crypton localization.
- Community aliases may be transliterations; they are included only because VocaDB already stores them, not because this research created them.

## Files

- `/workspace/korean-name-research/PROVENANCE.md` — this note
- `/workspace/korean-name-research/catalog-inventory.json` — denominators
- `/workspace/korean-name-research/mapping-for-code-worker.json` — suggested `song-titles` shape plus character recommendations
- `/workspace/korean-name-research/songs-korean-accepted.json` — 51 live-verified community titles with per-entry provenance
- `/workspace/korean-name-research/songs-korean-excluded-ambiguous.json` — song 8241
- `/workspace/korean-name-research/characters-korean.json` — all 22 characters, sources, and unresolved conflict
- `/workspace/korean-name-research/raw-vocadb-song-names-live.json` — live song API payloads
- `/workspace/korean-name-research/raw-vocadb-artist-names-live.json` — live artist search payloads
- `/workspace/korean-name-research/raw-cache-song-hangul-dump.txt` — cache extraction dump
- `/workspace/korean-name-research/live-verification-excluded.json` — empty; all 51 accepted titles revalidated live
