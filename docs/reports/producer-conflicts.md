# 制作人署名冲突报告

本文件由 `pnpm report:producers` 生成，请勿手工编辑；重新生成用 `pnpm report:producers`，CI 用 `pnpm report:producers --check` 校验已提交的版本是否过期。
数据来自已提交的 VocaDB 增量 SQL。

## 规则

1. 歌曲条目里的制作人名单（`song_producers`，来自 VocaDB `fields=Artists`）为准。
2. 仅当歌曲条目没有任何制作人记录时，才用 `artist_string`（歌单里显示的署名）解析。
3. 两者冲突时显示仍按 ①，同时把冲突写进本报告，人工确认后才改。

结构化名单只收录制作侧职务：`Producer` 类别，以及 `Composer` / `Arranger` / `VoiceManipulator` 角色。
Publisher、Illustrator、Animator、Lyricist、Mixer、Mastering、Instrumentalist，以及只有 Label / Circle 的署名都不算制作人。

## 总览

| 分类 | 歌曲数 | 含义 |
| --- | --- | --- |
| 双方各有对方没有的制作人 | 4 | 两边都有自己的名字，任何一边都不是另一边的子集 |
| 自由文本多出制作人 | 48 | 自由文本给出结构化名单没有的名字（Publisher、社团、厂牌等常落在这里） |
| 结构化多出制作人 | 3 | 结构化名单比自由文本多出名字，自由文本只覆盖了一部分 |
| 只有结构化署名 | 0 | 歌曲条目有结构化署名，自由文本没有给出任何制作人 |
| 两边一致 | 507 | 两边解析出的名字集合相同 |

另有 28 首歌两边都没有制作人署名，未分类。

## 双方各有对方没有的制作人（4 首）

如何处理：显示仍以结构化名单为准；两边各自独有的名字都要先请维护者确认是不是制作人，确认后再改 VocaDB 或本仓库数据，不要为了消除冲突直接改 `artist_string`。

- **你好**（[vocadb.net/S/167362](https://vocadb.net/S/167362)，`Remix`）
  - 结构化（`song_producers`）：`Jun Kuroda`（producer, arranger）、`Digger`（producer, voicemanipulator）、`MusikM`（producer, composer）
  - 自由文本（`artist_string`）：`Various artists`
  - 差异：自由文本多出 `Various artists`；结构化多出 `Jun Kuroda`、`Digger`、`MusikM`
- **セカイ**（[vocadb.net/S/290231](https://vocadb.net/S/290231)，`Original`）
  - 结构化（`song_producers`）：`DECO*27`（producer, voicemanipulator）、`kemu`（producer, composer）、`Rockwell`（producer, arranger）
  - 自由文本（`artist_string`）：`Various artists`
  - 差异：自由文本多出 `Various artists`；结构化多出 `DECO*27`、`kemu`、`Rockwell`
- **新人類**（[vocadb.net/S/480295](https://vocadb.net/S/480295)，`Original`）
  - 结构化（`song_producers`）：`まらしぃ`（producer, composer）、`じん`（producer, composer）、`kemu`（producer, arranger）、`びび`（producer, voicemanipulator）
  - 自由文本（`artist_string`）：`Various artists`
  - 差异：自由文本多出 `Various artists`；结构化多出 `まらしぃ`、`じん`、`kemu`、`びび`
- **CONNECT:COMMUNE**（[vocadb.net/S/907752](https://vocadb.net/S/907752)，`Original`）
  - 结构化（`song_producers`）：`Jamie Paige`（producer, arranger, composer）、`Vane Lily`（producer, arranger, composer）、`rice`（producer, composer）
  - 自由文本（`artist_string`）：`Various artists`
  - 差异：自由文本多出 `Various artists`；结构化多出 `Jamie Paige`、`Vane Lily`、`rice`

## 自由文本多出制作人（48 首）

如何处理：显示仍以结构化名单为准；自由文本多出的名字通常是 Publisher、社团或厂牌署名，请维护者确认不是制作人，必要时修正 VocaDB 的歌曲署名，而不是改本报告的结论。

- **恋は戦争**（[vocadb.net/S/1320](https://vocadb.net/S/1320)，`Original`）
  - 结构化（`song_producers`）：`ryo`（producer）
  - 自由文本（`artist_string`）：`ryo`、`supercell`
  - 差异：自由文本多出 `supercell`
- **ブラック★ロックシューター**（[vocadb.net/S/1323](https://vocadb.net/S/1323)，`Original`）
  - 结构化（`song_producers`）：`ryo`（producer）
  - 自由文本（`artist_string`）：`ryo`、`supercell`
  - 差异：自由文本多出 `supercell`
- **ワールドイズマイン**（[vocadb.net/S/1326](https://vocadb.net/S/1326)，`Original`）
  - 结构化（`song_producers`）：`ryo`（producer）
  - 自由文本（`artist_string`）：`ryo`、`supercell`
  - 差异：自由文本多出 `supercell`
- **またね**（[vocadb.net/S/1331](https://vocadb.net/S/1331)，`Remaster`）
  - 结构化（`song_producers`）：`ryo`（producer）
  - 自由文本（`artist_string`）：`ryo`、`supercell`
  - 差异：自由文本多出 `supercell`
- **Project Diva desu.**（[vocadb.net/S/2321](https://vocadb.net/S/2321)，`Original`）
  - 结构化（`song_producers`）：`うたたP`（producer）
  - 自由文本（`artist_string`）：`うたたP`、`ProjectDIVAチャンネル`
  - 差异：自由文本多出 `ProjectDIVAチャンネル`
- **Packaged**（[vocadb.net/S/2432](https://vocadb.net/S/2432)，`Remix`）
  - 结构化（`song_producers`）：`kz`（producer）
  - 自由文本（`artist_string`）：`kz`、`livetune`
  - 差异：自由文本多出 `livetune`
- **ストロボナイツ**（[vocadb.net/S/2442](https://vocadb.net/S/2442)，`Original`）
  - 结构化（`song_producers`）：`kz`（producer）
  - 自由文本（`artist_string`）：`kz`、`livetune`
  - 差异：自由文本多出 `livetune`
- **サヨナラ・グッバイ**（[vocadb.net/S/2652](https://vocadb.net/S/2652)，`Original`）
  - 结构化（`song_producers`）：`のぼる↑`（producer）
  - 自由文本（`artist_string`）：`のぼる↑`、`ProjectDIVAチャンネル`
  - 差异：自由文本多出 `ProjectDIVAチャンネル`
- **カラフル×メロディ**（[vocadb.net/S/2920](https://vocadb.net/S/2920)，`Original`）
  - 结构化（`song_producers`）：`doriko`（producer, composer）、`OSTER project`（producer, arranger, voicemanipulator）
  - 自由文本（`artist_string`）：`doriko`、`OSTER project`、`ちーむMOER`
  - 差异：自由文本多出 `ちーむMOER`
- **初音ミクの激唱**（[vocadb.net/S/2927](https://vocadb.net/S/2927)，`Remix`）
  - 结构化（`song_producers`）：`cosMo@暴走P`（producer）
  - 自由文本（`artist_string`）：`cosMo@暴走P`、`Storyteller`
  - 差异：自由文本多出 `Storyteller`
- **崩壊歌姫 -disruptive diva-**（[vocadb.net/S/3008](https://vocadb.net/S/3008)，`Original`）
  - 结构化（`song_producers`）：`マチゲリータ`（producer）
  - 自由文本（`artist_string`）：`マチゲリータ`、`ProjectDIVAチャンネル`
  - 差异：自由文本多出 `ProjectDIVAチャンネル`
- **リモコン**（[vocadb.net/S/3387](https://vocadb.net/S/3387)，`Original`）
  - 结构化（`song_producers`）：`じーざすP`（producer）
  - 自由文本（`artist_string`）：`じーざすP`、`WONDERFUL★OPPORTUNITY!`
  - 差异：自由文本多出 `WONDERFUL★OPPORTUNITY!`
- **初音ミクの激唱（LONG VERSION）**（[vocadb.net/S/8215](https://vocadb.net/S/8215)，`Original`）
  - 结构化（`song_producers`）：`cosMo@暴走P`（producer）
  - 自由文本（`artist_string`）：`cosMo@暴走P`、`Storyteller`
  - 差异：自由文本多出 `Storyteller`
- **スキキライ**（[vocadb.net/S/8739](https://vocadb.net/S/8739)，`Original`）
  - 结构化（`song_producers`）：`Gom`（producer, arranger, composer）
  - 自由文本（`artist_string`）：`Gom`、`HoneyWorks`
  - 差异：自由文本多出 `HoneyWorks`
- **桜ノ雨**（[vocadb.net/S/8741](https://vocadb.net/S/8741)，`Original`）
  - 结构化（`song_producers`）：`halyosy`（producer）、`is`（producer, arranger）
  - 自由文本（`artist_string`）：`halyosy`、`is`、`absorb`
  - 差异：自由文本多出 `absorb`
- **忘却心中**（[vocadb.net/S/9000](https://vocadb.net/S/9000)，`Original`）
  - 结构化（`song_producers`）：`OPA`（producer, composer）
  - 自由文本（`artist_string`）：`OPA`、`0-9`
  - 差异：自由文本多出 `0-9`
- **8HIT**（[vocadb.net/S/9210](https://vocadb.net/S/9210)，`Original`）
  - 结构化（`song_producers`）：`じーざすP`（producer）
  - 自由文本（`artist_string`）：`じーざすP`、`WONDERFUL★OPPORTUNITY!`
  - 差异：自由文本多出 `WONDERFUL★OPPORTUNITY!`
- **みんなみくみくにしてあげる♪ **（[vocadb.net/S/16943](https://vocadb.net/S/16943)，`Remaster`）
  - 结构化（`song_producers`）：`ika_mo`（producer）
  - 自由文本（`artist_string`）：`ika_mo`、`MOSAIC.TUNE`
  - 差异：自由文本多出 `MOSAIC.TUNE`
- **Last Night, Good Night (Re:Dialed)**（[vocadb.net/S/22926](https://vocadb.net/S/22926)，`Remaster`）
  - 结构化（`song_producers`）：`kz`（producer）
  - 自由文本（`artist_string`）：`kz`、`livetune`
  - 差异：自由文本多出 `livetune`
- **DECORATOR**（[vocadb.net/S/45245](https://vocadb.net/S/45245)，`Original`）
  - 结构化（`song_producers`）：`kz`（producer）
  - 自由文本（`artist_string`）：`kz`、`livetune`
  - 差异：自由文本多出 `livetune`
- **Miku**（[vocadb.net/S/115016](https://vocadb.net/S/115016)，`Original`）
  - 结构化（`song_producers`）：（无）
  - 自由文本（`artist_string`）：`Anamanaguchi`
  - 差异：自由文本多出 `Anamanaguchi`；结构化名单为空，按规则 ② 用自由文本作为回退
- **ミク**（[vocadb.net/S/152348](https://vocadb.net/S/152348)，`Cover`）
  - 结构化（`song_producers`）：（无）
  - 自由文本（`artist_string`）：`Anamanaguchi`
  - 差异：自由文本多出 `Anamanaguchi`；结构化名单为空，按规则 ② 用自由文本作为回退
- **テオ**（[vocadb.net/S/161199](https://vocadb.net/S/161199)，`Original`）
  - 结构化（`song_producers`）：`Kimura`（producer）、`Sakurai`（producer）
  - 自由文本（`artist_string`）：`Kimura`、`Sakurai`、`Omoi`
  - 差异：自由文本多出 `Omoi`
- **アンノウン・マザーグース**（[vocadb.net/S/164107](https://vocadb.net/S/164107)，`Original`）
  - 结构化（`song_producers`）：`wowaka`（producer, composer）
  - 自由文本（`artist_string`）：`wowaka`、`ヒトリエ`
  - 差异：自由文本多出 `ヒトリエ`
- **Sharing The World [ SPANISH VER ]**（[vocadb.net/S/182370](https://vocadb.net/S/182370)，`Cover`）
  - 结构化（`song_producers`）：`BIGHEAD`（producer）、`Ankari`（producer, voicemanipulator）
  - 自由文本（`artist_string`）：`BIGHEAD`、`Ankari`、`Maubox`
  - 差异：自由文本多出 `Maubox`
- **グリーンライツ・セレナーデ**（[vocadb.net/S/186877](https://vocadb.net/S/186877)，`Original`）
  - 结构化（`song_producers`）：`Kimura`（producer）、`Sakurai`（producer）
  - 自由文本（`artist_string`）：`Kimura`、`Sakurai`、`Omoi`
  - 差异：自由文本多出 `Omoi`
- **アンドロイドガール**（[vocadb.net/S/230406](https://vocadb.net/S/230406)，`Original`）
  - 结构化（`song_producers`）：`DECO*27`（producer, composer）、`Rockwell`（producer, arranger）
  - 自由文本（`artist_string`）：`DECO*27`、`Rockwell`、`OTOIRO`
  - 差异：自由文本多出 `OTOIRO`
- **依存香炉**（[vocadb.net/S/300419](https://vocadb.net/S/300419)，`Original`）
  - 结构化（`song_producers`）：`DECO*27`（producer）、`Rockwell`（producer, arranger）
  - 自由文本（`artist_string`）：`DECO*27`、`Rockwell`、`OTOIRO`
  - 差异：自由文本多出 `OTOIRO`
- **ヴァンパイア**（[vocadb.net/S/321205](https://vocadb.net/S/321205)，`Original`）
  - 结构化（`song_producers`）：`DECO*27`（producer, composer）、`Rockwell`（producer, arranger）
  - 自由文本（`artist_string`）：`DECO*27`、`Rockwell`、`OTOIRO`
  - 差异：自由文本多出 `OTOIRO`
- **シンデレラ**（[vocadb.net/S/346457](https://vocadb.net/S/346457)，`Original`）
  - 结构化（`song_producers`）：`DECO*27`（producer, composer）、`Rockwell`（producer, arranger）
  - 自由文本（`artist_string`）：`DECO*27`、`Rockwell`、`OTOIRO`
  - 差异：自由文本多出 `OTOIRO`
- **アニマル**（[vocadb.net/S/371426](https://vocadb.net/S/371426)，`Original`）
  - 结构化（`song_producers`）：`DECO*27`（producer, composer）、`Rockwell`（producer, arranger）
  - 自由文本（`artist_string`）：`DECO*27`、`Rockwell`、`OTOIRO`
  - 差异：自由文本多出 `OTOIRO`
- **サラマンダー**（[vocadb.net/S/376689](https://vocadb.net/S/376689)，`Original`）
  - 结构化（`song_producers`）：`DECO*27`（producer, composer）、`Rockwell`（producer, arranger）
  - 自由文本（`artist_string`）：`DECO*27`、`Rockwell`、`OTOIRO`
  - 差异：自由文本多出 `OTOIRO`
- **フューチャー・イヴ**（[vocadb.net/S/391129](https://vocadb.net/S/391129)，`Original`）
  - 结构化（`song_producers`）：`sasakure.UK`（producer, composer）
  - 自由文本（`artist_string`）：`sasakure.UK`、`有形ランペイジ`
  - 差异：自由文本多出 `有形ランペイジ`
- **キメラ**（[vocadb.net/S/396081](https://vocadb.net/S/396081)，`Original`）
  - 结构化（`song_producers`）：`DECO*27`（producer）、`Rockwell`（producer, arranger）
  - 自由文本（`artist_string`）：`DECO*27`、`Rockwell`、`OTOIRO`
  - 差异：自由文本多出 `OTOIRO`
- **Tell Your World**（[vocadb.net/S/399060](https://vocadb.net/S/399060)，`Original`）
  - 结构化（`song_producers`）：`kz`（producer, composer）
  - 自由文本（`artist_string`）：`kz`、`Google`
  - 差异：自由文本多出 `Google`
- **ブループラネット**（[vocadb.net/S/525396](https://vocadb.net/S/525396)，`Original`）
  - 结构化（`song_producers`）：`DECO*27`（producer, composer, voicemanipulator）、`Rockwell`（producer, arranger）
  - 自由文本（`artist_string`）：`DECO*27`、`Rockwell`、`OTOIRO`
  - 差异：自由文本多出 `OTOIRO`
- **ボルテッカー**（[vocadb.net/S/532518](https://vocadb.net/S/532518)，`Original`）
  - 结构化（`song_producers`）：`DECO*27`（producer, arranger, composer）、`tepe`（producer, arranger）
  - 自由文本（`artist_string`）：`DECO*27`、`tepe`、`OTOIRO`
  - 差异：自由文本多出 `OTOIRO`
- **ゴー！ビッパ団**（[vocadb.net/S/581632](https://vocadb.net/S/581632)，`Original`）
  - 结构化（`song_producers`）：`じーざすP`（producer, composer）
  - 自由文本（`artist_string`）：`じーざすP`、`WONDERFUL★OPPORTUNITY!`
  - 差异：自由文本多出 `WONDERFUL★OPPORTUNITY!`
- **ハオ**（[vocadb.net/S/640212](https://vocadb.net/S/640212)，`Original`）
  - 结构化（`song_producers`）：`DECO*27`（producer, arranger, composer）、`Hayato Yamamoto`（producer, arranger）
  - 自由文本（`artist_string`）：`DECO*27`、`Hayato Yamamoto`、`OTOIRO`
  - 差异：自由文本多出 `OTOIRO`
- **ラビットホール (Reloaded)**（[vocadb.net/S/668053](https://vocadb.net/S/668053)，`Remaster`）
  - 结构化（`song_producers`）：`DECO*27`（producer）
  - 自由文本（`artist_string`）：`DECO*27`、`OTOIRO`
  - 差异：自由文本多出 `OTOIRO`
- **モニタリング**（[vocadb.net/S/668055](https://vocadb.net/S/668055)，`Original`）
  - 结构化（`song_producers`）：`DECO*27`（producer, arranger, composer）、`Hayato Yamamoto`（producer, arranger）
  - 自由文本（`artist_string`）：`DECO*27`、`Hayato Yamamoto`、`OTOIRO`
  - 差异：自由文本多出 `OTOIRO`
- **HELLO, NEW WORLD!**（[vocadb.net/S/742688](https://vocadb.net/S/742688)，`Original`）
  - 结构化（`song_producers`）：`びび`（producer, voicemanipulator）、`Nanao`（producer, composer）
  - 自由文本（`artist_string`）：`Nanao`、`びび`、`Teary Planet`
  - 差异：自由文本多出 `Teary Planet`
- **テレパシ**（[vocadb.net/S/752940](https://vocadb.net/S/752940)，`Original`）
  - 结构化（`song_producers`）：`DECO*27`（producer, composer）、`tepe`（producer, arranger）
  - 自由文本（`artist_string`）：`DECO*27`、`tepe`、`OTOIRO`
  - 差异：自由文本多出 `OTOIRO`
- **弱虫モンブラン (Reloaded)**（[vocadb.net/S/777659](https://vocadb.net/S/777659)，`Remaster`）
  - 结构化（`song_producers`）：`DECO*27`（producer, arranger, composer）、`Hayato Yamamoto`（producer, arranger）
  - 自由文本（`artist_string`）：`DECO*27`、`Hayato Yamamoto`、`OTOIRO`
  - 差异：自由文本多出 `OTOIRO`
- **チェリーポップ**（[vocadb.net/S/816725](https://vocadb.net/S/816725)，`Original`）
  - 结构化（`song_producers`）：`DECO*27`（producer, arranger, composer）、`Hayato Yamamoto`（producer, arranger）
  - 自由文本（`artist_string`）：`DECO*27`、`Hayato Yamamoto`、`OTOIRO`
  - 差异：自由文本多出 `OTOIRO`
- **マシュマロ**（[vocadb.net/S/848354](https://vocadb.net/S/848354)，`Original`）
  - 结构化（`song_producers`）：`DECO*27`（producer, arranger, composer）、`Hayato Yamamoto`（producer, arranger）
  - 自由文本（`artist_string`）：`DECO*27`、`Hayato Yamamoto`、`OTOIRO`
  - 差异：自由文本多出 `OTOIRO`
- **愛迷エレジー (Reloaded)**（[vocadb.net/S/878206](https://vocadb.net/S/878206)，`Remaster`）
  - 结构化（`song_producers`）：`DECO*27`（producer, composer）、`kemu`（producer, arranger）
  - 自由文本（`artist_string`）：`DECO*27`、`kemu`、`OTOIRO`
  - 差异：自由文本多出 `OTOIRO`
- **愛言葉V**（[vocadb.net/S/915394](https://vocadb.net/S/915394)，`Original`）
  - 结构化（`song_producers`）：`DECO*27`（producer, composer）、`kz`（producer, arranger）
  - 自由文本（`artist_string`）：`DECO*27`、`kz`、`OTOIRO`
  - 差异：自由文本多出 `OTOIRO`

## 结构化多出制作人（3 首）

如何处理：显示仍以结构化名单为准；结构化多出的名字来自 VocaDB 的制作侧职务，属于补全，不用改自由文本。

- **フェレス**（[vocadb.net/S/393333](https://vocadb.net/S/393333)，`Original`）
  - 结构化（`song_producers`）：`栗山夕璃`（producer, arranger, composer）、`端倉鑛`（producer, voicemanipulator）
  - 自由文本（`artist_string`）：`栗山夕璃`
  - 差异：结构化多出 `端倉鑛`
- **JUVENILE**（[vocadb.net/S/566239](https://vocadb.net/S/566239)，`Original`）
  - 结构化（`song_producers`）：`じん`（producer, composer）、`びび`（producer, voicemanipulator）、`緩斗`（producer, arranger）
  - 自由文本（`artist_string`）：`じん`、`びび`
  - 差异：结构化多出 `緩斗`
- **ファサード・クエスチョン**（[vocadb.net/S/771172](https://vocadb.net/S/771172)，`Original`）
  - 结构化（`song_producers`）：`サツキ`（producer, composer, voicemanipulator）、`yasai31`（producer, voicemanipulator）
  - 自由文本（`artist_string`）：`サツキ`
  - 差异：结构化多出 `yasai31`

## 只有结构化署名（0 首）

如何处理：歌曲条目已有结构化署名，自由文本没有可回退的内容；显示结构化名单即可，不用改任何数据。

没有这类歌曲。
