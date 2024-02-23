const express = require('express');
const app = express();
const cors = require('cors');
const fse = require('fs-extra');
const path = require('path');
const config = require('./config.js');

const folderName = config.HAR_FILE.replace(/\.har$/, '');
const folder = path.join(config.DEFAULT_PATH, folderName);

app.use(cors());
app.use(express.json());

app.all('*', (req, res) => {
    try {

		// const url = require('url');
		// let pathname = url.parse(req.url).pathname;
		let resource = req.path.replace(/\/$/, '').split('/').pop();

		if (resource.includes('.')) {
			const fullPath = path.join(folder, resource);
			const isExist = fse.pathExistsSync(fullPath);
			if (!isExist) {
				res.status(404).end();
				return;
				/**
				 * Below ones are useful in socket connection
				 * // response.set('Connection', 'close');
				 * // response.connection.end();
				 * // response.connection.destroy();
				 */
			}
			req.url = resource;
			express.static(folder)(req, res);
			return;
		}

		resource = (resource.toLowerCase() === 'graphql') ? (req.body.operationName || '') : resource;
		// console.log('GRAPHQL variables >>>', req.body.variables);
		// console.log('GRAPHQL query >>>', req.body.query);
		const fullPath = path.join(folder, resource + '.json');
		const isExist = fse.pathExistsSync(fullPath);
		if (!isExist) {
			res.status(404).json({ 'error': 'mock file not found at the location'});
			return;
		}
		const fileData = fse.readJsonSync(fullPath);
		res.json(fileData);

	} catch(err) {

		console.error(err);
		res.status(404).end(err);
		// res.set('Content-Type', 'text/html');
		// res.send(Buffer.from(`<h6>${err}</h6>`));
		// res.status(404).json({ 'ERROR MESSAGE': 'Mock file not found!' });
	}
})

app.listen(config.PORT, () => {
	console.log('\x1b[7m%s', `http://localhost:${config.PORT} from '${folder}'`, '\x1b[0m');
});
