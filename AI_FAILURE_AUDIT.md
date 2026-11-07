
# AI FAILURE AUDIT
## Production React 19 Homework

**Student:** Dinh Nhat Bao Nhi  
**Project:** Production React 19 Homework  
**Repository:** https://github.com/24521258-a11y/production-react19-homework

---

## Failure 1: JSX and CSS File Confusion

### Problem

During Homework 3 development, Vite displayed a parsing error:

```text
[plugin:vite:oxc] Transform failed
[PARSE_ERROR] Unexpected token
src/homework3/AirdropClaims.jsx:2:1

.claim-panel {
```

CSS content had been placed inside a JSX component file, causing the React application to fail compilation.

### Root Cause

The JSX and CSS file contents were mixed during integration. The JSX parser cannot interpret a CSS selector such as `.claim-panel`.

### Fix

The React component was restored in `AirdropClaims.jsx`, while styling rules were placed in `AirdropClaims.css`.

### Result

The application could compile and display the PUBG Arena again.

### Evidence

`HW3_AI_Failure_01_JSX_CSS_Mixup.png`

**AI attribution:** This is a verified integration error. Attribution to AI requires confirmation that the incorrect placement came from AI output or instructions.

---

## Failure 2: Incorrect Piano Keyboard Positioning

### Problem

The initial AI-generated piano implementation calculated black-key positions using the number of white keys preceding each note:

```javascript
position = whiteBefore * WHITE_WIDTH - BLACK_WIDTH / 2;
```

This placed black keys incorrectly. For example, C#4 should appear between C4 and D4, but the calculated position placed its left edge at the boundary after D4 instead of correctly overlapping the C4–D4 gap.

### Root Cause

The AI-generated algorithm counted preceding white keys but did not correctly account for the geometry of black keys relative to adjacent white keys.

### Fix

The black-key position should be calculated relative to the left edge of the preceding white key:

```javascript
position = (whiteCount - 1) * WHITE_WIDTH
  + WHITE_WIDTH
  - BLACK_WIDTH / 2;
```

Equivalently:

```javascript
position = whiteCount * WHITE_WIDTH
  - BLACK_WIDTH / 2;
```

This formula is correct when `whiteCount` is the number of white keys already processed, and the black key belongs between the previous white key and the next one.

### Result

Code review determined that the formula using `whiteCount` in the later version was appropriate. However, the visual keyboard layout still requires verification in the browser before claiming this as a corrected runtime failure.

### Evidence

To be added after visual verification.

**Status:** Candidate issue; not yet verified as an actual AI failure.

---

## Failure 3: Incomplete Memoization in React Piano Keys

### Problem

The first AI-generated `Piano.jsx` used `React.memo` for each piano key:

```jsx
const PianoKey = memo(function PianoKey(props) {
  // Piano key component
});
```

However, `playNote` and `releaseNote` were regular functions recreated whenever the parent component rendered.

```javascript
const playNote = (midi) => {
  // Play a note
};

const releaseNote = (midi) => {
  // Stop a note
};
```

These functions were passed as props to every `PianoKey`.

### Root Cause

`React.memo` performs shallow prop comparison.

When the parent component renders, newly created function references are different from previous references, even if their behavior is unchanged.

As a result, memoization cannot prevent unnecessary child renders caused by changed callback references.

### Fix

The implementation was revised to use `useCallback`:

```javascript
const playNote = useCallback(async (midi) => {
  // Play a note using the audio engine
}, [ensureAudio, syncVoices]);

const releaseNote = useCallback((midi) => {
  // Release the note
}, [syncVoices]);
```

Stable callback references allow memoized keys to avoid unnecessary renders when their other props are unchanged.

### Result

The revised implementation addresses the callback identity problem.

React DevTools Profiler should be used to verify that pressing one key does not unnecessarily rerender unrelated keys.

### Evidence

To be added after React DevTools Profiler testing.

**Status:** Verified code-level design issue in the original AI output; runtime performance improvement still requires measurement.

---

## Lessons Learned

The development process highlighted several important lessons:

1. AI-generated code must be checked for correct file types and syntax.
2. Mathematical positioning algorithms should be tested visually.
3. React.memo alone does not guarantee rendering optimization.
4. Build and lint checks cannot replace functional testing.
5. AI outputs require human review and evidence-based verification.

---

## Verification Checklist

- [ ] Confirm the original source of Failure 1
- [ ] Verify the piano-key geometry before including Failure 2
- [ ] Capture React DevTools Profiler evidence for Failure 3
- [ ] Run `npm run build`
- [ ] Run `npm run lint`
- [ ] Confirm all three cases satisfy the assignment's AI-failure requirement

## Conclusion

This document contains one observed integration failure,
one candidate positioning issue, and one code-level
memoization issue identified in AI-generated code.

The audit should be finalized only after confirming
three genuine AI-caused failures and attaching
appropriate evidence.
