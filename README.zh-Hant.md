# 初音未來演唱會曲目統計

[English](README.md) | [简体中文](README.zh-CN.md) | **繁體中文** | [日本語](README.ja.md)

統計 Crypton 主辦的初音未來演唱會歌單，並在瀏覽器裡比較各場、各系列、各年份的曲目構成。日常聚合不在伺服器上跑。Cloudflare Worker 只負責首屏 SSR 與少量介面（回饋、後台、動態 `/api/v1`）；排行與搜尋都在瀏覽器下載的本地目錄上完成。

**線上站點：** <https://miku-concert-stats.rjiazhen.top>

## 收錄系列

マジカルミライ、MIKU EXPO、MIKU WITH YOU、初音ミクシンフォニー、初音ミクライブパーティー、SNOW MIKU LIVE!，以及倉庫內補錄的相關演出。

## 站點地圖

| 路由 | 內容 |
| --- | --- |
| `/` | 曲目排行（按場次或按演出），支援系列 / 年份 / 角色 / 關鍵詞篩選 |
| `/raw` | 原始資料、跨演出歌單對照、品質報告 |
| `/report` | 同一系列年度不同演出的歌單差異核驗 |
| `/songs/{id}` | 單曲詳情：版本、出場、投稿連結 |
| `/shows/{id}` | 一場演出的日程、歌單與輪換說明 |
| `/series` | 系列總覽與可篩選演出表 |
| `/series/{id}` | 系列主頁 |
| `/timeline` | 時間線 |
| `/producers` | 製作人排行 |

頁眉搜尋只在已下載的本地目錄裡匹配歌名、製作人、系列、演出與地點。

## 資料來源

優先官方與百科（初音ミク Wiki、萌娘百科等）。[VocaDB](https://vocadb.net/) 與百科同級，用於補曲名、歌曲 id 與日期，不獨佔權威。轉載 VocaDB 相關內容請鏈回 VocaDB，並遵守 [VocaDB License](https://wiki.vocadb.net/docs/license)。本站不託管封面、歌詞或官方標識。

## AI skill

無需金鑰即可安裝公開 Agent Skill：

```bash
npx skills add RJiazhen/miku-concert-stats@query-concert-stats
```

也可把 <https://miku-concert-stats.rjiazhen.top/skill.md> 或 [`skills/query-concert-stats/SKILL.md`](skills/query-concert-stats/SKILL.md) 交給 AI。

## 開發 / 貢獻

見 [`CONTRIBUTING.zh-Hant.md`](CONTRIBUTING.zh-Hant.md) 與 [`docs/local-development.zh-Hant.md`](docs/local-development.zh-Hant.md)。**多數** UI、統計、測試與目錄建構不需要 Cloudflare 帳號。部署與後台見 [`docs/cloudflare.zh-Hant.md`](docs/cloudflare.zh-Hant.md)。架構概覽見 [`docs/architecture.zh-Hant.md`](docs/architecture.zh-Hant.md)。

## 授權

[MIT](LICENSE)
