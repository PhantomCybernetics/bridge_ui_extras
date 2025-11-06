import { InputDriver } from 'https://bridge.phntm.io/static/input/base-driver.js'

export class ExampleBoolInputDriver extends InputDriver { // must be a subclass of InputDriver

    // the message type to generate must be available to the Bridge node
    // (see https://docs.phntm.io/bridge/basics/custom-message-types.html)
    msg_type = 'std_msgs/msg/Bool';

    // mandatory driver id (this is how you refer to the driver in bridge-client-config.yaml)
    id_driver = "Example Bool Driver";

    num_axes = 5; // number of mappable axes to create
    num_buttons = 5; // number of mappable buttons to create

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