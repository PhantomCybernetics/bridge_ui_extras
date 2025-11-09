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

const webExpressApp = express();
let webServer = null;
let SSL = false;
if (CONFIG.ssl) {
    SSL = true;
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
    
    webServer = https.createServer(HTTPS_SERVER_OPTIONS, webExpressApp);
}

webExpressApp.use(async (req, res, next) => {
    if (CONFIG.uiHost == 'auto')
        res.setHeader("Access-Control-Allow-Origin", '*'); // allow all 
    else 
        res.setHeader("Access-Control-Allow-Origin", CONFIG.uiHost);

    // the host name will be replaced with uiHost from the config.json file
    // allowing to include these plugins in locally hosted versions of the Bridge UI

    if (req.path.endsWith('.js') || req.path.endsWith('.css')) {
        const filePath = path.join(__dirname, 'examples', req.path);
        fs.readFile(filePath, 'utf8', (err, content) => {
            if (err) {
                return res.sendStatus(404); // not found
            }
            let replaceTarget = null;
            let origin = req.get('origin'); // make sure your brosers sends origin in 'auto' mode
            if (origin && CONFIG.uiHost == 'auto') {
                replaceTarget = origin;
            } else if (CONFIG.uiHost != 'auto') {
                replaceTarget = CONFIG.uiHost;
            }
            if (replaceTarget)
                content = content.replaceAll('https://bridge.phntm.io', replaceTarget);
            let mimeType = req.path.endsWith('.js') ? 'application/javascript' : 'text/css'; // important!
            res.type(mimeType);
            res.send(content);
        });
    } else {
        next();
    }
});

webExpressApp.use(express.static('examples'));

webExpressApp.get("/", async function (req, res) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send("Ohi, this is Bridge UI Extras server");
});

if (SSL) {
    webServer.listen(CONFIG.port, () => {
        console.log(`HTTPS server listening on port ${CONFIG.port}`);
    });
} else {
    webExpressApp.listen(CONFIG.port, () => {
        console.log(`HTTP server listening on port ${CONFIG.port}`);
    });
}
