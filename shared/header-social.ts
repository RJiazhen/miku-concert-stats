/** External profile and repo links shown in the site header, left to right. */
export type HeaderSocialLink = {
  key: 'github' | 'x' | 'bilibili'
  href: string
  icon: string
  tooltipKey: 'nav.github' | 'nav.x' | 'nav.bilibili'
  ariaKey: 'nav.githubNewWindow' | 'nav.xNewWindow' | 'nav.bilibiliProfile'
}

/** GitHub, then X, then Bilibili immediately to the right of X. */
export const headerSocialLinks: HeaderSocialLink[] = [
  {
    key: 'github',
    href: 'https://github.com/RJiazhen/miku-concert-stats',
    icon: 'i-tabler:brand-github',
    tooltipKey: 'nav.github',
    ariaKey: 'nav.githubNewWindow',
  },
  {
    key: 'x',
    href: 'https://x.com/JasonRuanrjz',
    icon: 'i-tabler:brand-x',
    tooltipKey: 'nav.x',
    ariaKey: 'nav.xNewWindow',
  },
  {
    key: 'bilibili',
    href: 'https://b23.tv/IITMbFk',
    icon: 'i-tabler:brand-bilibili',
    tooltipKey: 'nav.bilibili',
    ariaKey: 'nav.bilibiliProfile',
  },
]
