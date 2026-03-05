Responsive Refactor Prompts

# Prompt When No Context Exists

You are continuing the responsive refactor project for this repository.

A full implementation plan already exists in:

`context/responsive_specs.md`

Follow that document as the source of truth.

Your task now is to implement **one chunk of the plan** while ensuring the application remains stable, error-free, and stylistically consistent.

---

## Current Task

Implement the following chunk from the plan:

`[CHUNK NAME / NUMBER HERE]`

Example:

- Chunk 01 — Header  
- Chunk 02 — Sidebar Navigation  
- Chunk 03 — Page 1  

---

## Mandatory Rules

1. Follow the exact strategy defined in `context/responsive_specs.md`.
2. Do **NOT** implement other chunks during this step.
3. Only modify files relevant to this chunk.
4. Do not rewrite working logic unless absolutely necessary for responsiveness.

---

## Response Process

Before making changes:

### Step 1 — Review the chunk section
Review the relevant section in `context/responsive_specs.md`.

### Step 2 — Identify
- Files that must be edited
- Layout issues affecting responsiveness
- Dependencies with shared components

### Step 3 — Plan
Briefly summarize the planned edits.

---

## Implementation Requirements

While implementing the changes:

- Preserve all existing functionality and business logic.
- Maintain current design language and styling conventions.
- Avoid introducing console errors, runtime errors, or type errors.
- Avoid breaking imports, component relationships, or state logic.

Focus specifically on **layout and responsiveness improvements**.

Use best practices such as:

- Responsive layouts (Flexbox / CSS Grid)
- Removal of rigid width constraints
- Clean breakpoint handling
- Stacking layouts for smaller screens
- Preventing horizontal overflow

---

## Code Quality

Ensure the resulting code:

- Compiles successfully
- Passes type checks if applicable
- Introduces no warnings or errors
- Remains readable and maintainable
- Avoids duplicate CSS or unnecessary complexity

---

## Responsive Validation

After implementing changes, verify that:

- Layouts work at common breakpoints
- UI elements remain aligned
- No content overflows the viewport
- Mobile usability is improved
- Desktop layouts remain intact

---

## Final Output

After completing the changes:

1. List the files that were modified.
2. Briefly explain what was improved for responsiveness.
3. Confirm that no logic or structural errors were introduced.
4. Confirm the chunk implementation is complete.

Do **NOT** move to the next chunk automatically. Wait for the next instruction.

---

# Prompt After Context Exists

Continue the responsive refactor project.

The master implementation plan is stored in:

`context/responsive_specs.md`

Use that document as the source of truth.

---

# Prompt when with context

Implement **[CHUNK NAME / NUMBER]** from the plan.

---

## Rules

- Only work on this chunk.
- Only modify files relevant to this chunk.
- Do not implement other chunks yet.
- Preserve all existing business logic and functionality.
- Maintain current design language and styling conventions.

---

## Implementation Guidelines

- Follow the strategy defined in the spec file.
- Improve layout responsiveness without rewriting working logic.
- Prefer flexible layouts (Flexbox / Grid).
- Remove rigid layout constraints where necessary.
- Ensure layouts adapt cleanly to mobile, tablet, and desktop.
- Prevent horizontal overflow and broken UI.

---

## Quality Requirements

- No runtime, console, or type errors.
- No broken imports or component relationships.
- Desktop behavior must remain intact.
- Code should stay clean, readable, and maintainable.

---

## Process

1. Review the chunk section in `context/responsive_specs.md`.
2. Identify files that must be edited.
3. Implement the responsive improvements.
4. Verify layout behavior at common breakpoints.

---

## Completion

After completing the changes:

- List modified files.
- Briefly summarize responsiveness improvements.
- Confirm no logic or structural errors were introduced.

Do **not** proceed to the next chunk automatically.