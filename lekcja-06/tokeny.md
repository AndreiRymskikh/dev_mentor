# Approved design tokens

Approved: 2026-10-19, including contrast fixes and dark palette.

Source: [approved home page](ekran-bez-ds.html). The requested `referencje.md` was absent; no reference IDs have been invented. **A1** = user approval of this home page. **E1** = existing `--background` and `--foreground` names in [app globals](../packages/app/src/app/globals.css). **P1** = approved accessibility adjustments. **P2** = approved dark-theme extension.

Implementation: [tokens.css](../packages/ui/src/tokens.css). Values separated by `/` mean light / dark. Raw values are used only inside the token file. Semantic and component tokens are the consumption API. The standalone HTML and app stylesheet remain unchanged; importing and integrating the tokens is separate work. Theme follows the OS unless the root has `data-theme="light"` or `data-theme="dark"`. Mobile spacing applies at 650px and below. Reduced-motion preference sets interaction duration to zero. No font download is introduced.

| Token | Layer | Value | Provenance | Where to use | Where not to use |
|---|---|---|---|---|---|
| --raw-color-f6f7f2 | Raw | #f6f7f2 | A1 | Token definitions only | Component CSS |
| --raw-color-ffffff | Raw | #ffffff | A1 | Token definitions only | Component CSS |
| --raw-color-18332f | Raw | #18332f | A1 | Token definitions only | Component CSS |
| --raw-color-16312d | Raw | #16312d | A1 | Token definitions only | Component CSS |
| --raw-color-c7ef83 | Raw | #c7ef83 | A1 | Token definitions only | Component CSS |
| --raw-color-e9efdf | Raw | #e9efdf | A1 | Token definitions only | Component CSS |
| --raw-color-5d6f59 | Raw | #5d6f59 | A1 | Token definitions only | Component CSS |
| --raw-color-31534a | Raw | #31534a | A1 | Token definitions only | Component CSS |
| --raw-color-e4ece6 | Raw | #e4ece6 | A1 | Token definitions only | Component CSS |
| --raw-color-9fb6aa | Raw | #9fb6aa | A1 | Token definitions only | Component CSS |
| --raw-color-c6b4e0 | Raw | #c6b4e0 | A1 | Token definitions only | Component CSS |
| --raw-color-dce2d9 | Raw | #dce2d9 | A1 | Token definitions only | Component CSS |
| --raw-color-627069 | Raw | #627069 | P1/P2 | Token definitions only | Component CSS |
| --raw-color-547137 | Raw | #547137 | P1/P2 | Token definitions only | Component CSS |
| --raw-color-142c29 | Raw | #142c29 | P1/P2 | Token definitions only | Component CSS |
| --raw-color-203d35 | Raw | #203d35 | P1/P2 | Token definitions only | Component CSS |
| --raw-color-d6f3a6 | Raw | #d6f3a6 | P1/P2 | Token definitions only | Component CSS |
| --raw-space-4 | Raw | 4px | A1, normalized scale | Token definitions only | Direct layout styling |
| --raw-space-8 | Raw | 8px | A1, normalized scale | Token definitions only | Direct layout styling |
| --raw-space-12 | Raw | 12px | A1, normalized scale | Token definitions only | Direct layout styling |
| --raw-space-16 | Raw | 16px | A1, normalized scale | Token definitions only | Direct layout styling |
| --raw-space-24 | Raw | 24px | A1, normalized scale | Token definitions only | Direct layout styling |
| --raw-space-32 | Raw | 32px | A1, normalized scale | Token definitions only | Direct layout styling |
| --raw-space-48 | Raw | 48px | A1, normalized scale | Token definitions only | Direct layout styling |
| --raw-space-64 | Raw | 64px | A1, normalized scale | Token definitions only | Direct layout styling |
| --raw-space-80 | Raw | 80px | A1, normalized scale | Token definitions only | Direct layout styling |
| --raw-radius-8 | Raw | 8px | A1, normalized | Token definitions only | Direct component styling |
| --raw-radius-12 | Raw | 12px | A1, normalized | Token definitions only | Direct component styling |
| --raw-radius-16 | Raw | 16px | A1, normalized | Token definitions only | Direct component styling |
| --raw-radius-round | Raw | 50% | A1, normalized | Token definitions only | Direct component styling |
| --raw-font-sans | Raw | Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif | A1; reduced motion accessibility adjustment | Token definitions only | Direct component styling |
| --raw-font-mono | Raw | ui-monospace, SFMono-Regular, Consolas, monospace | A1; reduced motion accessibility adjustment | Token definitions only | Direct component styling |
| --raw-duration-interaction | Raw | 200ms | A1; reduced motion accessibility adjustment | Token definitions only | Direct component styling |
| --raw-duration-none | Raw | 0ms | A1; reduced motion accessibility adjustment | Token definitions only | Direct component styling |
| --raw-shadow-code-panel | Raw | 0 22px 45px -30px #18332f80 | A1; reduced motion accessibility adjustment | Token definitions only | Direct component styling |
| --background | Semantic | #f6f7f2 / #142c29 | E1 name; A1/P2 | Page background | Cards/actions |
| --foreground | Semantic | #18332f / #e4ece6 | E1 name; A1/P2 | Main text on page/cards | Inverse panels |
| --surface-card | Semantic | #ffffff / #18332f | A1/P2 | Cards and panels | Page background |
| --surface-support | Semantic | #e9efdf / #203d35 | A1/P2 | Supporting information panels | Primary actions |
| --surface-inverse | Semantic | #16312d | A1 | Dark illustration panels | Default page surface |
| --text-muted | Semantic | #627069 / #9fb6aa | A1 + P1/P2 | Secondary text on page/cards | Light support/inverse panels |
| --text-support | Semantic | #5d6f59 / #9fb6aa | A1/P2 | Text on support panels | Unchecked backgrounds |
| --text-accent | Semantic | #547137 / #c7ef83 | A1 + P1/P2 | Emphasis on page/cards/support | Labels on green actions |
| --text-inverse | Semantic | #e4ece6 | A1 | Main text on inverse panels | Light surfaces |
| --text-inverse-muted | Semantic | #9fb6aa | A1, consolidated | Secondary text/line numbers on inverse panels | Light surfaces |
| --action-primary | Semantic | #18332f / #c7ef83 | A1/P2 | Primary action background | Decorative borders |
| --action-primary-hover | Semantic | #31534a / #d6f3a6 | A1/P2 | Primary action hover | Text |
| --text-on-action | Semantic | #ffffff / #142c29 | A1/P2 | Primary action labels | Other surfaces |
| --border-subtle | Semantic | #dce2d9 / #203d35 | A1/P2 | Decorative separators/card outlines | Essential control boundaries |
| --border-control | Semantic | #627069 / #9fb6aa | P1/P2 | Essential control boundaries on page/cards/support | Decorative separators/inverse panels |
| --focus-ring | Semantic | #547137 / #c7ef83 | P1/P2 | Focus outline on page/cards/support; surface-colored offset around actions | Directly against primary buttons |
| --space-related | Semantic | 8px | A1, normalized | Within related groups | Section separation |
| --space-group | Semantic | 24px | A1, normalized | Between groups | Inline icon gaps |
| --space-panel | Semantic | 24px | A1, normalized | Panel padding | Page gutters |
| --space-section | Semantic | 64px; mobile 48px | A1, normalized | Between sections | Within cards |
| --space-page-gutter | Semantic | 40px; mobile 20px | A1 | Page edges | Internal panel padding |
| --radius-control | Semantic | 8px | A1, normalized | Buttons and controls | Large panels |
| --radius-panel | Semantic | 12px | A1, normalized | Cards and support panels | Avatars |
| --font-body | Semantic | Raw sans stack | A1 | UI and prose; Inter if available | Code |
| --font-code | Semantic | Raw mono stack | A1 | Code and step numbers | General prose |
| --motion-duration-interaction | Semantic | 200ms; reduced motion 0ms | A1; accessibility adjustment | Hover/focus transitions | Loading-duration promises |
| --code-panel-radius | Component | 16px | A1 | Code illustration panel | All cards |
| --code-panel-shadow | Component | 0 22px 45px -30px #18332f80 | A1 | Code illustration panel | Every panel |
| --code-syntax-keyword | Component | #c6b4e0 | A1 | Keywords on inverse code surface | General UI text |
| --code-syntax-highlight | Component | #c7ef83 | A1 | Highlights on inverse code surface | Light-surface body text |

## Color pairs and contrast ratios

Calculated from sRGB using WCAG relative luminance. Text requires 4.5:1; essential interface elements require 3:1. Unlisted combinations are not approved. Focus outlines use a surface-colored offset around filled actions. Subtle borders are decorative only.

### Light

- `foreground` / `background` (#18332f / #f6f7f2): **12.56:1**, passes 4.5:1.
- `foreground` / `surface-card` (#18332f / #ffffff): **13.52:1**, passes 4.5:1.
- `foreground` / `surface-support` (#18332f / #e9efdf): **11.51:1**, passes 4.5:1.
- `text-muted` / `background` (#627069 / #f6f7f2): **4.83:1**, passes 4.5:1.
- `text-muted` / `surface-card` (#627069 / #ffffff): **5.20:1**, passes 4.5:1.
- `text-support` / `surface-support` (#5d6f59 / #e9efdf): **4.60:1**, passes 4.5:1.
- `text-accent` / `background` (#547137 / #f6f7f2): **5.14:1**, passes 4.5:1.
- `text-accent` / `surface-card` (#547137 / #ffffff): **5.53:1**, passes 4.5:1.
- `text-accent` / `surface-support` (#547137 / #e9efdf): **4.71:1**, passes 4.5:1.
- `text-on-action` / `action-primary` (#ffffff / #18332f): **13.52:1**, passes 4.5:1.
- `text-on-action` / `action-primary-hover` (#ffffff / #31534a): **8.51:1**, passes 4.5:1.
- `text-inverse` / `surface-inverse` (#e4ece6 / #16312d): **11.54:1**, passes 4.5:1.
- `text-inverse-muted` / `surface-inverse` (#9fb6aa / #16312d): **6.45:1**, passes 4.5:1.
- `code-syntax-keyword` / `surface-inverse` (#c6b4e0 / #16312d): **7.28:1**, passes 4.5:1.
- `code-syntax-highlight` / `surface-inverse` (#c7ef83 / #16312d): **10.65:1**, passes 4.5:1.
- `border-control` / `background` (#627069 / #f6f7f2): **4.83:1**, passes 3:1.
- `border-control` / `surface-card` (#627069 / #ffffff): **5.20:1**, passes 3:1.
- `border-control` / `surface-support` (#627069 / #e9efdf): **4.42:1**, passes 3:1.
- `focus-ring` / `background` (#547137 / #f6f7f2): **5.14:1**, passes 3:1.
- `focus-ring` / `surface-card` (#547137 / #ffffff): **5.53:1**, passes 3:1.
- `focus-ring` / `surface-support` (#547137 / #e9efdf): **4.71:1**, passes 3:1.
- `action-primary` / `background` (#18332f / #f6f7f2): **12.56:1**, passes 3:1.
- `action-primary` / `surface-card` (#18332f / #ffffff): **13.52:1**, passes 3:1.
- `action-primary` / `surface-support` (#18332f / #e9efdf): **11.51:1**, passes 3:1.
### Dark

- `foreground` / `background` (#e4ece6 / #142c29): **12.26:1**, passes 4.5:1.
- `foreground` / `surface-card` (#e4ece6 / #18332f): **11.23:1**, passes 4.5:1.
- `foreground` / `surface-support` (#e4ece6 / #203d35): **9.80:1**, passes 4.5:1.
- `text-muted` / `background` (#9fb6aa / #142c29): **6.85:1**, passes 4.5:1.
- `text-muted` / `surface-card` (#9fb6aa / #18332f): **6.27:1**, passes 4.5:1.
- `text-support` / `surface-support` (#9fb6aa / #203d35): **5.47:1**, passes 4.5:1.
- `text-accent` / `background` (#c7ef83 / #142c29): **11.32:1**, passes 4.5:1.
- `text-accent` / `surface-card` (#c7ef83 / #18332f): **10.37:1**, passes 4.5:1.
- `text-accent` / `surface-support` (#c7ef83 / #203d35): **9.04:1**, passes 4.5:1.
- `text-on-action` / `action-primary` (#142c29 / #c7ef83): **11.32:1**, passes 4.5:1.
- `text-on-action` / `action-primary-hover` (#142c29 / #d6f3a6): **12.12:1**, passes 4.5:1.
- `text-inverse` / `surface-inverse` (#e4ece6 / #16312d): **11.54:1**, passes 4.5:1.
- `text-inverse-muted` / `surface-inverse` (#9fb6aa / #16312d): **6.45:1**, passes 4.5:1.
- `code-syntax-keyword` / `surface-inverse` (#c6b4e0 / #16312d): **7.28:1**, passes 4.5:1.
- `code-syntax-highlight` / `surface-inverse` (#c7ef83 / #16312d): **10.65:1**, passes 4.5:1.
- `border-control` / `background` (#9fb6aa / #142c29): **6.85:1**, passes 3:1.
- `border-control` / `surface-card` (#9fb6aa / #18332f): **6.27:1**, passes 3:1.
- `border-control` / `surface-support` (#9fb6aa / #203d35): **5.47:1**, passes 3:1.
- `focus-ring` / `background` (#c7ef83 / #142c29): **11.32:1**, passes 3:1.
- `focus-ring` / `surface-card` (#c7ef83 / #18332f): **10.37:1**, passes 3:1.
- `focus-ring` / `surface-support` (#c7ef83 / #203d35): **9.04:1**, passes 3:1.
- `action-primary` / `background` (#c7ef83 / #142c29): **11.32:1**, passes 3:1.
- `action-primary` / `surface-card` (#c7ef83 / #18332f): **10.37:1**, passes 3:1.
- `action-primary` / `surface-support` (#c7ef83 / #203d35): **9.04:1**, passes 3:1.

### Corrections and restricted pairs

- Original muted `#697670` / page: **4.41:1** → `#627069`: **4.83:1**.
- Original accent `#6b8c4a` / page: **3.56:1**, large-text-only → `#547137`: **5.14:1** for normal text too.
- Original small green text `#638744` / page: **3.84:1** → accent: **5.14:1**.
- Original step labels `#82907f` / white: **3.36:1** → muted: **5.20:1**.
- Original line numbers `#668179` / inverse: **3.30:1** → inverse muted: **6.45:1**.
- Original focus `#80b64c` / page: **2.24:1** → focus: **5.14:1**.
- Original control border `#b7c4b7` / page: **1.68:1** → control border: **4.83:1**.
- Subtle border `#dce2d9` / white: **1.32:1**; decorative only. Dark subtle border `#203d35` matches its support surface (1:1); never use it for essential boundaries.
- Light muted `#627069` / support: **4.42:1**; use `text-support` (**4.60:1**) instead.
- Existing app foreground/background pairs: light `#171717` / `#ffffff` **17.93:1**; dark `#ededed` / `#0a0a0a` **16.91:1**. These existing files have not been changed.
- No approved value was changed during implementation; the calculated pairs above all pass their applicable thresholds.

## Decisions that are not tokens

- **Principle:** restrained warm background, dark green typography and green accents.
- **Principle:** reserve strong filled styling for the primary action; show keyboard focus clearly.
- **Principle:** use text on role-compatible surfaces; decorative borders must not identify controls.
- **Component trait:** two-column hero stacks on narrow screens.
- **Component trait:** code illustration combines a code window and sample conversation; slight rotation remains local styling.
- **Component trait:** three process cards become a vertical list on mobile.
- **Component trait:** FAQ uses native disclosure interactions.
- **Content rule:** mentor approval precedes confirmation; payment and text sessions happen externally; label sample conversations.
