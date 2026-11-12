# apps/web: working from Figma designs

Stack: Next.js (App Router), Tailwind v4, shadcn/ui (neutral theme), Geist font. Tokens live in `shared/styles/globals.css`.

## Figma file

UI kit and screens: https://www.figma.com/design/ZzgUhKGFDQ8tdwVIFsIH2l (pages: `Components`, `Screens`).
Code Connect is not available (Starter plan), so the mapping below replaces it.

## Rules when implementing a Figma frame

1. Use the components from `@/components/ui/*` for everything in the table below. Never re-create them with raw Tailwind.
2. Create a new component only if nothing in `components/ui` fits. Put it next to similar ones and follow the same style (cva variants, `cn()`).
3. Never hardcode colors, radii or fonts. Use token classes (`bg-primary`, `text-muted-foreground`, `border-input`, `rounded-md`, ...).
4. Screens are composed from `features/` and `widgets/` (FSD-like), pages in `app/[locale]/...` stay thin.
5. User-facing strings go through `next-intl` (`t("key")`), not hardcoded.
6. Light/dark comes from the `.dark` class. Figma has only the light theme per screen.

## Component mapping (Figma -> code)

| Figma component | Code | Property mapping |
|---|---|---|
| `Button` | `Button` from `@/components/ui/button` | `Variant=default\|destructive\|outline\|secondary\|ghost\|link` -> `variant="..."`; `Size=default\|sm\|lg` -> `size="..."` (`default` is omitted) |
| `Badge` | `Badge` from `@/components/ui/badge` | `Variant=default\|secondary\|destructive\|outline` -> `variant="..."` |
| `Input` | `Input` from `@/components/ui/input` | `State=placeholder` -> `placeholder="..."`; `filled` -> `value`/`defaultValue`; `disabled` -> `disabled` |
| `Switch` | `Switch` from `@/components/ui/switch` | `Checked=true\|false` -> `checked` / `defaultChecked` |
| `Card` (kit) | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` from `@/components/ui/card` | header -> `CardHeader` (+ title/description), content -> `CardContent` |
| Frames named `Card / ...` on screens | same `Card` structure | icon chip + title row -> `CardHeader`; rows below -> `CardContent` |
| Interface language field | `Select` from `@/components/ui/select` | drawn as a filled `Input` in Figma |
| Nav items, header, logo | existing app shell (`sidebar.tsx`, `shared/ui/Navigation`) | do not rebuild |

Components not drawn in the kit yet (Select, Alert, Table, Separator, Label, Skeleton, Sheet, Tooltip, Dropdown, Carousel, Chart) already exist in `components/ui`. Use them directly if a design needs them.

## Tokens (Figma variable -> CSS)

Figma variables `color/<name>` map 1:1 to CSS variables `--<name>` and Tailwind classes:

`background`, `foreground`, `card`, `card-foreground`, `popover`, `primary`, `primary-foreground`, `secondary`, `muted`, `muted-foreground`, `accent`, `destructive`, `border`, `input`, `ring`, `sidebar*`.
Example: `color/muted-foreground` -> `text-muted-foreground`; `color/border` -> `border-border`.

Radius variables: `radius/sm|md|lg|xl` -> `rounded-sm|md|lg|xl` (base `--radius` = 0.625rem).

Text styles: `Text/sm/medium` -> `text-sm font-medium`; `Text/sm/regular` -> `text-sm`; `Text/xs/medium` -> `text-xs font-medium`; `Text/xs/semibold` -> `text-xs font-semibold`; `Text/base/semibold` -> `font-semibold`; `Heading/3xl/bold` -> `text-3xl font-bold`; `Heading/5xl/bold` -> `text-5xl font-bold tracking-tight`; `Heading/2xl/semibold` -> `text-2xl font-semibold`.

## Known gaps in the Figma file

- Icons are gray square placeholders. Use `lucide-react` icons in code.
- Dark-theme screens do not exist (only variables in `Color Dark`).
- Hover/focus states are not drawn. Keep the ones already in the components.
