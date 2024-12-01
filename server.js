import https from 'https';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import * as JSONC from 'comment-json';
let configFname = __dirname + '/config.json';
console.log(`Loading config from ${configFname}`);

if (!fs.existsSync(configFname)) {
    console.error(`Config file not found at ${configFname}`);
    process.exit(1);
}
const CONFIG = JSONC.parse(fs.readFileSync(configFname).toString());

console.log('Loaded config: ', CONFIG);

if (!CONFIG.port) {
    console.error('Missing port in config');
    process.exit(1);
}
if (!CONFIG.uiHost) {
    console.error('Missing uiHost in config');
    process.exit(1);
}
if (!CONFIG.ssl) {
    console.error('Missing ssl in config');
    process.exit(1);
}
if (!CONFIG.ssl.private) {
    console.error('Missing ssl.private in config');
    process.exit(1);
}
if (!CONFIG.ssl.public) {
    console.error('Missing ssl.public in config');
    process.exit(1);
}
if (!fs.existsSync(CONFIG.ssl.private)) {
    console.error(`Private key not found at ${CONFIG.ssl.private}`);
    process.exit(1);
}
if (!fs.existsSync(CONFIG.ssl.public)) {
    console.error(`Public key not found at ${CONFIG.ssl.public}`);
    process.exit(1);
}

const HTTPS_SERVER_OPTIONS = {
    key: fs.readFileSync(CONFIG.ssl.private),
    cert: fs.readFileSync(CONFIG.ssl.public),
};

const webExpressApp = express();
const webHttpServer = https.createServer(HTTPS_SERVER_OPTIONS, webExpressApp);

webExpressApp.use(async (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", CONFIG.uiHost);

    if (req.path.endsWith('.js')) {
        const filePath = path.join(__dirname, 'examples', req.path);
        fs.readFile(filePath, 'utf8', (err, content) => {
            if (err) {
                return res.sendStatus(404); // not found
            }
            content = content.replace(/%UI_HOST%/g, CONFIG.uiHost);
            res.type('application/javascript')
               .send(content);
        });
      } else {
        next();
      }
});

webExpressApp.use(express.static('examples'));

webHttpServer.listen(CONFIG.port);
console.log(`HTTPS server listening on port ${CONFIG.port}`);