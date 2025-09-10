import fastProfanityFilter from './index.js';

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

    let result = await filter.censor('This is damn and bitch');
    assert(result === 'This is **** and *****', 'Should censor profanity with asterisks');

    result = await filter.censor('This is DAMN');
    assert(result === 'This is ****', 'Should handle mixed case profanity');

    result = await filter.censor('This is a nice clean sentence');
    assert(result === 'This is a nice clean sentence', 'Should preserve clean text');

    result = await filter.censor('This is damn');
    assert(result === 'This is ****', 'Should normalize illegal whitespace and censor');

    result = await filter.censor('damnation and hellish are fine');
    assert(result === 'damnation and hellish are fine', 'Should not match partial words');

    // Test check() - this is where the bug shows up
    console.log('\n=== Testing check() ===');

    result = await filter.check('This is damn text');
    assert(result === false, 'Should return false for text with profanity');

    result = await filter.check('This is damn text');
    assert(result === false, 'Should again return false for text with profanity');

    result = await filter.check('This is good text');
    assert(result === true, 'Should return true for clean text');

    result = await filter.check('This is DAMN text');
    assert(result === false, 'Should handle mixed case profanity');

    result = await filter.check('This is damn'); // With illegal whitespace
    assert(result === false, 'Should normalize illegal whitespace before checking');

    result = await filter.check('');
    assert(result === true, 'Should handle empty strings');

    // Test checkStrict()
    console.log('\n=== Testing checkStrict() ===');

    result = await filter.checkStrict('This is good text with numbers 123.');
    assert(result === true, 'Should return true for approved characters only');

    result = await filter.checkStrict('This is damn text');
    assert(result === false, 'Should return false for approved characters with profanity');

    result = await filter.checkStrict('This is ###ü damn text');
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

    // Summary
    console.log(`\n=== Test Summary ===`);
    console.log(`Passed: ${passCount}/${testCount}`);

    if (passCount === testCount) {
        console.log('🎉 All tests passed!');
    } else {
        console.log('❌ Some tests failed');
    }
}

// Run tests
runTests().catch(console.error);