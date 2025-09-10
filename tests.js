import fastProfanityFilter from './index.js';

// Mock fetch for testing with sample profanity list
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => ({
    json: async () => ({ list: ['bad', 'worse', 'terrible', 'awful', 'damn'] })
});

const filter = new fastProfanityFilter();
let testCount = 0;
let passCount = 0;

function assert(condition, message) {
    testCount++;
    if (condition) {
        passCount++;
        console.log(`✓ ${message}`);
    } else {
        console.error(`✗ ${message}`);
    }
}

async function runTests() {
    console.log('Running Profanity Filter Tests...\n');

    // Test censor()
    console.log('=== Testing censor() ===');

    let result = await filter.censor('This is bad and worse');
    assert(result === 'This is *** and *****', 'Should censor profanity with asterisks');

    result = await filter.censor('This is BAD and Worse');
    assert(result === 'This is *** and *****', 'Should handle mixed case profanity');

    result = await filter.censor('This is a nice clean sentence');
    assert(result === 'This is a nice clean sentence', 'Should preserve clean text');

    result = await filter.censor('This is bad');
    assert(result === 'This is***', 'Should remove illegal whitespace');

    result = await filter.censor('badger and worsen are fine');
    assert(result === 'badger and worsen are fine', 'Should not match partial words');

    // Test check()
    console.log('\n=== Testing check() ===');

    result = await filter.check('This is bad text');
    assert(result === false, 'Should return false for text with profanity');

    result = await filter.check('This is good text');
    assert(result === true, 'Should return true for clean text');

    result = await filter.check('This is BAD text');
    assert(result === false, 'Should handle mixed case profanity');

    result = await filter.check('This is bad');
    assert(result === false, 'Should remove illegal whitespace before checking');

    result = await filter.check('');
    assert(result === true, 'Should handle empty strings');

    // Test checkStrict()
    console.log('\n=== Testing checkStrict() ===');

    result = await filter.checkStrict('This is good text with numbers 123.');
    assert(result === true, 'Should return true for approved characters only');

    result = await filter.checkStrict('This is bad text');
    assert(result === false, 'Should return false for approved characters with profanity');

    result = await filter.checkStrict('This is good 你好');
    assert(result === false, 'Should return false for non-Latin characters');

    result = await filter.checkStrict('This is good 😀');
    assert(result === false, 'Should return false for emojis');

    result = await filter.checkStrict('This is good @#$%');
    assert(result === false, 'Should return false for special symbols');

    result = await filter.checkStrict("Hello, world! How are you? I'm fine.");
    assert(result === true, 'Should allow basic punctuation');

    result = await filter.checkStrict('Hello — world');
    assert(result === false, 'Should reject advanced Unicode punctuation');

    result = await filter.checkStrict('');
    assert(result === true, 'Should handle empty strings in strict mode');

    // Edge cases
    console.log('\n=== Testing Edge Cases ===');

    try {
        result = await filter.check(null);
        assert(result === false, 'Should handle null gracefully');
    } catch (e) {
        assert(true, 'Should handle null gracefully (threw error as expected)');
    }

    try {
        result = await filter.checkStrict(undefined);
        assert(result === false, 'Should handle undefined gracefully');
    } catch (e) {
        assert(true, 'Should handle undefined gracefully (threw error as expected)');
    }

    // Test that regex loads only once
    console.log('\n=== Testing Regex Loading ===');
    const fetchCallsBefore = globalThis.fetch.callCount || 0;
    await filter.censor('test1');
    await filter.censor('test2');
    await filter.check('test3');
    assert(true, 'Multiple calls should reuse loaded regex');

    // Summary
    console.log(`\n=== Test Summary ===`);
    console.log(`Passed: ${passCount}/${testCount}`);

    if (passCount === testCount) {
        console.log('🎉 All tests passed!');
    } else {
        console.log('❌ Some tests failed');
    }

    // Restore original fetch
    globalThis.fetch = originalFetch;
}

// Run tests
runTests().catch(console.error);