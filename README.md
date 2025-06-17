# Bridge UI Extras

Examples of extending Phntm Bridge UI plus a simple Node.js HTTPS server.

You don't need to install anything to test the included examples. Files from the ./examples folder 
are available via `https://ui-extras.phntm.io` (e.g. `https://ui-extras.phntm.io/custom-service-slider-widget.js`).

The provided Node.js server sends correct Access-Control-Allow-Origin header for each served file
to make sure the Web UI can successfully include it. This is either '*' (when uiHost in the config.json is set to 'auto'), or `'https://your-ui-host.tld'` when uiHost is set to an exact hostname.

Since files are imported into the Web UI from custom domains, you need to refer to libraries of the Web UI using their
full URL (e.g. `import { InputDriver } from 'https://bridge.phntm.io/static/input/base-driver.js'`). If you're hosting a develoment version of the Web UI on a custom domain,
this server also replaces `'https://bridge.phntm.io'` with your specified custom host name. If you set uiHost in the config to 'auto', the server tries to detect the UI's domain automatically
from the 'origin' header of each request. However, this may not always work with some browsers that don't send this header.

> [!TIP]
> If you don't host your own Web UI, simply leave the uiHost to `'https://bridge.phntm.io'`.

> [!WARNING]
> Using uiHost: 'auto' in the cofig.json is not recommended in production where you should always specify the exact domain
> of the Web UI you are targeting, such as `'https://bridge.phntm.io'`.

## Install the Node.js Server

Install node.js and npm

```bash
sudo apt install nodejs npm
```

then:

```bash
git clone git@github.com:PhantomCybernetics/bridge_ui_extras.git bridge_ui_extras
cd bridge_ui_extras
npm install
cp config.example.json config.json # examine the config, set server port, etc
```

## Install SSL certificates

The recommended way to do this is to use [Let's Encrypt](https://letsencrypt.org/) and [Certbot](https://certbot.eff.org/).

You can also generate a self-signed certificate using openssl:
```bash
cd ssl
./gen.sh
```
This will produce ssl/private.key.pem and ssl/public.cert.pem. You will need to install the public certificate to your operating system for the web browser to trust it.

If you're using AWS load balander that terminates SSL encryption, handles certificates and forwards unencrypted requests to the backend over HTTP, remove the `ssl` property from the config.json and the server will start in HTTP mode listening on your specified port.

## Run the server
```bash
node server.js
```

The files from the `examples` folder should be available at e.g. `https://localhost:443/custom-input-driver.js`

## Add as a system service
```bash
sudo vim /etc/systemd/system/phntm_bridge_ui_extras.service
```

...and paste:

```
[Unit]
Description=phntm bridge ui extras service
After=network.target

[Service]
ExecStart=/usr/bin/node /home/ubuntu/bridge_ui_extras/server.js
Restart=always
User=root
Environment=NODE_ENV=production
WorkingDirectory/home/ubuntu/bridge_ui_extras/
StandardOutput=append:/var/log/bridge_ui_extras.log
StandardError=append:/var/log/bridge_ui_extras.err.log

[Install]
WantedBy=multi-user.target
```

Reload systemctl daemon

```bash
sudo systemctl daemon-reload
```

Launch service & install

```bash
sudo systemctl start phntm_bridge_ui_extras.service
sudo systemctl enable phntm_bridge_ui_extras.service # will launch on boot
```
