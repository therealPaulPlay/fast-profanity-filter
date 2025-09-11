class fastProfanityFilter {
    #profanityRegex;
    #profanityRegexMatchPartial;
    #illegalWhitespace = /[\u00A0\u1680\u2001-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF\u200B-\u200D\u2060\u2800]/g;
    #strictPattern = /^[a-zA-Z0-9\s.,!?'-]*$/;

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

    #detectCamelCaseProfanity(text) {
        return text.replace(/\b\w*(?:[a-z][A-Z]|\w\d)\w*\b/g, word => {
            const separated = word.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([a-zA-Z])(\d)/g, '$1 $2');
            const words = separated.split(/\s+/);

            const processedWords = words.map(w => {
                this.#profanityRegexMatchPartial.lastIndex = 0;
                const matches = [...w.matchAll(this.#profanityRegexMatchPartial)];
                for (const match of matches) {
                    if (match.index === 0 || !/\w/.test(w[match.index - 1])) {
                        return w.replace(match[0], '*'.repeat(match[0].length));
                    }
                }
                return w;
            });

            return processedWords.join('');
        });
    }

    #concatenateSpacedProfanity(text) {
        const words = text.split(/\s+/);

        for (let i = 0; i < words.length; i++) {
            if (words[i].length > 2 || words[i].length === 0) continue;

            const start = i;
            while (i < words.length && words[i].length <= 2 && words[i].length > 0) i++;
            if (i - start < 3) continue;

            const sequence = words.slice(start, i);
            const joined = sequence.join('').toLowerCase();
            const matches = [...joined.matchAll(this.#profanityRegexMatchPartial)];

            if (matches.length > 0) {
                const parts = [];
                let pos = 0;

                matches.forEach(match => {
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

                if (pos < joined.length && parts.length) {
                    parts[parts.length - 1] += joined.substring(pos);
                }

                words.splice(start, i - start, ...parts);
                i = start + parts.length - 1;
            } else {
                i--;
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
            const camelFixed = this.#detectCamelCaseProfanity(spacedFixed);
            return camelFixed.replace(this.#profanityRegex, match => '*'.repeat(match.length));
        } catch (error) {
            console.error("Error censoring text:", error);
            return text;
        }
    }

    /**
     * Check for profanity
     * @param {string} text - Text to check
     * @returns {Promise<boolean>} true if approved, false if contains profanity
     */
    async check(text) {
        if (!text || typeof text !== 'string') return text === '';
        try {
            // Normalize the original text first to account for illegal whitespace
            await this.#loadCheckProfanityRegex();
            const normalized = this.#cleanIllegalWhitespace(text);
            const censored = await this.censor(text);
            return normalized === censored;
        } catch (error) {
            console.error("Error checking text:", error);
            return false;
        }
    }

    /**
     * Strict check - only allows approved characters (a-z, A-Z, 0-9, basic punctuation) and no profanity
     * @param {string} text - Text to check
     * @returns {Promise<boolean>} true if approved, false if contains forbidden characters or profanity
     */
    async checkStrict(text) {
        if (!text || typeof text !== 'string') return text === '';
        if (!this.#strictPattern.test(text)) return false;
        return await this.check(text);
    }
}

export default fastProfanityFilter;