const fs = require('fs');
const filename = process.argv[2];

if (!filename) {
    console.error('Please provide a filename');
    process.exit(1);
}

const content = fs.readFileSync(filename, 'utf8');
let stack = [];
let lines = content.split('\n');

for (let i = 0; i < content.length; i++) {
    const char = content[i];

    // Calculate line/col
    const contentUpToChar = content.substring(0, i + 1);
    const lineNum = contentUpToChar.split('\n').length;

    if (char === '{' || char === '(' || char === '[') {
        stack.push({ char, line: lineNum });
    } else if (char === '}' || char === ')' || char === ']') {
        if (stack.length === 0) {
            console.error(`Unexpected closing '${char}' at line ${lineNum}`);
            continue; // Keep going to find more?
        }

        const last = stack.pop();
        let expected = '';
        if (char === '}') expected = '{';
        if (char === ')') expected = '(';
        if (char === ']') expected = '[';

        if (last.char !== expected) {
            console.error(`Mismatch: Expected closing for '${last.char}' (line ${last.line}) but found '${char}' at line ${lineNum}`);
        }
    }
}

if (stack.length > 0) {
    console.error('Unclosed braces/parens:');
    stack.forEach(s => console.error(`'${s.char}' at line ${s.line}`));
} else {
    console.log('Braces check passed.');
}
