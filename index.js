class fastProfanityFilter {
    #profanityRegex;
    #profanityRegexMatchPartial;
    #illegalWhitespace = /[\u00A0\u1680\u2001-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF\u200B-\u200D\u2060\u2800]/g;
    #strictPattern = /^[a-zA-Z0-9\s.,!?'-]*$/; // Only approved letters, numbers, basic punctuation

    async #loadCheckProfanityRegex() {
        if (!this.#profanityRegex) {
            try {
                let data;
                if (typeof window !== 'undefined') {
                    const response = await fetch('./profanity-list.json');
                    data = await response.json();
                } else {
                    const module = await import('./profanity-list.json', { with: { type: 'json' } });
                    data = module.default;
                }
                const escaped = data.map(word => word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
                this.#profanityRegex = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
                this.#profanityRegexMatchPartial = new RegExp(`(${escaped.join('|')})`, 'gi');
            } catch (error) {
                console.error('Error loading profanity list:', error);
            }
        } else {
            this.#profanityRegex.lastIndex = 0;
            this.#profanityRegexMatchPartial.lastIndex = 0;
        }
    }

    #cleanIllegalWhitespace(text) {
        return text.replace(this.#illegalWhitespace, ' ');
    }

    #concatenateSpacedProfanity(text) {
        const words = text.split(/\s+/);

        for (let i = 0; i < words.length; i++) {
            if (words[i].length > 2 || words[i].length === 0) continue;

            // Find end of short word sequence
            const start = i;
            while (i < words.length && words[i].length <= 2 && words[i].length > 0) i++;

            if (i - start < 3) continue; // Need 3+ words

            const sequence = words.slice(start, i);
            const joined = sequence.join('').toLowerCase();
            const matches = [...joined.matchAll(this.#profanityRegexMatchPartial)];

            if (matches.length > 0) {
                const parts = [];
                let pos = 0;

                matches.forEach(match => {
                    // Add words before profanity
                    let charCount = pos;
                    sequence.forEach(word => {
                        if (charCount >= match.index) return;
                        if (charCount + word.length <= match.index) {
                            parts.push(word);
                            charCount += word.length;
                        }
                    });

                    parts.push(match[0]);
                    pos = match.index + match[0].length;
                });

                // Attach trailing text to last word
                if (pos < joined.length && parts.length) {
                    parts[parts.length - 1] += joined.substring(pos);
                }

                words.splice(start, i - start, ...parts);
                i = start + parts.length - 1;
            } else {
                i--; // Adjust for outer loop increment
            }
        }

        return words.join(' ');
    }

    /**
     * @param {string} text - Text to censor
     * @returns {Promise<string>} censored text
     */
    async censor(text) {
        if (!text || typeof text !== 'string') return text || '';
        await this.#loadCheckProfanityRegex();
        try {
            const cleaned = this.#cleanIllegalWhitespace(text);
            const spacedFixed = this.#concatenateSpacedProfanity(cleaned);
            return spacedFixed.replace(this.#profanityRegex, match => '*'.repeat(match.length));
        } catch (error) {
            console.error("Error censoring text:", error);
            return text; // Return unchanged text
        }
    }

    /**
     * Check for profanity
     * @param {string} text - Text to check
     * @returns {Promise<boolean>} true if approved, false if contains profanity
     */
    async check(text) {
        if (!text || typeof text !== 'string') return text === ''; // Empty string is approved
        await this.#loadCheckProfanityRegex();
        try {
            const cleaned = this.#cleanIllegalWhitespace(text);
            const spacedFixed = this.#concatenateSpacedProfanity(cleaned);
            this.#profanityRegex.lastIndex = 0;
            return !this.#profanityRegex.test(spacedFixed);
        } catch (error) {
            console.error("Error checking text:", error);
            return false; // Disapprove on error
        }
    }

    /**
     * Strict check - only allows approved characters (a-z, A-Z, 0-9, basic punctuation) and no profanity
     * @param {string} text - Text to check
     * @returns {Promise<boolean>} true if approved, false if contains forbidden characters or profanity
     */
    async checkStrict(text) {
        if (!text || typeof text !== 'string') return text === ''; // Empty string is approved
        if (!this.#strictPattern.test(text)) return false; // Reject non-approved characters
        return await this.check(text); // Then check for profanity
    }
}

export default fastProfanityFilter;