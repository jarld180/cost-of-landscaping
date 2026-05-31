export interface PropDefinition {
  name: string
  type: string
  required?: boolean
  default?: string
  description: string
}

export interface SlotDefinition {
  name: string
  description: string
}

export interface EventDefinition {
  name: string
  payload: string
  description: string
}

export interface UsageExample {
  title: string
  code: string
}

export interface ComponentDoc {
  props?: PropDefinition[]
  slots?: SlotDefinition[]
  events?: EventDefinition[]
  examples?: UsageExample[]
}

export const useComponentDocs = () => {
  const docs: Record<string, ComponentDoc> = {
    Eyebrow: {
      props: [
        {
          name: 'text',
          type: 'string',
          required: true,
          description: 'The text to display in the eyebrow'
        },
        {
          name: 'variant',
          type: "'white-blue' | 'blue-blue' | 'white-white'",
          default: "'white-blue'",
          description: 'The visual variant of the eyebrow. White-white variant has #334570 background with white text in both light and dark modes (for use on dark backgrounds).'
        },
        {
          name: 'size',
          type: "'sm' | 'md' | 'lg'",
          default: "'md'",
          description: 'The size of the eyebrow'
        }
      ],
      examples: [
        {
          title: 'White-Blue Variant',
          code: `<Eyebrow text="Homeowners Guide to landscape" variant="white-blue" size="md" />`
        },
        {
          title: 'Blue-Blue Variant',
          code: `<Eyebrow text="How It Works" variant="blue-blue" size="lg" />`
        },
        {
          title: 'White-White Variant (for dark backgrounds)',
          code: `<Eyebrow text="Featured Content" variant="white-white" size="md" />`
        }
      ]
    },

    Badge: {
      props: [
        {
          name: 'text',
          type: 'string',
          required: true,
          description: 'The text to display in the badge'
        },
        {
          name: 'variant',
          type: "'primary-outline' | 'secondary-outline' | 'ghost' | 'blue-blue'",
          default: "'primary-outline'",
          description: 'The visual variant of the badge. Ghost variant has 2px border with no background - black in light mode, white in dark mode. Blue-blue variant has filled background (#edf2fc in light mode, blue-900/30 in dark mode) with no border.'
        },
        {
          name: 'size',
          type: "'sm' | 'md' | 'lg'",
          default: "'md'",
          description: 'The size of the badge'
        },
        {
          name: 'icon',
          type: 'string | null',
          default: 'null',
          description: 'Optional icon name (uses Nuxt Icon). When provided, displays on the left side of the badge text. Example: "heroicons:check-circle"'
        },
        {
          name: 'color',
          type: '[string, string] | null',
          default: 'null',
          description: 'Optional custom colors as [lightModeColor, darkModeColor] hex values. When provided, overrides all variant colors for border and text. Example: ["#FF0000", "#FF6666"]'
        },
        {
          name: 'borderWidth',
          type: "'thin' | 'thick'",
          default: "'thick'",
          description: 'The border thickness of the badge. "thin" applies 1px border, "thick" applies 2px border.'
        }
      ],
      examples: [
        {
          title: 'Primary Outline Variant',
          code: `<Badge text="Featured" variant="primary-outline" size="md" />`
        },
        {
          title: 'Secondary Outline Variant',
          code: `<Badge text="New" variant="secondary-outline" size="sm" />`
        },
        {
          title: 'Large Badge',
          code: `<Badge text="Premium" variant="primary-outline" size="lg" />`
        },
        {
          title: 'Ghost Variant',
          code: `<Badge text="Top Rated" variant="ghost" size="md" />`
        },
        {
          title: 'Blue-Blue Variant',
          code: `<Badge text="Popular" variant="blue-blue" size="md" />`
        },
        {
          title: 'Badge with Icon',
          code: `<Badge text="Verified" variant="primary-outline" icon="heroicons:check-circle" />`
        },
        {
          title: 'Ghost Variant with Icon',
          code: `<Badge text="Top Rated" variant="ghost" icon="heroicons:check-circle" size="md" />`
        },
        {
          title: 'Custom Colors',
          code: `<Badge text="Custom" :color="['#FF0000', '#FF6666']" size="md" />`
        },
        {
          title: 'Custom Colors with Icon',
          code: `<Badge text="Special" :color="['#00AA00', '#66DD66']" icon="heroicons:star" size="md" />`
        },
        {
          title: 'Thin Border',
          code: `<Badge text="Thin" variant="primary-outline" borderWidth="thin" />`
        },
        {
          title: 'Thick Border (Default)',
          code: `<Badge text="Thick" variant="primary-outline" borderWidth="thick" />`
        },
        {
          title: 'Custom Colors with Thin Border',
          code: `<Badge text="Custom Thin" :color="['#DC2626', '#EF4444']" borderWidth="thin" />`
        }
      ]
    },

    Button: {
      props: [
        {
          name: 'text',
          type: 'string',
          required: true,
          description: 'The text to display on the button'
        },
        {
          name: 'variant',
          type: "'primary' | 'secondary' | 'primary-outline' | 'secondary-outline' | 'ghost'",
          default: "'primary'",
          description: 'The visual variant of the button. Ghost variant has no background, border, or horizontal padding - just text and icon.'
        },
        {
          name: 'size',
          type: "'sm' | 'md' | 'lg' | 'xl'",
          default: "'md'",
          description: 'The size of the button'
        },
        {
          name: 'location',
          type: 'string | null',
          default: 'null',
          description: 'The route to navigate to when clicked. If null, button does nothing on click.'
        },
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description: 'Whether the button is disabled'
        },
        {
          name: 'icon',
          type: 'string | null',
          default: 'null',
          description: 'Optional icon name (uses Nuxt Icon). When provided, displays on the right side of the button text. Example: "heroicons:arrow-right"'
        },
        {
          name: 'colors',
          type: '[string, string] | null',
          default: 'null',
          description: 'Optional custom colors as [normalColor, hoverColor] hex values. Behavior depends on variant: primary/secondary uses colors as background (pill style with shadow), ghost uses colors as text colors (transparent background), outline variants use colors for border and text. Example: ["#FFFFFF", "#C0C0C0"]'
        },
        {
          name: 'textColors',
          type: '[string, string] | null',
          default: 'null',
          description: 'Optional custom text colors as [normalColor, hoverColor] hex values. When provided, overrides the default text color for the button. Works with all variants, especially useful with custom background colors. Example: ["#000000", "#333333"]'
        },
        {
          name: 'borderWidth',
          type: "'thin' | 'thick'",
          default: "'thick'",
          description: 'The border width for outline variants. "thin" applies 1px border, "thick" applies 2px border. Only applies to primary-outline, secondary-outline, and secondary variants.'
        }
      ],
      examples: [
        {
          title: 'Basic Usage',
          code: `<Button text="Click Me" variant="primary" size="md" />`
        },
        {
          title: 'With Navigation',
          code: `<Button text="Go Home" location="/" variant="secondary" />`
        },
        {
          title: 'Disabled State',
          code: `<Button text="Disabled" :disabled="true" />`
        },
        {
          title: 'Ghost Variant',
          code: `<Button text="Learn More" variant="ghost" size="md" />`
        },
        {
          title: 'Button with Icon',
          code: `<Button text="View Profile" variant="primary" icon="heroicons:arrow-right" />`
        },
        {
          title: 'Ghost Variant with Icon',
          code: `<Button text="View Profile" variant="ghost" icon="heroicons:arrow-right" size="md" />`
        },
        {
          title: 'Primary with Custom Colors (Pill Style)',
          code: `<Button text="Get Listed Now" variant="primary" :colors="['#FFFFFF', '#C0C0C0']" size="lg" />`
        },
        {
          title: 'Primary with Custom Colors and Text Colors',
          code: `<Button text="Get Listed Now" variant="primary" :colors="['#FFFFFF', '#C0C0C0']" :textColors="['#000000', '#333333']" size="lg" />`
        },
        {
          title: 'Secondary with Custom Colors',
          code: `<Button text="Custom Button" variant="secondary" :colors="['#FF5733', '#C70039']" />`
        },
        {
          title: 'Ghost with Custom Colors (Text Only)',
          code: `<Button text="View Profile" variant="ghost" :colors="['#FFFFFF', '#C0C0C0']" icon="heroicons:arrow-right" />`
        },
        {
          title: 'Primary with Custom Text Colors Only',
          code: `<Button text="Custom Text" variant="primary" :textColors="['#FFFFFF', '#E0E0E0']" />`
        },
        {
          title: 'Thin Border Outline',
          code: `<Button text="View Contractors" variant="primary-outline" borderWidth="thin" />`
        },
        {
          title: 'Thick Border Outline (Default)',
          code: `<Button text="Learn More" variant="secondary-outline" borderWidth="thick" />`
        }
      ]
    },

    Dialog: {
      props: [
        {
          name: 'triggerText',
          type: 'string',
          description: 'The trigger text for the default button'
        },
        {
          name: 'title',
          type: 'string',
          description: 'The dialog title (can also use #title slot)'
        },
        {
          name: 'description',
          type: 'string',
          description: 'The dialog description (can also use #description slot)'
        },
        {
          name: 'showOverlay',
          type: 'boolean',
          default: 'true',
          description: 'Whether to show the overlay backdrop'
        },
        {
          name: 'closeOnOverlayClick',
          type: 'boolean',
          default: 'true',
          description: 'Whether clicking the overlay closes the dialog'
        },
        {
          name: 'showCloseButton',
          type: 'boolean',
          default: 'true',
          description: 'Whether to show the close button (X)'
        },
        {
          name: 'size',
          type: "'sm' | 'md' | 'lg' | 'xl' | 'full'",
          default: "'md'",
          description: 'The size of the dialog'
        },
      ],
      slots: [
        { name: 'trigger', description: 'Custom trigger element (uses as-child pattern)' },
        { name: 'title', description: 'Custom title content' },
        { name: 'description', description: 'Custom description content' },
        { name: 'default', description: 'Main dialog content' },
        { name: 'footer', description: 'Footer actions (buttons, etc.)' },
        { name: 'close', description: 'Custom close button' },
      ],
      events: [
        {
          name: 'update:open',
          payload: 'boolean',
          description: 'Emitted when dialog open state changes'
        },
      ],
      examples: [
        {
          title: 'Basic Usage',
          code: `<Dialog
  trigger-text="Open Dialog"
  title="Welcome"
  description="This is a dialog"
>
  <p>Dialog content here</p>
</Dialog>`
        },
        {
          title: 'With Custom Trigger',
          code: `<Dialog title="Settings">
  <template #trigger>
    <Button text="Open Settings" variant="secondary" />
  </template>
  <p>Settings content</p>
</Dialog>`
        },
        {
          title: 'With Footer Actions',
          code: `<Dialog title="Confirm">
  <template #default>
    <p>Are you sure?</p>
  </template>
  <template #footer>
    <Button text="Cancel" variant="secondary" />
    <Button text="Confirm" variant="primary" />
  </template>
</Dialog>`
        }
      ]
    },

    Popover: {
      props: [
        {
          name: 'triggerText',
          type: 'string',
          default: "'Open'",
          description: 'The trigger text or content'
        },
        {
          name: 'side',
          type: "'top' | 'right' | 'bottom' | 'left'",
          default: "'bottom'",
          description: 'The side where the popover should appear'
        },
        {
          name: 'align',
          type: "'start' | 'center' | 'end'",
          default: "'center'",
          description: 'The alignment of the popover relative to the trigger'
        },
        {
          name: 'sideOffset',
          type: 'number',
          default: '5',
          description: 'The distance in pixels from the trigger'
        },
        {
          name: 'showArrow',
          type: 'boolean',
          default: 'true',
          description: 'Whether to show the arrow'
        },
        {
          name: 'width',
          type: 'string',
          default: "'260px'",
          description: 'Custom width for the popover content'
        },
      ],
      slots: [
        { name: 'trigger', description: 'Custom trigger element (uses as-child pattern)' },
        { name: 'default', description: 'Popover content' },
      ],
      events: [
        {
          name: 'update:open',
          payload: 'boolean',
          description: 'Emitted when popover open state changes'
        },
      ],
      examples: [
        {
          title: 'Basic Usage',
          code: `<Popover trigger-text="Click Me">
  <p>Popover content here</p>
</Popover>`
        },
        {
          title: 'Custom Position',
          code: `<Popover
  trigger-text="Hover Me"
  side="right"
  align="start"
>
  <p>Positioned to the right</p>
</Popover>`
        },
        {
          title: 'With Custom Trigger',
          code: `<Popover>
  <template #trigger>
    <Button text="Info" variant="secondary" />
  </template>
  <p>Additional information</p>
</Popover>`
        }
      ]
    },

    Card: {
      props: [
        {
          name: 'variant',
          type: "'primary' | 'secondary' | 'primary-outline' | 'secondary-outline' | 'secondary-light-outline'",
          default: "'primary'",
          description: 'The visual variant of the card'
        },
        {
          name: 'borderWidth',
          type: "'thin' | 'thick'",
          default: "'thin'",
          description: 'The border width of the card (thin = 1px, thick = 2px)'
        },
        {
          name: 'padding',
          type: 'string',
          default: "'p-6'",
          description: 'The padding class for the card (Tailwind class override)'
        },
        {
          name: 'shadow',
          type: 'boolean',
          default: 'false',
          description: 'Whether to apply shadow and transition effects'
        },
        {
          name: 'icon',
          type: 'string',
          required: false,
          description: 'Optional icon name (uses Nuxt Icon). Example: "heroicons:shield-check"'
        },
        {
          name: 'heading',
          type: 'string',
          required: false,
          description: 'Optional heading text (displays as H2 below the icon)'
        },
        {
          name: 'step',
          type: 'number | null',
          default: 'null',
          description: 'Optional step number. When provided, displays in 2-column layout with step number in blue circle. Icon is hidden on mobile (container < 768px) for better readability.'
        },
        {
          name: 'border',
          type: 'boolean',
          default: 'true',
          description: 'Whether to show borders on the card. When false, all borders are removed.'
        },
        {
          name: 'borderColor',
          type: '[string, string] | null',
          default: 'null',
          description: 'Custom border colors as [light mode, dark mode] hex values. Overrides variant border colors. Example: ["#FF0000", "#00FF00"]'
        },
        {
          name: 'backgroundColors',
          type: '[string, string] | null',
          default: 'null',
          description: 'Custom background colors as [light mode, dark mode] hex values. Overrides variant background colors. Example: ["#FFFFFF", "#000000"]'
        },
      ],
      slots: [
        { name: 'default', description: 'Card content (description/body text)' },
      ],
      examples: [
        {
          title: 'Basic Usage',
          code: `<Card variant="primary">
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</Card>`
        },
        {
          title: 'With Icon and Heading',
          code: `<Card
  variant="primary"
  icon="heroicons:shield-check"
  heading="Sealing Protects from Weather and Wear"
>
  Applying a good-quality landscape sealer every few years shields the driveway from moisture, freeze-thaw damage, and staining, preserving appearance and strength.
</Card>`
        },
        {
          title: 'Icon Only (No Heading)',
          code: `<Card variant="primary" icon="heroicons:check-circle">
  <p>Card with just an icon and description text.</p>
</Card>`
        },
        {
          title: 'Different Variants',
          code: `<Card variant="secondary" border-width="thick">
  <p>Secondary card with thick border</p>
</Card>`
        },
        {
          title: 'With Shadow',
          code: `<Card variant="primary-outline" :shadow="true">
  <p>Card with shadow effect</p>
</Card>`
        },
        {
          title: 'Step-based Layout',
          code: `<Card
  variant="secondary-light-outline"
  icon="heroicons:map"
  heading="Search by ZIP"
  :step="1"
>
  Find local landscape pros by entering your ZIP code, giving you fast access to nearby service options that match your specific project needs.
</Card>`
        },
        {
          title: 'No Border',
          code: `<Card variant="primary" :border="false">
  <p>Card with no border</p>
</Card>`
        },
        {
          title: 'Custom Border Color',
          code: `<Card
  variant="primary"
  :border-color="['#FF0000', '#00FF00']"
>
  <p>Card with custom red border in light mode, green in dark mode</p>
</Card>`
        },
        {
          title: 'Custom Background Colors',
          code: `<Card
  variant="primary"
  :background-colors="['#FFF5F5', '#1A0A0A']"
>
  <p>Card with custom background colors for light and dark modes</p>
</Card>`
        },
        {
          title: 'Custom Border and Background',
          code: `<Card
  :border-color="['#0041D9', '#65B4FF']"
  :background-colors="['#F7F7F7', '#2A2A33']"
  border-width="thick"
>
  <p>Card with fully custom colors</p>
</Card>`
        }
      ]
    },

    DevPageHeader: {
      props: [
        {
          name: 'title',
          type: 'string',
          required: true,
          description: 'The main heading text for the page header (responsive: text-2xl on mobile, text-4xl on tablet+)'
        },
        {
          name: 'description',
          type: 'string',
          required: true,
          description: 'The descriptive text displayed below the title (responsive: text-base on mobile, text-lg on tablet+)'
        },
      ],
      examples: [
        {
          title: 'Basic Usage',
          code: `<DevPageHeader
  title="UI Components Display"
  description="Interactive showcase of all UI components"
/>`
        }
      ]
    },

    DevButtonVariantCard: {
      props: [
        {
          name: 'variantTitle',
          type: 'string',
          required: true,
          description: 'The display name for the button variant (e.g., "Primary Variant")'
        },
        {
          name: 'variant',
          type: "'primary' | 'primary-outline' | 'secondary' | 'secondary-outline'",
          required: true,
          description: 'The button variant type to demonstrate'
        },
        {
          name: 'sampleText',
          type: 'string',
          required: true,
          description: 'The text to display on the sample buttons'
        },
      ],
      examples: [
        {
          title: 'Basic Usage',
          code: `<DevButtonVariantCard
  variant-title="Primary Variant"
  variant="primary"
  sample-text="For Contractors"
/>`
        }
      ]
    },

    DevEyebrowVariantCard: {
      props: [
        {
          name: 'variantTitle',
          type: 'string',
          required: true,
          description: 'The display name for the eyebrow variant (e.g., "White-Blue Variant")'
        },
        {
          name: 'variant',
          type: "'white-blue' | 'blue-blue'",
          required: true,
          description: 'The eyebrow variant type to demonstrate'
        },
        {
          name: 'sampleText',
          type: 'string',
          required: true,
          description: 'The text to display on the sample eyebrows'
        },
        {
          name: 'background',
          type: "'white' | 'light-blue'",
          default: "'white'",
          description: 'The background color of the card to showcase the eyebrow contrast'
        }
      ],
      examples: [
        {
          title: 'Basic Usage',
          code: `<DevEyebrowVariantCard
  variant-title="White-Blue Variant"
  variant="white-blue"
  sample-text="Homeowners Guide to landscape"
  background="light-blue"
/>`
        }
      ]
    },

    DevEyebrowShowcase: {
      props: [],
      examples: [
        {
          title: 'Basic Usage',
          code: `<DevEyebrowShowcase />`
        }
      ]
    },

    DevBadgeVariantCard: {
      props: [
        {
          name: 'variantTitle',
          type: 'string',
          required: true,
          description: 'The display name for the badge variant (e.g., "Primary Outline Variant")'
        },
        {
          name: 'variant',
          type: "'primary-outline' | 'secondary-outline'",
          required: true,
          description: 'The badge variant type to demonstrate'
        },
        {
          name: 'sampleText',
          type: 'string',
          required: true,
          description: 'The text to display on the sample badges'
        }
      ],
      examples: [
        {
          title: 'Basic Usage',
          code: `<DevBadgeVariantCard
  variant-title="Primary Outline Variant"
  variant="primary-outline"
  sample-text="Featured"
/>`
        }
      ]
    },

    DevBadgeShowcase: {
      props: [],
      examples: [
        {
          title: 'Basic Usage',
          code: `<DevBadgeShowcase />`
        }
      ]
    },

    DevButtonShowcase: {
      props: [],
      examples: [
        {
          title: 'Basic Usage',
          code: `<DevButtonShowcase />`
        }
      ]
    },

    DevPopoverShowcase: {
      props: [],
      examples: [
        {
          title: 'Basic Usage',
          code: `<DevPopoverShowcase />`
        }
      ]
    },

    DevDialogShowcase: {
      props: [],
      examples: [
        {
          title: 'Basic Usage',
          code: `<DevDialogShowcase />`
        }
      ]
    },

    DevCardShowcase: {
      props: [],
      examples: [
        {
          title: 'Basic Usage',
          code: `<DevCardShowcase />`
        }
      ]
    },

    SearchInput: {
      props: [
        {
          name: 'placeholder',
          type: 'string',
          default: "'Search Contractors by ZIP Code'",
          description: 'Placeholder text for the input'
        },
        {
          name: 'size',
          type: "'sm' | 'md' | 'lg'",
          default: "'md'",
          description: 'The size of the input'
        },
        {
          name: 'variant',
          type: "'primary-outline' | 'secondary-outline' | 'secondary-light-outline'",
          default: "'primary-outline'",
          description: 'The visual variant (border-based)'
        },
        {
          name: 'maxResults',
          type: 'number',
          default: '5',
          description: 'Maximum autocomplete results to show (autocomplete mode only)'
        },
        {
          name: 'minCharacters',
          type: 'number',
          default: '2',
          description: 'Minimum characters before autocomplete triggers (autocomplete mode only)'
        },
        {
          name: 'loading',
          type: 'boolean',
          default: 'false',
          description: 'Loading state for future API integration'
        },
        {
          name: 'button',
          type: 'string | null',
          default: 'null',
          description: 'Button text. If provided, component shows button instead of autocomplete. On mobile, button shows icon only; on desktop, shows text.'
        },
        {
          name: 'backgroundColor',
          type: '[string, string] | null',
          default: 'null',
          description: 'Custom background colors as [lightMode, darkMode] hex values. When provided, overrides the default background colors. Example: ["#FFFFFF", "#1F2937"]'
        },
        {
          name: 'serviceDropdownValues',
          type: 'ServiceOption[] | null',
          default: 'null',
          description: 'Service dropdown options. When provided, shows inline service selector. ServiceOption: { id: number | null, name: string, slug: string | null }'
        }
      ],
      events: [
        {
          name: 'submit',
          payload: 'ZipCodeData | string | { location: string, service: ServiceOption | null }',
          description: 'Emitted when user selects autocomplete result (ZipCodeData), clicks button (string), or submits with service dropdown (object with location and service)'
        },
        {
          name: 'input',
          payload: 'string',
          description: 'Emitted on input change with current search query'
        }
      ],
      examples: [
        {
          title: 'Autocomplete Mode',
          code: `<SearchInput
  placeholder="Search Contractors by ZIP Code"
  variant="primary-outline"
  size="md"
  @submit="handleZipSelect"
/>`
        },
        {
          title: 'Button Mode',
          code: `<SearchInput
  placeholder="ZIP Code"
  variant="primary-outline"
  size="lg"
  button="Find Contractors"
  @submit="handleSearch"
/>`
        },
        {
          title: 'With Loading State',
          code: `<SearchInput
  :loading="true"
  placeholder="Searching..."
/>`
        },
        {
          title: 'With Custom Background Colors',
          code: `<SearchInput
  placeholder="Search by ZIP Code"
  :backgroundColor="['#FFFFFF', '#1F2937']"
  variant="primary-outline"
  size="md"
/>`
        },
        {
          title: 'Button Mode with Custom Background',
          code: `<SearchInput
  placeholder="ZIP Code"
  button="Search"
  :backgroundColor="['#F3F4F6', '#374151']"
  variant="secondary-outline"
  size="lg"
/>`
        },
        {
          title: 'With Service Dropdown',
          code: `<script setup>
const services = [
  { id: null, name: 'All Services', slug: null },
  { id: 1, name: 'Driveways', slug: 'driveways' },
  { id: 2, name: 'Patios', slug: 'patios' },
  { id: 3, name: 'Foundations', slug: 'foundations' }
]

const handleSubmit = (data) => {
  console.log('Location:', data.location)
  console.log('Service:', data.service)
}
</script>

<SearchInput
  placeholder="ZIP Code"
  button="Find Contractors"
  :service-dropdown-values="services"
  variant="primary-outline"
  size="md"
  @submit="handleSubmit"
/>`
        }
      ]
    },

    DevSearchInputVariantCard: {
      props: [
        {
          name: 'variantTitle',
          type: 'string',
          required: true,
          description: 'The display name for the variant'
        },
        {
          name: 'variant',
          type: "'primary-outline' | 'secondary-outline' | 'secondary-light-outline'",
          required: true,
          description: 'The variant type to demonstrate'
        },
        {
          name: 'buttonMode',
          type: 'boolean',
          default: 'false',
          description: 'Whether to show button mode'
        },
        {
          name: 'buttonText',
          type: 'string',
          default: "'Find Contractors'",
          description: 'Button text for button mode'
        }
      ],
      examples: [
        {
          title: 'Autocomplete Mode',
          code: `<DevSearchInputVariantCard
  variant-title="Primary Outline Variant"
  variant="primary-outline"
/>`
        },
        {
          title: 'Button Mode',
          code: `<DevSearchInputVariantCard
  variant-title="Primary Outline Variant"
  variant="primary-outline"
  :button-mode="true"
  button-text="Find Contractors"
/>`
        }
      ]
    },

    DevSearchInputShowcase: {
      props: [],
      examples: [
        {
          title: 'Basic Usage',
          code: `<DevSearchInputShowcase />`
        }
      ]
    },

    Header: {
      props: [],
      examples: [
        {
          title: 'Basic Usage',
          code: `<Header />`
        }
      ]
    },

    Divider: {
      props: [
        {
          name: 'orientation',
          type: "'horizontal' | 'vertical'",
          default: "'horizontal'",
          description: 'The orientation of the divider'
        },
        {
          name: 'spacing',
          type: "'none' | 'sm' | 'md' | 'lg'",
          default: "'none'",
          description: 'The spacing around the divider'
        },
        {
          name: 'variant',
          type: "'solid' | 'dashed' | 'dotted'",
          default: "'solid'",
          description: 'The style of the divider line'
        }
      ],
      examples: [
        {
          title: 'Horizontal Divider',
          code: `<Divider />`
        },
        {
          title: 'Horizontal with Spacing',
          code: `<Divider spacing="md" />`
        },
        {
          title: 'Dashed Divider',
          code: `<Divider variant="dashed" spacing="md" />`
        },
        {
          title: 'Vertical Divider',
          code: `<Divider orientation="vertical" spacing="md" />`
        }
      ]
    },

    Hero: {
      props: [],
      examples: [
        {
          title: 'Basic Usage',
          code: `<Hero />`
        }
      ]
    },

    HowItWorks: {
      props: [],
      examples: [
        {
          title: 'Basic Usage',
          code: `<HowItWorks />`
        }
      ]
    },

    ExploreCategories: {
      props: [],
      examples: [
        {
          title: 'Basic Usage',
          code: `<ExploreCategories />`
        }
      ]
    },

    TopContractors: {
      props: [],
      examples: [
        {
          title: 'Basic Usage',
          code: `<TopContractors />`
        }
      ]
    },

    HomeownerTips: {
      props: [],
      examples: [
        {
          title: 'Basic Usage',
          code: `<HomeownerTips />`
        }
      ]
    },

    BottomCta: {
      props: [],
      examples: [
        {
          title: 'Basic Usage',
          code: `<BottomCta />`
        }
      ]
    },

    Footer: {
      props: [],
      examples: [
        {
          title: 'Basic Usage',
          code: `<Footer />`
        }
      ]
    },

    ContractorCard: {
      props: [
        {
          name: 'image',
          type: 'string | null',
          default: 'null',
          description: 'The image URL or path to the contractor\'s image. Automatically uses standard img tag for webp/png formats and NuxtImage for other formats (jpg, jpeg, etc.) to avoid IPX processing issues.'
        },
        {
          name: 'companyName',
          type: 'string',
          required: true,
          description: 'The contractor\'s company name'
        },
        {
          name: 'location',
          type: 'string',
          required: true,
          description: 'The contractor\'s location (e.g., "Houston, TX")'
        },
        {
          name: 'rating',
          type: 'number',
          required: true,
          description: 'The contractor\'s rating (0-5)'
        },
        {
          name: 'reviewCount',
          type: 'number',
          required: true,
          description: 'The number of reviews'
        },
        {
          name: 'contractorId',
          type: 'string',
          required: true,
          description: 'The contractor\'s unique identifier (UUID)'
        },
        {
          name: 'contractorSlug',
          type: 'string',
          required: true,
          description: 'The contractor\'s SEO-friendly slug for URL routing'
        },
        {
          name: 'border',
          type: 'boolean',
          default: 'true',
          description: 'Whether to display a border around the card'
        },
        {
          name: 'borderWidth',
          type: "'thin' | 'thick'",
          default: "'thin'",
          description: 'The width of the border (thin = 1px, thick = 2px)'
        },
        {
          name: 'variant',
          type: "'primary' | 'secondary' | 'primary-outline' | 'secondary-outline' | 'secondary-light-outline'",
          default: "'secondary-light-outline'",
          description: 'The visual variant of the card'
        }
      ],
      slots: [
        {
          name: 'default',
          description: 'Card content area for company description or additional details'
        }
      ],
      examples: [
        {
          title: 'Basic Usage',
          code: `<ContractorCard
  image="https://example.com/contractor.jpg"
  company-name="SolidStone landscape LLC"
  location="Houston, TX"
  :rating="4.9"
  :review-count="124"
  contractor-id="abc-123-def-456"
  contractor-slug="solidstone-landscape-llc"
>
  Driveways, patios, and foundation work for residential and light commercial projects since 2008.
</ContractorCard>`
        },
        {
          title: 'With Webp Image',
          code: `<ContractorCard
  image="/images/contractor.webp"
  company-name="PrimePour Contractors"
  location="Phoenix, AZ"
  :rating="4.8"
  :review-count="88"
  contractor-id="xyz-789-ghi-012"
  contractor-slug="primepour-contractors"
>
  Decorative and stamped landscape specialists delivering clean finishes and long-lasting performance.
</ContractorCard>`
        },
        {
          title: 'Without Image',
          code: `<ContractorCard
  company-name="BluePeak landscape"
  location="Houston, TX"
  :rating="4.9"
  :review-count="42"
  contractor-id="def-456-jkl-789"
  contractor-slug="bluepeak-landscape"
  variant="primary-outline"
>
  Engineered foundations, slabs, and garage floors—built for mountain climates.
</ContractorCard>`
        },
        {
          title: 'Different Variants',
          code: `<ContractorCard
  image="https://example.com/contractor.jpg"
  company-name="Elite landscape Works"
  location="Dallas, TX"
  :rating="5.0"
  :review-count="200"
  contractor-id="mno-345-pqr-678"
  contractor-slug="elite-landscape-works"
  variant="primary"
  border-width="thick"
>
  Premium landscape solutions with 20+ years of experience in residential and commercial projects.
</ContractorCard>`
        }
      ]
    },

    FilterSelect: {
      props: [
        {
          name: 'label',
          type: 'string',
          default: 'undefined',
          description: 'Optional label text displayed above the select'
        },
        {
          name: 'modelValue',
          type: 'string | number | null',
          required: true,
          description: 'The current selected value (use with v-model)'
        },
        {
          name: 'options',
          type: 'FilterOption[]',
          required: true,
          description: 'Array of options to display. FilterOption: { value: string | number, label: string, disabled?: boolean }'
        },
        {
          name: 'placeholder',
          type: 'string',
          default: "'Select...'",
          description: 'Placeholder text when no option is selected'
        },
        {
          name: 'size',
          type: "'sm' | 'md' | 'lg'",
          default: "'md'",
          description: 'The size of the select dropdown'
        },
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description: 'Whether the select is disabled'
        }
      ],
      events: [
        {
          name: 'update:modelValue',
          payload: 'string | number | null',
          description: 'Emitted when the selected value changes. Use with v-model for two-way binding.'
        }
      ],
      examples: [
        {
          title: 'Basic Usage',
          code: `<script setup>
import type { FilterOption } from '~/components/ui/form/FilterSelect.vue'

const selectedService = ref(null)

const serviceOptions: FilterOption[] = [
  { value: 'all', label: 'All Services' },
  { value: 'driveways', label: 'Driveways' },
  { value: 'patios', label: 'Patios' }
]
</script>

<template>
  <FilterSelect
    v-model="selectedService"
    :options="serviceOptions"
    placeholder="Select service"
  />
</template>`
        },
        {
          title: 'With Label',
          code: `<FilterSelect
  v-model="selectedRating"
  label="Minimum Rating"
  :options="ratingOptions"
  placeholder="Select rating"
  size="md"
/>`
        },
        {
          title: 'Different Sizes',
          code: `<!-- Small -->
<FilterSelect
  v-model="value"
  :options="options"
  size="sm"
/>

<!-- Medium (default) -->
<FilterSelect
  v-model="value"
  :options="options"
  size="md"
/>

<!-- Large -->
<FilterSelect
  v-model="value"
  :options="options"
  size="lg"
/>`
        },
        {
          title: 'Disabled State',
          code: `<FilterSelect
  v-model="value"
  :options="options"
  :disabled="true"
  placeholder="Disabled select"
/>`
        },
        {
          title: 'With useSearchFilters Composable',
          code: `<script setup>
const contractors = ref([...])
const { filters, filteredResults } = useSearchFilters(contractors.value)

const serviceOptions: FilterOption[] = [
  { value: 'all', label: 'All Services' },
  { value: 'driveways', label: 'Driveways' }
]
</script>

<template>
  <FilterSelect
    v-model="filters.serviceType"
    :options="serviceOptions"
    placeholder="Service Type"
  />

  <!-- Results update automatically -->
  <div v-for="result in filteredResults" :key="result.id">
    {{ result.companyName }}
  </div>
</template>`
        }
      ]
    },
  }

  return { docs }
}

