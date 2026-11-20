# apps/web: UI rules

Stack: Next.js (App Router), Tailwind v4, shadcn/ui (neutral theme), Geist font. Tokens live in `shared/styles/globals.css`.

## Rules when implementing a design

1. Use the components from `@/components/ui/*` for everything in the table below. Never re-create them with raw Tailwind.
2. Create a new component only if nothing in `components/ui` fits. Put it next to similar ones and follow the same style (cva variants, `cn()`).
3. Never hardcode colors, radii or fonts. Use token classes (`bg-primary`, `text-muted-foreground`, `border-input`, `rounded-md`, ...).
4. Screens are composed from `features/` and `widgets/` (FSD-like), pages in `app/[locale]/...` stay thin.
5. User-facing strings go through `next-intl` (`t("key")`), not hardcoded.
6. Light/dark comes from the `.dark` class. Check every screen in both themes.
7. Icons: `lucide-react`.

## Components

| Component | Code | Props |
|---|---|---|
| `Button` | `Button` from `@/components/ui/button` | `variant="default\|destructive\|outline\|secondary\|ghost\|link"`; `size="default\|sm\|lg"` (`default` is omitted) |
| `Badge` | `Badge` from `@/components/ui/badge` | `variant="default\|secondary\|destructive\|outline"` |
| `Input` | `Input` from `@/components/ui/input` | `placeholder`, `value` / `defaultValue`, `disabled` |
| `Switch` | `Switch` from `@/components/ui/switch` | `checked` / `defaultChecked` |
| `Card` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` from `@/components/ui/card` | header -> `CardHeader` (+ title/description), content -> `CardContent` |
| Language select | `Select` from `@/components/ui/select` | |
| Nav items, header, logo | existing app shell (`sidebar.tsx`, `shared/ui/Navigation`) | do not rebuild |

Other components already exist in `components/ui` (Select, Alert, Table, Separator, Label, Skeleton, Sheet, Tooltip, Dropdown, Carousel, Chart). Use them directly.

## Tokens

Colors are CSS variables `--<name>` with matching Tailwind classes:

`background`, `foreground`, `card`, `card-foreground`, `popover`, `primary`, `primary-foreground`, `secondary`, `muted`, `muted-foreground`, `accent`, `destructive`, `border`, `input`, `ring`, `sidebar*`.
Example: `--muted-foreground` -> `text-muted-foreground`; `--border` -> `border-border`.

Radius: `rounded-sm|md|lg|xl` (base `--radius` = 0.625rem).
