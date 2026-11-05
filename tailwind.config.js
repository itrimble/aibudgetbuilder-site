/** @type {import('tailwindcss').Config} */
const c = (n) => `var(--${n})`
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: { bg: c('bg'), panel: c('panel'), panel2: c('panel2'), line: c('line'), fg: c('fg'), muted: c('muted'), subtle: c('subtle'),
      accent: c('accent'), onaccent: c('onaccent'), err: c('err'), ok: c('ok'), warn: c('warn'), info: c('info'), link: c('link') },
    fontFamily: { mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'] } } },
  plugins: [],
}
