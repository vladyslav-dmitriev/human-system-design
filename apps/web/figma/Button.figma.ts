// url=https://www.figma.com/design/ZzgUhKGFDQ8tdwVIFsIH2l/App-UI-Kit?node-id=3-45
// source=apps/web/components/ui/button.tsx
// component=Button
import figma from 'figma'

// The selected instance of the Figma "Button" component set.
const instance = figma.selectedInstance

// Figma property "Variant" -> `variant` prop of the code component.
// Every value of the Figma property must be listed, otherwise it renders as undefined.
const variant = instance.getEnum('Variant', {
  default: 'default',
  destructive: 'destructive',
  outline: 'outline',
  secondary: 'secondary',
  ghost: 'ghost',
  link: 'link',
})

// Figma property "Size" -> `size` prop.
const size = instance.getEnum('Size', {
  default: 'default',
  sm: 'sm',
  lg: 'lg',
})

// Omit props that equal the component defaults (cva defaultVariants),
// so the generated snippet looks like what a developer would write.
const variantProp = variant === 'default' ? '' : `variant="${variant}"`
const sizeProp = size === 'default' ? '' : `size="${size}"`

export default {
  example: figma.code`<Button ${variantProp} ${sizeProp}>Button</Button>`,
  imports: ['import { Button } from "@/components/ui/button"'],
  id: 'button',
  metadata: { nestable: true },
}
