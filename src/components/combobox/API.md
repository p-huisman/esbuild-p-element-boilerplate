# Combobox Component API Reference

Detailed documentation for the `<pggm-combobox>` and `<pggm-combobox-item>` web components.

---

## Best Practices & UX Guidelines

The combobox is a versatile component combining a text input with a dropdown list. It is best used for selecting from a large set of options where typing to filter is faster than scrolling.

### Usage Guidelines
- **Choose the right input**: Use a combobox when you have more than 10 options. For 5 or fewer options, consider using radio buttons or a standard select.
- **Clear Labels**: Always accompany the combobox with a clear label. Use the `placeholder` attribute to provide a hint about the expected selection.
- **Immediate Feedback**: Ensure that the list updates immediately as users type to provide a responsive feel.

### ✅ Do
- **Use for large datasets**: Ideal for searching through countries, tags, or long lists of users.
- **Provide helpful placeholders**: Use "Search countries..." or "Select categories..." to guide the user.
- **Use icons for context**: Utilize the `start` or `icon` slots to add visual cues that help identify items quickly.

### ❌ Don't
- **Avoid for binary choices**: Don't use a combobox for "Yes/No" or "On/Off" selections. Use a checkbox or switch instead.
- **Don't hide critical info in details**: Remember that content in the `details` slot of a `<pggm-combobox-item>` is not shown in the selected tags.
- **Don't over-limit results**: While `visible-items` can manage height, ensure users can still scroll to find what they need.

---

## `<pggm-combobox>`

A form-associated combobox (single or multi-select) with an inline text filter, keyboard navigation, and an anchored dropdown.

### Attributes

| Attribute | Type | Description |
| :--- | :--- | :--- |
| `open` | `boolean` | Controls dropdown visibility. Reflects the `open` property. |
| `disabled` | `boolean` | Disables the entire control, preventing user interaction. |
| `multiple` | `boolean` | Enables multi-select mode. When active, `value` becomes an array of strings. |
| `required` | `boolean` | Marks the field as required for form validation. |
| `min` | `number` | Minimum number of items that must be selected (multi-select only). |
| `max` | `number` | Maximum number of items that may be selected (multi-select only). |
| `name` | `string` | The name of the control, used when submitting form data. |
| `with-clear` | `boolean` | If present, shows a clear button when a value is selected. |
| `visible-items` | `number` | Limits the dropdown height to this many items before scrolling. |
| `placeholder` | `string` | Placeholder text shown in the text input when empty. |

### Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `open` | `boolean` | Whether the dropdown is currently open. |
| `disabled` | `boolean` | Whether the control is disabled. |
| `multiple` | `boolean` | Whether multi-select mode is active. |
| `required` | `boolean` | Whether the control is required. |
| `min` | `number \| undefined` | Minimum selection count. |
| `max` | `number \| undefined` | Maximum selection count. |
| `name` | `string` | The name of the control. |
| `withClear` | `boolean` | Whether the clear button is enabled. |
| `visibleItems` | `number \| undefined` | The number of visible items before scrolling. |
| `placeholder` | `string` | The placeholder text. |
| `value` | `string \| string[]` | The current value(s) of the combobox. |
| `inputValue` | `string` | The current text in the filter input. |

### Events

| Event | Description |
| :--- | :--- |
| `change` | Fired (bubbles, composed) whenever the selected `value` changes. |

### Slots

| Slot | Description |
| :--- | :--- |
| `-` (default) | The main slot for `<pggm-combobox-item>` elements. |
| `start` | Optional content displayed before the text input (e.g., an icon). |

---

## `<pggm-combobox-item>`

A single selectable option designed to be placed inside a `<pggm-combobox>`.

### Attributes

| Attribute | Type | Description |
| :--- | :--- | :--- |
| `disabled` | `boolean` | Prevents the item from being selected or focused. |
| `selected` | `boolean` | Reflects whether this item is currently selected. |
| `value` | `string` | The value associated with this item. |

### Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `disabled` | `boolean` | Whether the item is disabled. |
| `selected` | `boolean` | Whether the item is selected. |
| `value` | `string` | The value of the item. If empty, falls back to the trimmed text content of the default slot. |

### Events

| Event | Description |
| :--- | :--- |
| `itemSelect` | Bubbles up when the item is activated (via click, Enter, or Space). |
| `itemHover` | Bubbles up when the pointer enters the item. |

### Slots

| Slot | Description |
| :--- | :--- |
| `-` (default) | The primary label text shown in the dropdown and selected tags. |
| `icon` | Optional content shown to the left of the label. |
| `details` | Optional secondary text shown to the right. *Note: Content here is excluded from the combobox's tag labels.* |
