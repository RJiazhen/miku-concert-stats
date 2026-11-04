<template>
  <div class="min-h-screen">
    <HeroBackdrop />
    <SiteHeader />
    <div class="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6">
      <slot />
    </div>
    <footer class="border-t border-default/60">
      <div class="mx-auto max-w-6xl space-y-2 px-4 py-8 text-xs text-muted sm:px-6">
        <p>
          曲目、演出和歌单来自
          <ULink to="https://vocadb.net/" target="_blank" class="text-primary">VocaDB</ULink>
          公共 API。转载这些数据库内容时请链回 VocaDB。许可说明见
          <ULink to="https://wiki.vocadb.net/docs/license" target="_blank" class="text-primary">VocaDB License</ULink>。
          本站不收录第三方封面、歌词或官方标识。
        </p>
      </div>
    </footer>
  </div>
</template>
