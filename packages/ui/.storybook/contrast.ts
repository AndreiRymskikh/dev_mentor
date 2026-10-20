/** WCAG 2.2 1.4.3/1.4.11: compare actual computed sRGB colors, not palette labels. */
export function contrast(foreground: string, background: string): number {
  function luminance(value: string) {
    const expanded = value.startsWith('#') && value.length === 4
      ? '#' + [...value.slice(1)].map(channel => channel + channel).join('')
      : value;
    const channels = expanded.startsWith('#')
      ? [1, 3, 5].map(index => parseInt(expanded.slice(index, index + 2), 16) / 255)
      : (expanded.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number).map(channel => channel / 255);
    const weights = [0.2126, 0.7152, 0.0722];
    return channels.reduce((sum, channel, index) => sum + (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4) * weights[index], 0);
  }
  const values = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
  return (values[1] + 0.05) / (values[0] + 0.05);
}

export const colorPairs = [
  ...['background', 'surface-card', 'surface-support'].map(surface => ['foreground', surface, 4.5] as const),
  ...['background', 'surface-card'].map(surface => ['text-muted', surface, 4.5] as const),
  ['text-support', 'surface-support', 4.5] as const,
  ...['background', 'surface-card', 'surface-support'].map(surface => ['text-accent', surface, 4.5] as const),
  ...['action-primary', 'action-primary-hover'].map(surface => ['text-on-action', surface, 4.5] as const),
  ...['text-inverse', 'text-inverse-muted', 'code-syntax-keyword', 'code-syntax-highlight'].map(text => [text, 'surface-inverse', 4.5] as const),
  ...['border-control', 'focus-ring', 'action-primary'].flatMap(element => ['background', 'surface-card', 'surface-support'].map(surface => [element, surface, 3] as const)),
];
