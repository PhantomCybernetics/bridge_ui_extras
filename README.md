# Bridge UI Extras

Examples of extending Phntm Bridge UI plus a simple HTTPS server.

## Install

```bash
git clone git@github.com:PhantomCybernetics/bridge_ui_extras.git bridge_ui_extras
cd bridge_ui_extras
npm init
cp config.example.json config.json
cd ssl
./gen.sh
cd ..
node server.js
```
