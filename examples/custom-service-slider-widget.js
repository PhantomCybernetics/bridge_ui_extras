import {  ServiceInput } from '%UI_HOST%/static/input/service-widgets.js'
// The %UI_HOST% will be replaced with uiHost from the config.json file by the attached node.js server
// You can also replace it with https://bridge.phntm.io and then host this file statically,
// only remember the Access-Control-Allow-Origin header must be set either to the UI host name
// such as 'https://bridge.phntm.io' or to '*'

export class ServiceInput_ExampleSlider extends ServiceInput {

    // this makes the service UI for the dropdown menu
    static MakeMenuControls(el, service, client) {
        
    }

    // this makes the service UI for input manager config
    static MakeInputConfigControls(btn, on_change_cb) {

        
    }
}