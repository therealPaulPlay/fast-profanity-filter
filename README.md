# Fast Profanity Filter

Fast profanity filter with advanced bypass detection for spaced characters, camelCase or PascalCase, and Unicode tricks.
Includes >3000 English curse words.

## Installation

```bash
npm install fast-profanity-filter
```

## Usage

The library supports both Node.js and browser environments.

```javascript
import { censor, check, checkStrict } from 'fast-profanity-filter';

// Censor profanity
const text = await censor('This is a badword'); // "This is a *******"

// Check for profanity
const isClean  = await check('Clean text'); // true
const isClean = await check('Badword'); // false

// Strict checking (only a-z, A-Z, 0-9, basic punctuation)
const isClean = await checkStrict('Hello world!'); // true
const isClean = await checkStrict('Hello 你好'); // false
```

## Detection Examples

| Input | Output | Detects |
|-------|--------|---------|
| `"this is a badword"` | `"this is a *******"` | Basic words |
| `"BADWorD"` | `"*******"` | Case variations |
| `"b a d w o r d"` | `"*******"` | Spaced bypass |
| `"ba d wo r d"` | `"*******"` | Advanced spaced bypass, even with uncommon spaces like hairspaces |
| `"BadwordUser123"` | `"*******User123"` | camelCase or PascalCase + numbers |
| `"This banal pen is good"` | `"This banal pen is good"` | No false positives |