<template>
  <div class="shell">
    <SiteHeader />
    <slot />
    <footer class="site-footer">
      <p>
        曲目、演出和歌单来自
        <a href="https://vocadb.net/">VocaDB</a>
        公共 API。转载这些数据库内容时请链回 VocaDB。许可说明见
        <a href="https://wiki.vocadb.net/docs/license">VocaDB License</a>。
        本站不收录第三方封面、歌词或官方标识。
      </p>
      <p>
        播放量只记录带采集时间的观测。当前仓库没有 YouTube Data API 快照时，区间全部显示为「尚无快照」。
        不抓取 niconico 非官方接口，也不抓取哔哩哔哩播放量。没有可引用的达成时间时，里程碑表保持为空。
      </p>
    </footer>
  </div>
</template>
