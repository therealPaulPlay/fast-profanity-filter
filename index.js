import profanityList from './profanity-list.js';

class fastProfanityFilter {
    #profanityRegex;
    #profanityRegexMatchPartial;
    #illegalWhitespace = /[\u00A0\u1680\u2001-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF\u200B-\u200D\u2060\u2800]/g;
    #strictPattern = /^[a-zA-Z0-9\s.,!?'\-_@#()[\]{}""''<>&+=*%/:;~^$\\|–—`]*$/;

    constructor() {
        // Create two regex patterns from the profanity list - one that matches full words, and one that matches partial profanity (e.g. banal -> includes anal)
        const escaped = profanityList.map(word => word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
        this.#profanityRegex = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
        this.#profanityRegexMatchPartial = new RegExp(`(${escaped.join('|')})`, 'gi');
    }

    // E.g. get "anal" in banal
    #getPartialMatches(text) {
        this.#profanityRegexMatchPartial.lastIndex = 0;
        return [...text.matchAll(this.#profanityRegexMatchPartial)];
    }

    // Universal split profanity handler - works for spaces, dashes, underscores, dots
    #normalizeSplitText(text) {
        // Handle spaced profanity - find sequences of short words only
        const words = text.split(/\s+/);

        for (let i = 0; i < words.length; i++) {
            if (words[i].length > 2 || words[i].length === 0) continue;

            const start = i;
            while (i < words.length && words[i].length <= 2 && words[i].length > 0) i++;
            if (i - start < 3) continue; // Need at least 3 consecutive short words

            const sequence = words.slice(start, i);
            const joined = sequence.join('').toLowerCase();
            const matches = this.#getPartialMatches(joined);

            if (matches.length) {
                // Reconstruct with profanity replaced but spacing preserved
                const parts = [];
                let pos = 0;

                matches.forEach(match => {
                    let charCount = pos;
                    sequence.forEach(word => {
                        if (charCount < match.index && charCount + word.length <= match.index) {
                            parts.push(word);
                            charCount += word.length;
                        }
                    });
                    parts.push(match[0]);
                    pos = match.index + match[0].length;
                });

                if (pos < joined.length && parts.length)
                    parts[parts.length - 1] += joined.substring(pos);

                words.splice(start, i - start, ...parts);
                i = start + parts.length - 1;
            } else {
                i--;
            }
        }

        text = words.join(' ');

        // Handle dash/underscore/dot/asterisk separated profanity
        return text.replace(/\w+[_.*\u2013\u2014-]+(?:\w+[_.*\u2013\u2014-]+)*\w+/g, match => {
            const parts = match.split(/([_.*\u2013\u2014-]+)/);
            const words = parts.filter((_, i) => i % 2 === 0); // odd indices are separators
            const seps = parts.filter((_, i) => i % 2 === 1);

            const processed = words.map(word => this.#getPartialMatches(word).length ? '*'.repeat(word.length) : word);

            // If no individual matches, check pairs then full sequence
            if (processed.every((p, i) => p === words[i])) {
                // Check adjacent pairs
                for (let i = 0; i < words.length - 1; i++) {
                    if (this.#getPartialMatches(words[i] + words[i + 1]).length) {
                        processed[i] = '*'.repeat(words[i].length + words[i + 1].length);
                        processed[i + 1] = '';
                        break;
                    }
                }

                // Check full sequence if still no matches
                if (processed.every((p, i) => p === words[i])) {
                    const joinedWord = words.join('').toLowerCase();
                    this.#getPartialMatches(joinedWord).forEach(match => {
                        let pos = 0;
                        words.forEach((word, i) => {
                            if (match.index < pos + word.length && match.index + match[0].length > pos)
                                processed[i] = '*'.repeat(word.length);
                            pos += word.length;
                        });
                    });
                }
            }

            // Rebuild with separators
            return processed.reduce((acc, word, i) =>
                acc + (word && i > 0 ? seps[i - 1] || '' : '') + word, '');
        });
    }

    #handleCamelCase(text) {
        return text.replace(/\b\w*(?:[a-z][A-Z]|\w\d)\w*\b/g, word => {
            return word.replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/([a-zA-Z])(\d)/g, '$1 $2')
                .split(/\s+/)
                .map(w => {
                    const match = this.#getPartialMatches(w).find(m => m.index === 0 || !/\w/.test(w[m.index - 1]));
                    return match ? w.replace(match[0], '*'.repeat(match[0].length)) : w;
                }).join('');
        });
    }

    censor(text) {
        if (!text || typeof text !== 'string') return text || '';
        try {
            const processed = this.#handleCamelCase(
                this.#normalizeSplitText(
                    text.replace(this.#illegalWhitespace, ' ')
                )
            );
            this.#profanityRegex.lastIndex = 0;
            return processed.replace(this.#profanityRegex, match => '*'.repeat(match.length));
        } catch (error) {
            console.error("Error censoring text:", error);
            return text;
        }
    }

    check(text) {
        if (!text || typeof text !== 'string') return text === '';
        try {
            return text.replace(this.#illegalWhitespace, ' ') === this.censor(text);
        } catch (error) {
            console.error("Error checking text:", error);
            return false;
        }
    }

    checkStrict(text) {
        if (!text || typeof text !== 'string') return text === '';
        return this.#strictPattern.test(text) && this.check(text);
    }
}

const instance = new fastProfanityFilter();

/**
 * Censor profanity in a text with asterisks
 * @param {string} text - Text to censor
 * @returns {string} censored text
 */
export const censor = (text) => instance.censor(text);

/**
 * Check for profanity
 * @param {string} text - Text to check
 * @returns {boolean} true if clean, false if contains profanity
 */
export const check = (text) => instance.check(text);

/**
 * Strict check for profanity - allows common username/chat symbols and no profanity
 * @param {string} text - Text to check
 * @returns {boolean} true if clean, false if contains forbidden characters or profanity
 */
export const checkStrict = (text) => instance.checkStrict(text);