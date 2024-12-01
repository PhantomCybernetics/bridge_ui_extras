import { InputDriver } from '%UI_HOST%/static/input/base-driver.js'
// The %UI_HOST% will be replaced with uiHost from the config.json file by the attached node.js server
// You can also replace it with https://bridge.phntm.io and then host this file statically,
// only remember the Access-Control-Allow-Origin header must be set either to the UI host name
// such as 'https://bridge.phntm.io' or to '*'

export class ExampleCustomDriver extends InputDriver {

    // the message type to generate
    // must be available to the Bridge node
    // (see Custom message & Service types)
    msg_type = 'std_msgs/msg/Bool';

    num_axes = 5;
    num_buttons = 5;

    // create named axes to allow mapping input to
    getAxes() { 
        let axes = {};
        for (let i = 0; i < this.num_axes; i++) {
            axes[`axis.${i}`] = 'Test: Axis '+i
        }
        return axes;
    }

    // create named buttons to allow mapping input to
    getButtons() { 
        let buttons = {};
        for (let i = 0; i < this.num_buttons; i++) {
            buttons[`btn.${i}`] = 'Test: Button '+i
        }
        return buttons;
    }

    // generate output message from the current state of all axes and buttons
    // in this simple example, we only return True if something is pressed
    generate() {
        let something_pressed = false;

        for (let i = 0; i < this.num_axes; i++) {
            let id_axis = `axis.${i}`;
            if (this.axes_output[id_axis])
                something_pressed = true;
        }

        for (let i = 0; i < this.num_buttons; i++) {
            let id_btn = `btn.${i}`;
            if (this.buttons_output[id_btn])
                something_pressed = true;
        }

        // output message
        let msg = {
            data: something_pressed
        }

        this.output = msg;
        return this.output;
    }
}