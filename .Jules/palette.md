## 2024-05-14 - Improve a11y for File Imports and Buttons
**Learning:** Found that `<input type="file">` lacking label associations requires an explicit `aria-label` to be accessible, and interactive buttons needed focus-visible states for clear keyboard navigation alongside disabled opacity to prevent dead clicks.
**Action:** Always verify keyboard navigation rings (`focus-visible:ring-2`) and aria labels for inputs lacking explicit `<label>` tags on all form interactions.
