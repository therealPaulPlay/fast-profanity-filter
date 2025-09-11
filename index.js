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
        let result = [...words];
        let i = 0;

        while (i < result.length) {
            if (result[i].length <= 2 && result[i].length > 0) {
                const sequence = [];
                let j = i;

                while (j < result.length && result[j].length <= 2 && result[j].length > 0) {
                    sequence.push(result[j]);
                    j++;
                }

                if (sequence.length >= 3) {
                    const joined = sequence.join('').toLowerCase();

                    // Find ALL profanity matches
                    const matches = [];
                    let match;
                    this.#profanityRegexMatchPartial.lastIndex = 0;
                    while ((match = this.#profanityRegexMatchPartial.exec(joined)) !== null) {
                        matches.push({
                            word: match[0],
                            start: match.index,
                            end: match.index + match[0].length
                        });
                    }

                    if (matches.length > 0) {
                        const newParts = [];
                        let lastEnd = 0;

                        for (const match of matches) {
                            // Add original words before this profanity (preserving case)
                            if (match.start > lastEnd) {
                                const beforeText = joined.substring(lastEnd, match.start);
                                if (beforeText) {
                                    // Map back to original words
                                    let charCount = lastEnd;
                                    for (const word of sequence) {
                                        if (charCount >= match.start) break;
                                        if (charCount + word.length <= match.start) {
                                            newParts.push(word);
                                            charCount += word.length;
                                        } else {
                                            break;
                                        }
                                    }
                                }
                            }

                            // Add profanity word
                            newParts.push(match.word);
                            lastEnd = match.end;
                        }

                        // Add remaining text after last profanity (including punctuation)
                        if (lastEnd < joined.length) {
                            const afterText = joined.substring(lastEnd);
                            if (afterText && newParts.length > 0) {
                                newParts[newParts.length - 1] += afterText;
                            }
                        }

                        result.splice(i, sequence.length, ...newParts);
                        i += newParts.length;
                        continue;
                    }
                }

                i = j;
            } else {
                i++;
            }
        }

        return result.join(' ');
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