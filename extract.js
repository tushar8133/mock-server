const fse = require('fs-extra');
const { URL } = require('url');
const path = require('path');
const beautify = require('js-beautify');
const table = require('table').table;
const _ = require('lodash');

let harFile = null;
let allowMerge = false;
let verbose = false;
let folderName = null;

try {
    const args = process.argv.slice(2);
    const commandInput = args[0].replace(/\.har$/, '');
    harFile = commandInput + '.har';
    allowMerge = args.includes('--merge');
    verbose = args.includes('--verbose');
    folderName = commandInput;
    if (!fse.pathExistsSync(harFile)) {
        throw new Error();
    }
} catch (e) {
    console.log(`Something's wrong! Try like this: \x1b[7m> node extract.js file[.har] [--merge] [--verbose]\x1b[0m`);
    return;
}

fse.removeSync(folderName);

const mimeTypesMapping = {
	'application/javascript': '.js',
	'application/json': '.json',
	'application/x-javascript': '.js',
	'image/svg+xml': '.svg',
	'text/css': '.css',
	'text/html': '.html',
	'text/javascript': '.js',
	'text/plain': '.txt',
};

const allowedRestMethods = [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE'
];

const onlyAllowedMimes = [
    // 'application/json'
];

const notes = {
    method: [],
    zero: [],
    mimes: [],
    duplicates: [],
    merged: [],
    created: [],
    error: [],
}

// const entries = JSON.parse(fse.readFileSync(harFile)).log.entries;
const entries = fse.readJsonSync(harFile).log.entries;
entries.forEach((entry) => {
    
    try {

        const resource = new URL(entry.request.url).pathname.split('/').pop();
        
        const allowedMethods = allowedRestMethods.includes(entry.request.method);
        if (!allowedMethods) {
            notes.method.push(`${entry.request.method}-${resource}`);
            return;
        }
        
        const isContentZero = entry.response.content.size;
        if (isContentZero === 0) {
            notes.zero.push(`${resource}`);
            return;
        }

        const mimeType = entry.response.content.mimeType;
        const restrictedMimes = !onlyAllowedMimes.includes(mimeType);
        if (onlyAllowedMimes.length && restrictedMimes) {
            notes.mimes.push(`${mimeType}-${resource}`);
            return;
        }

        const rawFileName = (resource === 'graphql') ? JSON.parse(entry.request.postData.text).operationName : resource;
        const fileNameWithExtn = rawFileName.includes('.') ? rawFileName : rawFileName + (mimeTypesMapping[mimeType] || '');
        const extn = fileNameWithExtn.split('.').pop();
        const fullPath = path.join(folderName, fileNameWithExtn);
        const isFileExist = fse.pathExistsSync(fullPath);
        let data = entry.response.content.text;
        let options = {};
        
        const isBase64 = entry.response.content.encoding;
        if (isBase64 === 'base64') {
            data = data.split(';base64,').pop();
            options.encoding = 'base64'
        }

        if (isFileExist) {
            try {
                const isMimeCombinable = ['text/plain', 'application/json'].includes(mimeType);
                if (allowMerge && isMimeCombinable) {
                    const newData = JSON.parse(data);
                    const oldData = fse.readJsonSync(fullPath, { throws: false });
                    const mergedData = JSON.stringify(_.merge(oldData, newData));
                    data = mergedData;
                    notes.merged.push(`${resource} ${rawFileName}`);
                } else {
                    throw new Error();
                }
            } catch(e) {
                notes.duplicates.push(`${resource} ${rawFileName}`);
            }
        } else {
            notes.created.push(`${resource} ${rawFileName}`);
        }
        
        switch(extn) {
            case 'json': data = beautify(data); break;
            case 'html': data = beautify.html(data); break;
            case 'css': data = beautify.css(data); break;
        }
        
        fse.outputFileSync(fullPath, String(data), options);

    } catch (e) {
        notes.error.push(`${resource}-${e}`);
    }

});

const summary = [
    [entries.length, "Total HAR Entries"],
    [notes.created.length, "Actual Files Created"],
    [notes.duplicates.length, "Skipped Duplicate Files"],
    [notes.merged.length, "Files Merged"],
    [notes.method.length, "Skipped Unsupported Rest Methods"],
    [notes.zero.length, "Skipped Zero Size Entries"],
    [notes.mimes.length, "Skipped Not Allowed Mimes (if mentioned)"],
    [notes.error.length, "Entries with Errors"],
    [Object.values(notes).reduce((acc, item) => acc - item.length, entries.length), "Balance (Should remain zero)"],
];

console.log(table(summary));

if (verbose) {
    console.log(notes.error);
}
