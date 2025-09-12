import { check, checkStrict, censor } from "./index.js";

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

    let result = censor('This is damn and bitch');
    assert(result === 'This is **** and *****', 'Should censor profanity with asterisks');

    result = censor('This is DAMN');
    assert(result === 'This is ****', 'Should handle mixed case profanity');

    result = censor('Hey, this pen is amazing! I love your hellish dog-dog, even _though -he kinda s u c k s at basketball and BanalStuffLol.');
    assert(result === 'Hey, this pen is amazing! I love your hellish dog-dog, even _though -he kinda s u c k s at basketball and BanalStuffLol.', 'Should keep normal sentences the same');

    result = censor('This is a nice clean sentence');
    assert(result === 'This is a nice clean sentence', 'Should preserve clean text');

    result = censor('This is damn');
    assert(result === 'This is ****', 'Should handle non-standard whitespace and censor');

    result = censor('banal and hellish are fine');
    assert(result === 'banal and hellish are fine', 'Should not match partial words');

    result = censor('You are a b i t c h!');
    assert(result === 'You are a *****!', 'Should censor oddly spaced profanity');

    result = censor('Y o u a r e a b i t c h and I thi nk you a r e a f u c k er!');
    assert(result === 'Y o u a r e a ***** and I thi nk you a r e a **** er!', 'Should censor oddly spaced profanity');

    result = censor('HairyNigger455');
    assert(result === 'Hairy******455', 'Should censor profane parts of user names');

    result = censor('Nigger455');
    assert(result === '******455', 'Should censor profane words of user names that include numbers without spaces');

    result = censor('Banal455');
    assert(result === 'Banal455', 'Should not censor partial profanity in user names that include numbers');

    result = censor('BanalLover455');
    assert(result === 'BanalLover455', 'Should not censor partially profane parts in user names');

    result = censor('fuckLover455');
    assert(result === '****Lover455', 'Should censor profane parts in camelCase user names');

    result = censor('Bad-Bitch');
    assert(result === 'Bad-*****', 'Should censor bad words separated by dashes');

    result = censor('Bad_Bitch!');
    assert(result === 'Bad_*****!', 'Should censor bad words separated by underscores');

    result = censor('Bad Bi-tch');
    assert(result === 'Bad *****', 'Should censor bad words split up with dashes');

    result = censor('Bad-Bi-tch-is-cool');
    assert(result === 'Bad-*****-is-cool', 'Should censor bad words that are part of dash chains');

    result = censor('Bad_Bi_tch_is_cool');
    assert(result === 'Bad_*****_is_cool', 'Should censor bad words that are part of dash chains');

    result = censor('Hey, that Bad_Bi_tch_is_cool what do you think, favorite shit?');
    assert(result === 'Hey, that Bad_*****_is_cool what do you think, favorite ****?', 'Should censor bad words that are part of dash chains in sentences');

    result = censor('Bad_Te_ch_is-cool');
    assert(result === 'Bad_Te_ch_is-cool', 'Should leave clean underscore chains intact');

    // Test check() - this is where the bug shows up
    console.log('\n=== Testing check() ===');

    result = check('This is damn text');
    assert(result === false, 'Should return false for text with profanity');

    result = check('This is damn text');
    assert(result === false, 'Should again return false for text with profanity');

    result = check('This is good text');
    assert(result === true, 'Should return true for clean text');

    result = check('This is DAMN text');
    assert(result === false, 'Should handle mixed case profanity');

    result = check('This is damn'); // With non-standard whitespace
    assert(result === false, 'Should handle non-standard whitespace and block profanity');

    result = check('This is good'); // With non-standard whitespace
    assert(result === true, 'Should handle non-standard whitespace and allow good words');

    result = check('');
    assert(result === true, 'Should handle empty strings');

    result = check('you are a f u ck e r');
    assert(result === false, 'Should check short isolated parts for profanity');

    result = check('b i t c h y o u a r e a f a g g o t');
    assert(result === false, 'Should check short isolated parts for profanity');

    result = check('This pen is cool!😀');
    assert(result === true, 'Should not detect isolated parts that are actual words');

    result = check('Hey, this pen is amazing! I love your hellish dog, even though he kinda s u c k s at basketball!');
    assert(result === true, 'Should not detect profanity in regular sentences that contain spaced-out words');

    result = check('HairyNigger455');
    assert(result === false, 'Should reject joined camelCase profane words of user names that include numbers without spaces');

    result = check('Nigger455');
    assert(result === false, 'Should reject profane words of user names that include numbers without spaces');

    result = check('GoodBanaPerson1');
    assert(result === true, 'Should accept user names with camelCase and partial profanity');

    // Test checkStrict()
    console.log('\n=== Testing checkStrict() ===');

    result = checkStrict('This is good text with numbers 123.');
    assert(result === true, 'Should return true for approved characters only');

    result = checkStrict('This is damn text');
    assert(result === false, 'Should return false for approved characters with profanity');

    result = checkStrict('This is good 你好');
    assert(result === false, 'Should return false for non-Latin characters');

    result = checkStrict('This is good 😀');
    assert(result === false, 'Should return false for emojis');

    result = checkStrict('This is good @#%_-!?–,+!.()[]{}&%=""``/|\:');
    assert(result === true, 'Should allow some special symbols that are common in messages');

    result = checkStrict("Hello, world! How are you? I'm fine.");
    assert(result === true, 'Should allow basic punctuation');

    result = checkStrict('');
    assert(result === true, 'Should handle empty strings in strict mode');

    // Edge cases
    console.log('\n=== Testing Edge Cases ===');

    try {
        result = check(null);
        assert(result === false, 'Should handle null gracefully');
    } catch (e) {
        assert(true, 'Should handle null gracefully (threw error as expected)');
    }

    try {
        result = checkStrict(undefined);
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