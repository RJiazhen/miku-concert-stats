<script setup lang="ts">
import { computed, onMounted } from 'vue'

definePageMeta({
  layout: 'admin',
})

useHead({ title: '系统状态' })

/** One status row in the environment card. */
type StatusRow = {
  label: string
  value: string
  tone: 'ok' | 'warn' | 'muted'
  hint: string
}

const { session, pending, load } = useAdminSession()

/** Formats the server clock; an empty value means the session has not loaded yet. */
const formatServerTime = (iso: string): string => {
  if (iso === '') return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'medium' }).format(date)
}

/** True when Access is configured and a maintainer identity was resolved. */
const signedIn = computed(() => session.value.configured && session.value.identity !== null)

/** Environment facts, colour-coded so a misconfigured deployment is obvious. */
const rows = computed<StatusRow[]>(() => {
  const current = session.value
  return [
    {
      label: 'Cloudflare Access',
      value: current.configured ? '已配置' : '未配置',
      tone: current.configured ? 'ok' : 'warn',
      hint: current.configured
        ? 'Worker 会校验每个管理请求的 Cf-Access-Jwt-Assertion。'
        : 'ACCESS_TEAM_DOMAIN / ACCESS_AUD 为空，所有管理接口 fail closed。',
    },
    {
      label: '登录身份',
      value: current.identity?.email ?? '未登录',
      tone: signedIn.value ? 'ok' : 'warn',
      hint: current.identity?.subject ? `Access subject ${current.identity.subject}` : '没有可用的 Access 身份。',
    },
    {
      label: '反馈 KV',
      value: current.storage ? '可用' : '不可用',
      tone: current.storage ? 'ok' : 'warn',
      hint: current.storage
        ? 'FEEDBACK 绑定已注入 Worker 请求上下文。'
        : '缺少 FEEDBACK 绑定；本地 nuxt dev 固定为此状态。',
    },
    {
      label: '目录版本',
      value: current.catalogVersion || '未构建',
      tone: current.catalogVersion ? 'ok' : 'muted',
      hint: '构建时写入的 catalog.sqlite.gz 内容哈希，用于浏览器长期缓存。',
    },
    {
      label: '运行环境',
      value: current.environment === 'development' ? '本地开发' : '生产 Worker',
      tone: 'muted',
      hint: '本地开发不会重定向 Access 登录页，也不会读写真实 KV。',
    },
    {
      label: '服务器时间',
      value: formatServerTime(current.serverTime),
      tone: 'muted',
      hint: '本次会话解析时的 Worker 时钟。',
    },
  ]
})

/** Colour classes for the three status tones. */
const toneClass = (tone: StatusRow['tone']): string => {
  if (tone === 'ok') return 'bg-success/10 text-success'
  if (tone === 'warn') return 'bg-warning/10 text-warning'
  return 'bg-elevated text-muted'
}

onMounted(() => {
  void load(true)
})
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div class="space-y-1">
        <p class="text-xs font-medium tracking-wider text-primary uppercase">Environment</p>
        <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
          系统状态
        </h1>
        <p class="max-w-2xl text-sm leading-relaxed text-muted">
          只展示非敏感的环境事实：Access 是否配置、当前登录身份、KV 绑定与构建版本。不返回任何密钥、
          JWT 或反馈内容。
        </p>
      </div>
      <UButton
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="soft"
        size="sm"
        :loading="pending"
        @click="load(true)"
      >
        刷新
      </UButton>
    </header>

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="row in rows"
        :key="row.label"
        class="rounded-2xl border border-default bg-elevated/40 p-4"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs text-muted">{{ row.label }}</p>
          <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold" :class="toneClass(row.tone)">
            {{ row.tone === 'ok' ? '正常' : row.tone === 'warn' ? '注意' : '信息' }}
          </span>
        </div>
        <p class="mt-2 truncate text-lg font-semibold text-highlighted" :title="row.value">
          {{ row.value }}
        </p>
        <p class="mt-1 text-[11px] leading-relaxed text-muted">{{ row.hint }}</p>
      </div>
    </div>

    <section class="rounded-2xl border border-default bg-elevated/30 p-5">
      <h2 class="flex items-center gap-2 text-sm font-semibold text-highlighted">
        <UIcon name="i-lucide-shield-check" class="size-4 text-primary" />
        Cloudflare Access 配置
      </h2>
      <p class="mt-1 text-xs leading-relaxed text-muted">
        访问未登录的 <code class="rounded bg-elevated px-1 py-0.5">/admin</code> 时，Worker 会 302 到团队
        Access 登录页，并把原路径作为 <code class="rounded bg-elevated px-1 py-0.5">redirect_url</code>
        带回。页面与接口都不接受密码或 token 参数。
      </p>
      <ol class="mt-4 list-decimal space-y-2 ps-5 text-sm text-muted">
        <li>在 Zero Trust &gt; Access &gt; Applications 打开该 Worker 的 Self-hosted 应用。</li>
        <li>
          确认 destinations 至少包含
          <code class="rounded bg-elevated px-1 py-0.5">/admin</code>、
          <code class="rounded bg-elevated px-1 py-0.5">/admin/*</code>、
          <code class="rounded bg-elevated px-1 py-0.5">/api/admin/*</code>、
          <code class="rounded bg-elevated px-1 py-0.5">/api/feedback/*</code>。
        </li>
        <li>
          不要把公开提交接口写成 <code class="rounded bg-elevated px-1 py-0.5">/api/feedback*</code>，
          否则访客的 <code class="rounded bg-elevated px-1 py-0.5">POST /api/feedback</code> 也会被 Access 拦住。
        </li>
        <li>
          把应用的 Team domain 与 AUD 填进 <code class="rounded bg-elevated px-1 py-0.5">wrangler.toml</code>
          的 <code class="rounded bg-elevated px-1 py-0.5">ACCESS_TEAM_DOMAIN</code> /
          <code class="rounded bg-elevated px-1 py-0.5">ACCESS_AUD</code> 并重新部署。
        </li>
      </ol>
    </section>

    <section class="rounded-2xl border border-default bg-elevated/30 p-5">
      <h2 class="flex items-center gap-2 text-sm font-semibold text-highlighted">
        <UIcon name="i-lucide-server" class="size-4 text-primary" />
        管理接口
      </h2>
      <dl class="mt-4 grid gap-3 text-xs sm:grid-cols-2">
        <div>
          <dt class="font-mono text-highlighted">GET /api/admin/session</dt>
          <dd class="mt-0.5 text-muted">当前身份与环境事实；Access 未配置时返回 configured=false。</dd>
        </div>
        <div>
          <dt class="font-mono text-highlighted">GET /api/feedback/list</dt>
          <dd class="mt-0.5 text-muted">最新反馈，limit 上限 200，按接收时间倒序。</dd>
        </div>
        <div>
          <dt class="font-mono text-highlighted">GET /api/feedback/:id</dt>
          <dd class="mt-0.5 text-muted">单条反馈，需要 receivedAt 查询参数。</dd>
        </div>
        <div>
          <dt class="font-mono text-highlighted">POST /api/feedback/status</dt>
          <dd class="mt-0.5 text-muted">把一条反馈标为 open 或 resolved，并用同样的 TTL 重写。</dd>
        </div>
      </dl>
    </section>
  </div>
</template>
