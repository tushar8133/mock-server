const express = require("express");
const app = express();
const cors = require("cors");
const fse = require('fs-extra');
const path = require('path');

let port = null;
let folder = null;

try {
    const args = process.argv.slice(2);
	port = args.find((item) => item.includes('--port')).split('=')[1];
	folder = args.find((item) => item.includes('--folder')).split('=')[1];
	if (!port || !folder) {
		throw new Error();
	}
} catch (e) {
    console.log(`Something's wrong! Try like this: \x1b[7m> node server.js --port=8080 --folder=ABC\x1b[0m`);
    return;
}

app.use(cors());
app.use(express.json()); // get read the response body
app.use('/', express.static('./public'));


const ignoreExt = ['.ico', '.svg', '.jpg', '.gif', '.font' ];
let delayCounter = 0;

app.all("*", (req, res) => {
    try {

		// const url = require("url");
		// let pathname = url.parse(req.url).pathname;
		const resource = req.path.split('/').pop();
		const badItem = ignoreExt.some((item) => resource.includes(item));
		if (badItem) {
			res.end();
			console.log("Resource filtered out >>>", resource);
			return false;
			/**
			 * Below ones are useful in socket connection
			 * // response.set("Connection", "close");
			 * // response.connection.end();
			 * // response.connection.destroy();
			 */
		}
		
		let fileName = (resource.toLowerCase() === "graphql") ? (req.body.operationName || '') : resource;

		console.log('>>', fileName);
		// console.log("GRAPHQL variables >>>", req.body.variables);
		// console.log("GRAPHQL query >>>", req.body.query);

		fileName = fileName.replace('.json', '');
		let filePath = path.join(folder, fileName);
		const fileData = fse.readJsonSync(filePath + ".json");

		setTimeout(() => {
			res.json(fileData);
			--delayCounter;
		}, ++delayCounter * 1000);

	} catch(err) {

		console.error("Mock file not found");
		res.set('Content-Type', 'text/html');
		res.send(Buffer.from(`
			<h3>Mock file not found</h3>
			<p>Check if file present inside folder <b>&sol;${folder}</b></p>
			<code>${err}</code>
		`));
		/*
		res.status(404).json({
			"ERROR MESSAGE": "Mock file not found!",
		});
		*/
	}
})

app.listen(port, () => {
	console.log("\x1b[7m%s", `http://localhost:${port} *** ${folder}`, '\x1b[0m');
});
