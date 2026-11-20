# apps/web: правила UI

Стек: Next.js (App Router), Tailwind v4, shadcn/ui (тема neutral), шрифт Geist. Токены лежат в `shared/styles/globals.css`.

## Правила при реализации дизайна

1. Для всего из таблицы ниже используй компоненты из `@/components/ui/*`. Не пересоздавай их на голом Tailwind.
2. Новый компонент создавай, только если в `components/ui` ничего не подходит. Клади его рядом с похожими и держи тот же стиль (cva-варианты, `cn()`).
3. Никаких захардкоженных цветов, радиусов и шрифтов. Только классы токенов (`bg-primary`, `text-muted-foreground`, `border-input`, `rounded-md`, ...).
4. Экраны собираются из `features/` и `widgets/` (FSD-подобно), страницы в `app/[locale]/...` остаются тонкими.
5. Пользовательские тексты только через `next-intl` (`t("key")`), без хардкода.
6. Светлая и тёмная тема задаётся классом `.dark`. Проверяй каждый экран в обеих темах.
7. Иконки: `lucide-react`.

## Компоненты

| Компонент | Код | Props |
|---|---|---|
| `Button` | `Button` из `@/components/ui/button` | `variant="default\|destructive\|outline\|secondary\|ghost\|link"`; `size="default\|sm\|lg"` (`default` опускается) |
| `Badge` | `Badge` из `@/components/ui/badge` | `variant="default\|secondary\|destructive\|outline"` |
| `Input` | `Input` из `@/components/ui/input` | `placeholder`, `value` / `defaultValue`, `disabled` |
| `Switch` | `Switch` из `@/components/ui/switch` | `checked` / `defaultChecked` |
| `Card` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` из `@/components/ui/card` | шапка → `CardHeader` (+ title/description), содержимое → `CardContent` |
| Выбор языка | `Select` из `@/components/ui/select` | |
| Пункты меню, шапка, логотип | существующий каркас приложения (`sidebar.tsx`, `shared/ui/Navigation`) | не пересобирай |

Другие компоненты уже есть в `components/ui` (Select, Alert, Table, Separator, Label, Skeleton, Sheet, Tooltip, Dropdown, Carousel, Chart). Используй их напрямую.

## Токены

Цвета это CSS-переменные `--<name>` с одноимёнными классами Tailwind:

`background`, `foreground`, `card`, `card-foreground`, `popover`, `primary`, `primary-foreground`, `secondary`, `muted`, `muted-foreground`, `accent`, `destructive`, `border`, `input`, `ring`, `sidebar*`.
Пример: `--muted-foreground` → `text-muted-foreground`; `--border` → `border-border`.

Радиус: `rounded-sm|md|lg|xl` (базовый `--radius` = 0.625rem).
