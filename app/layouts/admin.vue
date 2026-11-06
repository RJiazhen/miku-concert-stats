<script setup lang="ts">
import { computed, onMounted } from 'vue'

/**
 * Shell for every `/admin` page: fixed sidebar, sticky navbar, and a scrollable content panel.
 * The session is seeded by the Nitro admin guard, so the maintainer identity is correct on the
 * first SSR paint; `load` refreshes it after client-side navigation or a token expiry.
 */
useHead({
  titleTemplate: (title) => (title ? `${title} · 后台` : '后台'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

/** Sidebar destinations; `/admin` itself redirects to the feedback inbox. */
const NAV = [
  { label: '反馈收件箱', to: '/admin/feedback', icon: 'i-lucide-inbox', hint: '处理站点错误报告' },
  { label: '数据概览', to: '/admin/data', icon: 'i-lucide-database', hint: '目录规模与来源' },
  { label: '系统状态', to: '/admin/system', icon: 'i-lucide-shield-check', hint: 'Access 与存储配置' },
]

const route = useRoute()
const { session, loaded, load } = useAdminSession()

/** Navbar title and icon for the active section. */
const current = computed(() => {
  return NAV.find((item) => route.path === item.to || route.path.startsWith(`${item.to}/`)) ?? NAV[0]
})

/** Nav items with an exact active flag so nested admin routes do not light up several entries. */
const navItems = computed(() => {
  return NAV.map((item) => ({
    label: item.label,
    icon: item.icon,
    to: item.to,
    active: route.path === item.to,
  }))
})

/** Address shown in the sidebar footer; falls back to a neutral label when Access has no email. */
const identityLabel = computed(() => session.value.identity?.email ?? '维护者')

/** True once the guard has told us Access is not configured (missing bindings). */
const accessMissing = computed(() => loaded.value && !session.value.configured)

/** Local dev cannot complete the real Access flow, so it gets a quieter signed-out state. */
const developmentMode = computed(() => session.value.environment === 'development')

/** True when Access is configured but the current request carried no valid token. */
const signedOut = computed(() => {
  return loaded.value && session.value.configured && session.value.identity === null && !developmentMode.value
})

/** Reloads the whole page so the browser walks through the Access login flow again. */
const reloadPage = (): void => {
  window.location.reload()
}

onMounted(() => {
  // Client-side navigation into `/admin` has no SSR seed, so fetch the session once.
  void load()
})
</script>

<template>
  <UDashboardGroup storage-key="miku-admin" class="bg-default">
    <UDashboardSidebar
      collapsible
      :default-size="16"
      :min-size="13"
      :max-size="22"
      :ui="{ footer: 'border-t border-default' }"
    >
      <template #header="{ collapsed }">
        <NuxtLink to="/admin/feedback" class="flex min-w-0 items-center gap-2.5 no-underline">
          <img
            src="/logo.png"
            alt="初音未来演唱会曲目统计"
            width="32"
            height="32"
            class="size-8 shrink-0 rounded-lg ring-1 ring-black/10 dark:ring-white/15"
          >
          <span v-if="!collapsed" class="min-w-0 leading-tight">
            <span class="block truncate text-sm font-semibold tracking-tight text-highlighted">初音未来 · 后台</span>
            <span class="block truncate text-[11px] text-muted">维护者控制台</span>
          </span>
        </NuxtLink>
        <span
          v-if="!collapsed"
          class="ms-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-primary uppercase"
        >
          Admin
        </span>
      </template>

      <template #default="{ collapsed }">
        <p v-if="!collapsed" class="px-2 pb-1 text-[11px] font-medium tracking-wider text-muted uppercase">
          管理
        </p>
        <UNavigationMenu :items="navItems" :collapsed="collapsed" orientation="vertical" />
      </template>

      <template #footer="{ collapsed }">
        <div class="flex min-w-0 flex-1 items-center gap-2.5">
          <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UIcon name="i-lucide-shield-check" class="size-4" />
          </span>
          <span v-if="!collapsed" class="min-w-0 leading-tight">
            <span class="block truncate text-xs font-medium text-highlighted">{{ identityLabel }}</span>
            <span class="block truncate text-[11px] text-muted">
              {{ session.configured ? 'Cloudflare Access' : 'Access 未配置' }}
            </span>
          </span>
        </div>
        <UButton
          to="/"
          icon="i-lucide-arrow-up-right"
          color="neutral"
          variant="ghost"
          size="sm"
          :square="collapsed"
          aria-label="返回公开站点"
        />
      </template>
    </UDashboardSidebar>

    <UDashboardPanel id="admin" class="min-w-0">
      <template #header>
        <UDashboardNavbar :title="current.label" :icon="current.icon" :as="{ title: 'div' }">
          <template #right>
            <UBadge
              class="hidden md:inline-flex"
              :color="session.identity ? 'success' : (accessMissing ? 'warning' : 'error')"
              variant="subtle"
              size="sm"
              :icon="session.identity ? 'i-lucide-circle-check' : (accessMissing ? 'i-lucide-circle-alert' : 'i-lucide-lock')"
            >
              {{ session.identity ? '已登录' : (accessMissing ? '未配置' : '未登录') }}
            </UBadge>
            <UButton
              to="/"
              icon="i-lucide-globe"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="返回公开站点"
            />
            <UColorModeButton color="neutral" variant="ghost" size="sm" />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <UAlert
          v-if="accessMissing"
          color="warning"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          title="Cloudflare Access 尚未配置"
        >
          <template #description>
            本地 <code class="rounded bg-elevated px-1 py-0.5">nuxt dev</code> 没有 Access 应用，Worker 也不会拿到
            <code class="rounded bg-elevated px-1 py-0.5">ACCESS_TEAM_DOMAIN</code> /
            <code class="rounded bg-elevated px-1 py-0.5">ACCESS_AUD</code>，因此不会跳转登录页，反馈数据也不可读。
            部署后若仍是这个提示，请在 <code class="rounded bg-elevated px-1 py-0.5">wrangler.toml</code> 补齐两项
            <code class="rounded bg-elevated px-1 py-0.5">[vars]</code> 并把
            <code class="rounded bg-elevated px-1 py-0.5">/admin</code>、
            <code class="rounded bg-elevated px-1 py-0.5">/admin/*</code>、
            <code class="rounded bg-elevated px-1 py-0.5">/api/admin/*</code> 加入 Access 应用的 destinations。
          </template>
        </UAlert>
        <UAlert
          v-else-if="signedOut"
          color="error"
          variant="subtle"
          icon="i-lucide-lock"
          title="登录状态无效"
          description="当前请求没有有效的 Cloudflare Access 身份，管理接口会一律返回 401。请刷新页面重新走一次 Access 登录；如果仍失败，检查登录账号是否在 Access 策略的允许列表里。"
        >
          <template #actions>
            <UButton
              size="sm"
              color="error"
              variant="soft"
              icon="i-lucide-refresh-cw"
              @click="reloadPage"
            >
              重新加载
            </UButton>
          </template>
        </UAlert>

        <slot />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
