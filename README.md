# Fast Profanity Filter

Fast profanity filter with advanced bypass detection for spaced characters, camelCase or PascalCase, and Unicode tricks.
Includes >2000 English curse words.

## Installation

```bash
npm install fast-profanity-filter
```

## Usage

The library supports both Node.js and browser environments.

```javascript
import { censor, check, checkStrict } from 'fast-profanity-filter';

// Censor profanity
const text = censor('This is a badword'); // "This is a *******"

// Check for profanity
const isClean  = check('Clean text'); // true
const isClean = check('Badword'); // false

// Strict checking - only a-z, A-Z, 0-9, basic punctuation and regular symbols
// No letters from other alphabets, no emojis etc.
const isClean = checkStrict('Hello world!'); // true
const isClean = checkStrict('Hello 你好'); // false
```

## Detection examples

| Input | Output | Description |
|-------|--------|---------|
| `"this is a badword"` | `"this is a *******"` | Basic profanity |
| `"BADWorD"` | `"*******"` | Case variations |
| `"b a d w o r d"` | `"*******"` | Weird spacing |
| `"ba d wo r d"` | `"*******"` | Advanced weird spacing, even with uncommon spaces like hairspaces |
| `"Hey, bad-wo_rd!"` | `"Hey, *******"` | Dash, hypen, underscore obfuscation |
| `"Bad-word-is-not-good"` | `"*******-is-not-good"` | Advanced dash, underscore or hypen obfuscation |
| `"BadwordUser123"` | `"*******User123"` | camelCase or PascalCase, even with numbers |
| `"This banal pen is super-good! Y e a h"` | `"This banal pen is super-good! Y e a h"` | No false positives |