<template>
  <div class="min-h-screen">
    <HeroBackdrop />
    <SiteHeader />
    <div class="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6">
      <slot />
    </div>
    <footer class="border-t border-default/60">
      <div class="mx-auto max-w-6xl space-y-2 px-4 pt-8 pb-24 text-xs text-muted sm:px-6 sm:pb-8">
        <p>
          曲目、演出和歌单来自
          <ULink to="https://vocadb.net/" target="_blank" class="text-primary">VocaDB</ULink>
          公共 API；VocaDB 没有收录的曲目（古典改编、器乐曲等）按
          <ULink to="https://w.atwiki.jp/hmiku/" target="_blank" class="text-primary">初音ミク Wiki</ULink>
          的逐曲表登记，页内会标注。转载这些数据库内容时请链回 VocaDB。许可说明见
          <ULink to="https://wiki.vocadb.net/docs/license" target="_blank" class="text-primary">VocaDB License</ULink>。
        </p>
      </div>
    </footer>
    <FeedbackWidget />
  </div>
</template>
