export class ExampleCustomDriver extends InputDriver {
    msg_type = 'sensor_msgs/msg/Joy';
    num_axes = 10;
    num_buttons = 10;

    constructor() {
        console.log('Ohi from ExampleCustomDriver!');
    }
}