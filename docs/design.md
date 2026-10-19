# Design Philosophy

Oshimochi should feel like a personal collection desk: warm, tactile, and a
little playful, with the collection itself taking priority. The rounded
`オシもち。` wordmark sets the tone through its weight, soft corners, and accent
punctuation.

This guide records the design established by My collection, the shared shell,
and the item detail dialog. Use those implementations as references when
updating other views. Their individual workflows can keep different layouts.
Unfinished work belongs in the [Roadmap](roadmap.md).

## Content And Hierarchy

Give each view a clear title that matches its navigation label. Use a strong
heading, a restrained decorative motif, and a readable content area. My
collection uses keepsake cards beside its title; the mascot anchors the sidebar.

Build the reading order around what users came to see: pictures, names, values,
and useful status. Place secondary explanations behind Details or a disclosure.
Keep routine editing actions in a three-dot menu; an explicit edit mode exposes
rearrangement controls only while needed.

Use space according to the content. A simple counter takes less room than a
breakdown or an image list. Independent card heights keep the collection desk
compact. Forms and tables can use aligned rows where comparison matters.

## Color And Surfaces

Light mode uses cream and warm paper surfaces; dark mode uses charcoal with a
soft light text color. Use the semantic tokens in
[foundation.css](../src/styles/foundation.css), which own both themes and the
selected accent.

| Role | Tokens | Use |
| --- | --- | --- |
| Page and paper | `--bg`, `--surface`, `--surface-muted` | Separate the workspace, cards, and secondary areas |
| Text | `--text`, `--muted` | Keep primary content strong and supporting copy quieter |
| Edges | `--line`, `--line-strong` | Define cards, controls, and separators |
| Emphasis | `--accent`, `--accent-ink` | Selected state, standalone values, and brand punctuation |
| Accent surfaces | `--accent-soft`, `--accent-tint` | Give selected controls and secondary emphasis a soft fill |
| Accent text | `--accent-foreground` | Keep text readable on a solid accent background |
| Focus and danger | `--focus-ring`, `--danger` | Identify keyboard focus and destructive actions |

Use the accent selectively. A standalone number can carry the accent; a number
inside an accent-colored ring stays neutral. Breakdown segments use shades of
the selected accent, and their detail includes a name, value, and percentage so
users can identify them without matching subtle shades.

Choose the appropriate token instead of copying a color literal into another
view. For example, `--accent-ink` handles the darker yellow used for readable
text in light mode. The existing brand artwork keeps its own documented color
roles.

## Shape And Depth

Cards resemble small pieces of paper. My collection uses generous corners of
roughly 24–30px with one distinctly tighter 3px corner. Alternate the tight
corner where it helps distinguish card roles. Smaller controls and navigation
use smaller radii appropriate to their size.

Give edges enough weight to remain visible against warm surfaces: dashboard
cards and controls generally use a 1.5px border. Short downward shadows of
roughly 3–4px suggest a paper edge. Within the dashboard, `--card-edge` and
`--paper-shadow` derive those colors from the theme.

Use decoration sparingly and give it a clear role. Framed, slightly tilted
thumbnails suggest collected keepsakes. The selected navigation tab uses a
compact speech-bubble outline, with its pointer facing the content on desktop
and downward in the narrow navigation. Hover and selection share that outline.

See [dashboard.css](../src/styles/dashboard.css) for card and keepsake shapes,
[foundation.css](../src/styles/foundation.css) for navigation, and
[responsive.css](../src/styles/responsive.css) for its narrow presentation.

## Typography And Labels

Use the existing language-aware UI font stack. The wordmark is separate SVG
artwork; its font and licensing provenance live in
[Development](development.md#change-the-branding).

Use weight to establish hierarchy. My collection's view title is 32px and
heavy; card titles are smaller and strong. Body text stays comfortable to read.
Keep the view title's size steady as the viewport changes, and adapt the layout
around it. Long card titles use one line with an ellipsis and retain their full
text in the title attribute.

Result numbers have a clear hierarchy without overwhelming the card. Keep
decimal precision stable during count-up motion. Units sit beside the value
when they fit, or on one additional ellipsized line. The full unit remains
available in its title and the value's accessible label.

The decorative title period follows the accent. Its spacing and vertical
position are optically adjusted for English, Japanese, and Traditional Chinese.
Use the existing `.collection-period` treatment as the reference, and inspect
all three languages when changing a heading.

## Controls And Dialogs

Present short, fixed sets of choices as labeled option strips, as the card
editor does for calculation, grouping, display, and units. Use a dropdown when
the choices come from the user's data, such as fields within a collection.
Optional controls can share a heading row so they do not dominate the form.

Keep the primary action clear. Align checkboxes with their labels and group
scope settings together. Show calculation rules on request. Explain unavailable
references by naming the affected collection or field and the action needed to
fix them.

Dialogs keep a stable responsive frame while their content changes. Scroll
changing content inside that frame so calculations and option changes do not
shift the dialog. The page and card editor use overlay scrollbars that leave
the content width unchanged.

The item detail dialog reserves a large, persistent picture area beside the
text on desktop, with the picture above the text on narrow screens. Missing or
failed images have an explicit state. Opening and closing use the shared dialog
motion, and closing returns focus to the originating control.

See [card editor elements](../src/views/dashboard/dashboard-elements.js),
[choice controls](../src/views/dashboard/choice-control.js), and
[item detail dialog](../src/views/items/item-detail-dialog.js).

## Motion And Interaction

Motion should explain a change while keeping the content easy to follow.
Cards move from their visible positions when the layout changes, rather than
jumping to a new layout before animating. Small settling tilts suggest inertia;
the edit-mode wiggle makes rearrangement available without a permanent toolbar.

Use the shared interaction timing tokens, generally below 200ms. Dashboard
count and ring reveals take 600ms so users can follow them. Counters slow
toward the final value; rings reveal along their circumference. Start reveals
when visible and prepare their initial state before paint.

A ring selects its largest segment by default. Hover or keyboard focus
temporarily previews another segment while the pin stays selected. A click
changes the pin, and returning to the view restores the default. Lift and
thickness emphasize the active part, with a pointer-adjacent tooltip for hover.
Touch and keyboard controls expose the same information.

Respect reduced motion by presenting final values and positions directly.
Preserve scroll position through resizing and quiet refreshes. Keep lettering
and stroke widths steady during card movement. Technical ownership and timing
details live in [Development](development.md#change-styles-or-motion).

## Applying The Style To Another View

1. Keep its established workflow and choose a layout suited to its content.
2. Reuse the shared palette, typography, control shapes, and motion helpers.
3. Establish one clear title and reading order, then add restrained decoration.
4. Put secondary explanations and editing controls at the point of need.
5. Verify light and dark themes, accent choices, all three languages, narrow
   layouts, long names and units, and empty, loading, and error states.
6. Check keyboard focus, touch targets, reduced motion, and scroll stability.

Reuse existing components when their interaction fits. Shared tokens belong in
`foundation.css`; view-specific composition belongs in the owning stylesheet.
Keep screenshots and browser checks focused on the workflow and layout risks
described in [Testing](testing.md).
