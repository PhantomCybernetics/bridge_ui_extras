# Bridge UI Extras

Examples of extending Phntm Bridge UI plus a simple node.js dev HTTPS server.

You don't need to install anything to test the included examples. Simply link them to your
robot's configuation using GitHub's static "raw" URLs.

The included node.js server is useful when developping your own extensions, or when you have a local Bridge UI instance installed on a custom URL. The uiHost in its cofig.json must match the actual host name of the UI, so `https://bridge.phntm.io` will be replaced with whatever you set it to before the static .js files get served.

## Install the dev server

Install node.js and npm, then:

```bash
git clone git@github.com:PhantomCybernetics/bridge_ui_extras.git bridge_ui_extras
cd bridge_ui_extras
npm init
cp config.example.json config.json
```

## Install SSL certificates
If you want to use a self-signed certificate:
```bash
cd ssl
./gen.sh
```
This will produce ssl/private.key.pem and ssl/public.cert.pem.

If you are using a self-signed certificate, you need to install the public key in your operating system for the browser to trust it.

## Run the server
```bash
node server.js
```

The files from the `examples` folder are now available at e.g.:

```bash
https://localhost:443/custom-input-driver.js
```
