import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const docs = join(root, 'docs')

/** Markdown files under docs/ plus the root README, walked without node_modules. */
const markdownFiles = (dir: string): string[] => {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name === '.git') continue
      out.push(...markdownFiles(path))
      continue
    }
    if (extname(name) === '.md') out.push(path)
  }
  return out
}

const keptDocs = markdownFiles(docs).map((path) => relative(docs, path).replaceAll('\\', '/'))

describe('repository docs language policy', () => {
  it('keeps every README language variant and only English for other repo docs', () => {
    const readmeVariants = ['README.zh-CN.md', 'README.zh-Hant.md', 'README.ja.md']
    for (const name of readmeVariants) {
      expect(keptDocs, name).toContain(name)
    }
    const leftover = keptDocs.filter((name) =>
      /(?:^|\/)(?!README\.).+\.(?:zh-CN|zh-Hant|ja)\.md$/.test(name),
    )
    expect(leftover).toEqual([])
    expect(keptDocs).toContain('data-pipeline.md')
    expect(keptDocs).not.toContain('data-pipeline.zh-CN.md')
  })

  it('resolves relative links from README and docs markdown to existing files', () => {
    const files = [join(root, 'README.md'), ...markdownFiles(docs)]
    const hrefs =
      /(?:\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)|<a\s+[^>]*href="([^"]+)")/gi
    const missing: string[] = []
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      for (const match of text.matchAll(hrefs)) {
        const raw = (match[1] ?? match[2] ?? '').split('#')[0]?.split('?')[0] ?? ''
        if (!raw || /^(?:[a-z]+:|\/\/|mailto:)/i.test(raw)) continue
        const target = resolve(dirname(file), raw)
        try {
          statSync(target)
        } catch {
          missing.push(`${relative(root, file)} -> ${raw}`)
        }
      }
    }
    expect(missing).toEqual([])
  })
})
