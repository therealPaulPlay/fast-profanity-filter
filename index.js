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
        let i = 0;

        while (i < words.length) {
            if (words[i].length <= 2 && words[i].length > 0) {
                // Collect consecutive short words
                const sequence = [];
                let j = i;

                while (j < words.length && words[j].length <= 2 && words[j].length > 0) {
                    sequence.push(words[j]);
                    j++;
                }

                if (sequence.length >= 3) {
                    const joined = sequence.join('').toLowerCase();

                    // Use partial regex to find the profanity word within the joined sequence
                    this.#profanityRegexMatchPartial.lastIndex = 0;
                    const match = this.#profanityRegexMatchPartial.exec(joined);

                    if (match) {
                        // Replace sequence with the ACTUAL profanity word found
                        const newWords = [...words];
                        newWords.splice(i, sequence.length, match[0]);
                        return newWords.join(' ');
                    }
                }

                i = j;
            } else {
                i++;
            }
        }

        return text;
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