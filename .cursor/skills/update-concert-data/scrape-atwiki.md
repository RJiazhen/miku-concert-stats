# 抓 atwiki 逐曲表

`w.atwiki.jp/hmiku` 用 Cloudflare 挡裸 HTTP 请求（curl / fetch 从别的域发出都是 403）。
可行路径只有一条：在浏览器里打开任意一个 hmiku 页面，然后在**同一域名下**用相对路径 fetch，
再自己解 HTML。页面本身不需要渲染，`DOMParser` 就够。

## 索引页

| 内容 | 页号 |
| --- | --- |
| ライブセットリスト一覧（总表） | 61935 |
| 初音ミクシンフォニー（分年） | 80099 |
| HATSUNE MIKU EXPO（分巡演） | 67039 |
| 初音ミク「マジカルミライ」（分年） | 56548 |
| 未来有你・HATSUNE MIKU WITH YOU | 67108 |
| 初音ミク ライブパーティー | 66862 |
| SNOW MIKU LIVE! | 67187 |
| 初音ミク×鼓童 | 67216 |

`https://w.atwiki.jp/hmiku/pages/<页号>.html` 就是页面地址。

## 取一张表

先用 `browser_cdp` 的 `Runtime.evaluate` 打开一次站点（否则同源 fetch 不成立）：

```js
location.href = 'https://w.atwiki.jp/hmiku/pages/80099.html'
```

再执行下面这段，`page` 换成目标页号。返回的 `{page, rows}` 直接写进 `data/wiki-raw/<key>.json`。

```js
(async () => {
  const page = '67127'
  const res = await fetch(`/hmiku/pages/${page}.html`, { credentials: 'include' })
  const doc = new DOMParser().parseFromString(await res.text(), 'text/html')
  const root = doc.querySelector('#wikibody') || doc.body

  // rowspan / colspan 必须先摊平，否则后面的列会整体错位。
  const toGrid = (table) => {
    const grid = []
    const pending = {}
    const rows = [...table.querySelectorAll('tr')]
    rows.forEach((tr, r) => {
      grid[r] = grid[r] || []
      let c = 0
      for (const cell of tr.querySelectorAll('th,td')) {
        while (pending[`${r}:${c}`]) { grid[r][c] = pending[`${r}:${c}`]; c += 1 }
        const text = cell.innerText.replace(/\s+/g, ' ').trim()
        const rowSpan = cell.rowSpan || 1
        const colSpan = cell.colSpan || 1
        for (let dc = 0; dc < colSpan; dc += 1) {
          grid[r][c + dc] = text
          for (let dr = 1; dr < rowSpan; dr += 1) pending[`${r + dr}:${c + dc}`] = text
        }
        c += colSpan
      }
      while (pending[`${r}:${c}`]) { grid[r][c] = pending[`${r}:${c}`]; c += 1 }
    })
    return grid
  }

  // 一页可能有好几张表（视频、乐曲比赛）；setlist 表的第一行以 順 开头且含 曲名。
  let best = null
  for (const table of root.querySelectorAll('table')) {
    const grid = toGrid(table)
    if (!grid.length || grid[0][0] !== '順' || !grid[0].includes('曲名')) continue
    if (!best || grid.length > best.length) best = grid
  }
  return JSON.stringify({ page, rows: best })
})()
```

## 表格长什么样

| 順 | | 曲名 | 作曲者 | 公演替 | モジュ | CD | 備考 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `1` / `..` / `E2` / `--` | `-` | 曲名 | 作曲者 | 城市 / 日程，空=所有演出 | `専用` / `既存` | ○ | `初披露`、`1日目`、`昼公演`… |

- **`順` 列不可靠**：同一位置的メドレー 会用重复编号或 `..`，安可是 `E1`，MC 是 `--`。
  只按出现顺序取行，不要按 `順` 排序。
- **`公演替` 列**是城市 / 日程差异的唯一依据；`備考` 里也可能写 `1日目`、`昼公演`。
  raw 路径只认 `公演替`；差异写在 `備考` 的表请走 `scripts/wiki_tour_tables.py` 手抄。
- **`※`** 单独出现表示「百科没写属于哪些城市」，不是「所有城市」。不要归位。
- **标题行**：`《アンコール》`、`《ダブルアンコール》`、`MC①`、`バンドメンバー紹介`、
  `…パート` 都不是曲目；`scripts/wiki-setlists-source.py` 会跳过，`rows` 里留着也无害。
- **同一首歌重复**（`ぽっぴっぽー` 与 `ぽっぴっぽー（Grand Finale）`）保留原样，
  在 `TOUR_ROWS` / raw 里给后一条标题加 `#` 前缀，脚本会排除并写进 note。

## 保存

```json
{ "page": "67127", "rows": [["順", "", "曲名", "作曲者", "公演替", "モジュ", "CD", "備考"], ["1", "-", "ヒアソビ", "かめりあ", "", "", "○", "初披露"]] }
```

`rows` 保留表头。写完后到 `scripts/wiki_raw_spec.py` 登记这张表归哪些演出，再跑
`uv run scripts/wiki-setlists-source.py`。

## 已有的 raw 表

`expo2017-my` `expo2018-us` `expo2018-eu` `expo2019-tw-hk` `expo2024-na` `expo2024-eu`
`expo2024-au` `expo2025-asia` `expo2026-na` `mwy2018` `mwy2019` `mwy2024` `mwy2026`
`mm2018` `mm2021` `mm10th` `mm2023` `mm2024` `mm2025` `mm2026` `symphony2627`
`mikufes2009` `mikufes2024` `matsuri39` `mikugan2013` `galaxy2020` `galaxy2021`
`lawson2026` `pokemiku-voltage2026` `decomiku2026`

新增的 8 个中，`matsuri39` 来自 `w.atwiki.jp/vocalive`，`mikugan2013` 来自 Sanka Blog，
`pokemiku-voltage2026` 来自 VOLTAGE Live 官方 after report；其余是 hmiku 页面。不是 hmiku 页面的
三个在 JSON 里用 `url` 而不是 `page`。

新增巡演时按 `<系列>-<年份>` 起名。同一巡演的续办（如 EXPO 2027）另建一个文件，不要覆盖旧表。
