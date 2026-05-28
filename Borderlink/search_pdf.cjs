const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

async function searchInPdf(filePath, query) {
    const dataBuffer = fs.readFileSync(filePath);
    try {
        const data = await pdf(dataBuffer);
        if (data.text.toLowerCase().includes(query.toLowerCase())) {
            console.log(`FOUND in: ${filePath}`);
            const lines = data.text.split('\n');
            for(let i = 0; i < lines.length; i++) {
                if (lines[i].toLowerCase().includes(query.toLowerCase())) {
                    console.log(`  Line: ${lines[i].trim()}`);
                    if (i+1 < lines.length) console.log(`  Next: ${lines[i+1].trim()}`);
                }
            }
        }
    } catch (e) {
        // ignore errors
    }
}

async function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (let file of list) {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(await walk(file));
        } else if (file.endsWith('.pdf')) {
            results.push(file);
        }
    }
    return results;
}

(async () => {
    console.log('Searching...');
    const files = await walk('.');
    for (const f of files) {
        await searchInPdf(f, 'ohajiki');
    }
    console.log('Done.');
})();
