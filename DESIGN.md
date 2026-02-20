# Design System: Maptamin Local SEO SaaS

## 1. Visual Theme & Atmosphere
The application presents a modern, professional, and trustworthy atmosphere suitable for a B2B SaaS platform. It feels clean, sharp, and highly functional, with an emphasis on data clarity and ease of use. The UI is minimal, avoiding unnecessary visual clutter, allowing the data and key actions to stand out. Generous whitespace creates an airy, organized feel.

## 2. Color Palette & Roles
*   **Primary Brand Color (Mint Green):** `#00C896` - Used for primary actions, prominent accents, highlighting key data points, and active states. It conveys growth, success, and vitality.
*   **Secondary Action Color (Dark Charcoal):** `#001011` - Used for secondary buttons, heavy typography, and deep contrasting elements. It provides a strong, grounding contrast to the bright primary color.
*   **Background Base (Pure White):** `#FFFFFF` - The primary background for content areas, cards, and the main canvas, ensuring maximum readability.
*   **Background Soft (Light Gray):** `#F3F4F6` (e.g., Tailwind `gray-100`) - Used for page backgrounds, subtle section dividers, or secondary container areas to create depth without heavy lines.
*   **Text Primary (Off-Black):** `#1F2937` (e.g., Tailwind `gray-800`) - Used for main body text and headings for high legibility without the starkness of pure black.
*   **Text Secondary (Muted Gray):** `#6B7280` (e.g., Tailwind `gray-500`) - Used for labels, placeholder text, and secondary information.
*   **Surface Borders (Soft Gray):** `#E5E7EB` (e.g., Tailwind `gray-200`) - Used for subtle borders on cards and input fields.

## 3. Typography Rules
*   **Font Family:** A clean, modern sans-serif typeface (e.g., Inter, Roboto, or Geist as configured in the project).
*   **Headers:** Bold and clear with higher contrast (`#001011` or `#1F2937`), using standard hierarchical scaling (h1 to h6).
*   **Body Text:** Regular weight, prioritizing readability.
*   **Lettering:** Standard letter spacing for body text, slightly tightened for large headers to feel more cohesive.

## 4. Component Stylings
*   **Buttons:**
    *   *Primary:* Solid Mint Green (`#00C896`) background with white or very dark text (based on contrast), subtly rounded corners (e.g., `rounded-md`), and a slight shadow or interaction effect on hover.
    *   *Secondary:* Solid Dark Charcoal (`#001011`) background with white text, or an outline style with Dark Charcoal borders.
*   **Cards/Containers:**
    *   Background is typically Pure White (`#FFFFFF`).
    *   Edges have subtly rounded corners (e.g., `rounded-lg`).
    *   Depth is added using soft, diffused drop shadows (e.g., `shadow-sm` or `shadow-md`) rather than heavy borders.
*   **Inputs/Forms:**
    *   Clean inputs with soft gray borders (`#E5E7EB`).
    *   Focus states should highlight using the primary Mint Green (`#00C896`) ring or border.

## 5. Layout Principles
*   **Spacing & Whitespace:** Generous padding and margins (typically multiples of 4px/8px like in Tailwind) to prevent information density from feeling overwhelming.
*   **Alignment:** Clean grid-based alignment. Forms and data should align cleanly to a structured layout.
*   **Hierarchy:** Important elements (like key metrics or primary buttons) should visually dominate through size, color, or placement.
