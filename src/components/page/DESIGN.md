# The Sustainable Architect: A Design System Specification

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Institutional Atelier."** 

In the world of pension management and high-stakes finance, "Standard UI" often feels disposable. We are moving beyond the generic "SaaS dashboard" to create a digital environment that feels built to last—combining the precision of a blueprint with the weight of a legacy institution. 

We break the "template" look by rejecting the rigid grid in favor of **Intentional Asymmetry**. Information density is treated as a luxury, not a chore. By using high-contrast typography scales and overlapping surface layers, we create a sense of architectural depth. We don't just display data; we curate it into an authoritative editorial experience.

---

## 2. Color Strategy
Our palette balances the vitality of `primary` (#008751) with the gravitas of `secondary` (#003168).

### The "No-Line" Rule
To achieve a premium feel, **1px solid borders for sectioning are strictly prohibited.** 
Boundaries must be defined through background color shifts. For example, a `surface-container-low` section should sit directly on a `surface` background. The eye should perceive change through tonal transition, not structural lines.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—stacked sheets of heavy, archival paper.
- **Base Layer:** `surface` (#f7f9fb)
- **Secondary Content:** `surface-container-low` (#f2f4f6)
- **Interactive/Elevated Cards:** `surface-container-lowest` (#ffffff)
- **Deep Insets (Data Tables):** `surface-container-high` (#e6e8ea)

### The "Glass & Gradient" Rule
To soften the institutional tone, use **Glassmorphism** for floating elements (e.g., dropdowns or tooltips). Utilize semi-transparent surface colors with a `backdrop-blur` of 12px.
- **Signature Texture:** Primary CTAs should use a subtle linear gradient (from `primary` to `primary-container`) at a 135-degree angle. This adds "visual soul" and prevents the green from feeling flat or digital.

---

## 3. Typography: The Editorial Voice
We use **Public Sans** to convey institutional clarity. The hierarchy is designed to feel like a financial broadsheet.

*   **Display (Large/Medium):** Used for high-level portfolio totals. These should feel monumental.
*   **Headline (Small/Medium):** Used for section headers. Always paired with generous top-padding (`spacing-16`) to create breathing room.
*   **Body (Medium):** The workhorse for data. We prioritize legibility and a generous line-height (1.5) to handle high information density.
*   **Label (Small):** Used for metadata and table headers. Always uppercase with `letter-spacing: 0.05em` to maintain an "Architectural" feel.

The contrast between a `display-md` value and a `label-sm` category creates the "Editorial" tension required for a premium experience.

---

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering**, not shadows.

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section. This creates a soft, natural lift that feels sophisticated and modern.
*   **Ambient Shadows:** If an element must float (e.g., a modal), use an ultra-diffused shadow: `box-shadow: 0 20px 40px rgba(0, 49, 104, 0.06)`. Note the use of a `secondary` (Navy) tint in the shadow to mimic natural light.
*   **The Ghost Border Fallback:** If a border is required for accessibility in complex data tables, use `outline-variant` at **15% opacity**. Never use 100% opaque lines.

---

## 5. Component Guidelines

### Buttons (The "Architectural" Action)
*   **Primary:** Background: `primary-container` gradient. Border-radius: `DEFAULT` (4px). Text: `on-primary`. 
*   **Secondary:** Background: Transparent. Border: `Ghost Border` (outline-variant @ 20%). Text: `secondary`.
*   **Tertiary:** No background or border. Text: `primary`. Used for low-emphasis actions within data rows.

### Cards & Lists (The "No-Divider" Policy)
*   **Strict Rule:** Forbid the use of divider lines between list items. 
*   **Solution:** Use `spacing-4` vertical white space or a subtle background toggle between `surface-container-low` and `surface-container-lowest` to separate rows. This keeps the UI "breathable."

### Data Tables (High Density)
*   **Header:** `secondary` background with `on-secondary` text. 
*   **Cells:** `body-sm` for maximum data density. 
*   **Hover State:** Transition the row background to `surface-container-highest` to provide clear feedback without adding visual clutter.

### Signature Component: The "Sustainability Indicator"
A custom horizontal gauge using a gradient from `tertiary` (risk) to `primary` (sustainability). It should be slim (4px height) to match the system's precision.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use intentional asymmetry. Align a headline to the left but offset the data card to the right to create visual interest.
*   **Do** use `surface-variant` for inactive or disabled states to maintain the "muted institutional" aesthetic.
*   **Do** prioritize "Type over Tools." Let the typography define the hierarchy, not buttons and boxes.

### Don’t
*   **Don't** use 100% black text. Use `on-surface` (#191c1e) for a softer, more professional reading experience.
*   **Don't** use large rounded corners. Stick strictly to the `4px` (DEFAULT) and `2px` (sm) scale to maintain the "Architectural" precision.
*   **Don't** use standard "Drop Shadows." If it doesn't look like it's naturally catching light, it shouldn't be in the system.

---

## 7. Spacing Scale
Precision is key. Every element must snap to the defined increments.
- **Tight (Information Density):** `spacing-1` (0.2rem) to `spacing-3` (0.6rem).
- **Structural (Sectioning):** `spacing-8` (1.75rem) to `spacing-12` (2.75rem).
- **Heroic (Editorial Breathing Room):** `spacing-24` (5.5rem).

*Director's Note: Every pixel must feel intentional. If an element is floating, ask yourself if it could be grounded by a background shift instead.*