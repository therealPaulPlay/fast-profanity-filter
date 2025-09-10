class fastProfanityFilter {
    #profanityRegex;
    #illegalWhitespace = /[\u00A0\u1680\u2001-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF\u200B-\u200D\u2060\u2800]/g;
    #strictPattern = /^[a-zA-Z0-9\s.,!?'-]*$/; // Only approved letters, numbers, basic punctuation

    async #loadCheckProfanityRegex() {
        if (!this.#profanityRegex) {
            try {
                const response = await fetch('./profanity-list.json');
                const data = await response.json();
                const escaped = data.list.map(word => word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
                this.#profanityRegex = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
            } catch (error) {
                console.error('Error loading profanity list:', error);
            }
        }
    }

    /**
     * @param {string} text - Text to censor
     * @returns {Promise<string>} censored text
     */
    async censor(text) {
        if (!text || typeof text !== 'string') return text || '';
        await this.#loadCheckProfanityRegex();
        try {
            const cleaned = text.replace(this.#illegalWhitespace, '');
            return cleaned.replace(this.#profanityRegex, match => '*'.repeat(match.length));
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
            const cleaned = text.replace(this.#illegalWhitespace, '');
            return !this.#profanityRegex?.test(cleaned); // true = approved, false = disapproved
        } catch (error) {
            console.error("Error checking text:", error);
            return false; // Fail safe - disapprove on error
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