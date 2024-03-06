const fse = require('fs-extra');
const { URL } = require('url');
const path = require('path');
const beautify = require('js-beautify');
const table = require('table').table;
const _ = require('lodash');
const config = require('./config.js');
const mimelib = require('mime-types');

let harFile = config.HAR_FILE.replace(/\.har$/, '') + '.har';
let folderName = harFile.replace(/\.har$/, '');
let allowMerge = config.ALLOW_MERGE;
let verbose = config.VERBOSE;

if (!fse.pathExistsSync(harFile)) {
    console.log(`Something's wrong! Review 'config.js' file`);
    return;
}

fse.removeSync(folderName);

const allowedRestMethods = config.ALLOWED_METHODS;
const allowedProtocols = config.ALLOWED_PROTOCOL;
const onlyAllowedMimes = config.FILTER_MIMES;

const notes = {
    root: [],
    zero: [],
    protocol: [],
    method: [],
    mimes: [],
    duplicates: [],
    merged: [],
    created: [],
    error: [],
}

// const entries = JSON.parse(fse.readFileSync(harFile)).log.entries;
const entries = fse.readJsonSync(harFile).log.entries;
entries.forEach((entry) => {

    const resource = new URL(entry.request.url).pathname.replace(/\/$/, '').split('/').pop();
    
    try {

        if (!resource) {
            notes.root.push(`${resource}`);
            return;
        }

        const allowedMethods = allowedRestMethods.includes(entry.request.method);
        if (!allowedMethods) {
            notes.method.push(`${entry.request.method}-${resource}`);
            return;
        }

        const isProtocolAllowed = allowedProtocols.includes(new URL(entry.request.url).protocol?.toUpperCase().replace(/:/, ''));
        if (!isProtocolAllowed) {
            notes.protocol.push(`${entry.request.protocol}-${resource}`);
            return;
        }

        const mimeType = entry.response.content.mimeType;
        const restrictedMimes = !onlyAllowedMimes.includes(mimeType);
        if (onlyAllowedMimes.length && restrictedMimes) {
            notes.mimes.push(`${mimeType}-${resource}`);
            return;
        }

        let data = entry.response.content.text;
        let options = {};
        if (entry.response.content.encoding === 'base64') {
            data = data.split(';base64,').pop();
            options.encoding = 'base64';
        }

        if (resource.includes('.')) {
            const fullPath = path.join(folderName, resource);
            const isFileExist = fse.pathExistsSync(fullPath);
            isFileExist ? notes.duplicates.push(`${resource}`) : notes.created.push(`${resource}`);
            fse.outputFileSync(fullPath, String(data), options);
            return;
        }

        const rawFileName = (resource.toLowerCase() === 'graphql') ? JSON.parse(entry.request.postData.text).operationName : resource;
        const extn = '.' + (mimelib.extension(mimeType) || (mimeType?.toLowerCase().includes('javascript') ? 'js' : 'json'));
        const fullPath = path.join(folderName, rawFileName + extn);

        if (allowMerge && extn === '.json') {
            const isFileExist = fse.pathExistsSync(fullPath);
            if (isFileExist) {
                const newData = JSON.parse(data);
                const oldData = fse.readJsonSync(fullPath, { throws: false });
                const mergedData = JSON.stringify(_.merge(oldData, newData));
                data = beautify(mergedData);
            }
            isFileExist ? notes.merged.push(`${resource} ${rawFileName}`) : notes.created.push(`${resource} ${rawFileName}`);
            fse.outputFileSync(fullPath, String(data));
            return;
        }

        const isFileExist = fse.pathExistsSync(fullPath);
        isFileExist ? notes.duplicates.push(`${resource}`) : notes.created.push(`${resource}`);
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
    [notes.protocol.length, "Unsupported Protocols"],
    [notes.root.length, "Skipped Root Page"],
    [notes.zero.length, "Skipped Zero Size Entries"],
    [notes.mimes.length, "Skipped Not Allowed Mimes (if mentioned)"],
    [notes.error.length, "Entries with Errors"],
    [Object.values(notes).reduce((acc, item) => acc - item.length, entries.length), "Balance (Should remain zero)"],
];

if (verbose) {
    console.log(table(summary));
}

if (notes.error.length) {
    console.log(notes.error);
}
