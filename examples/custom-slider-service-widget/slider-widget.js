import { CustomServiceInput } from 'https://bridge.phntm.io/static/input/custom-service-input.js'

// JQuery is available in this context via $

export class ServiceInput_ExampleSlider extends CustomServiceInput { // must be a subclass of CustomServiceInput 

    last_value = null;
    last_value_set_time = null;
    
    full_range = 0;
    use_float = false;
    float_decimals = 2;

    slider_el = null;
    label_el = null;
    bar_el = null;

    constructor(id_service, bridge_client, config_data) {
        super(id_service, bridge_client, config_data);

        this.full_range = this.config_data.max - this.config_data.min;
        this.use_float = this.config_data.use_float ? true : false;
        if (this.config_data.float_decimals !== undefined)
            this.float_decimals = this.config_data.float_decimals;
    }

    getCurrentValue(done_cb, err_cb) {
        if (!this.config_data.value_read_srv) {
            err_cb("Getter service not provided for "+this.id_service + " widget");
            return;
        }
        let that = this;
        let timeout_sec = this.config_data.srv_timeout ? this.config_data.srv_timeout : 2.0; // timeout for the service call reply
        this.bridge_client.serviceCall(this.config_data.value_read_srv, null, true, timeout_sec, (reply) => { // call w no payload & silent
            console.warn("Service widget for " + that.id_service + ' current value:', reply);
            if (reply.data !== undefined) {
                done_cb(reply.data);
            } else {
                err_cb("Getter service  "+this.config_data.value_read_srv+" reply missing 'data' attribute");
            }
        });
    }

    // makes the service UI for the dropdown menu
    makeElements(target_el) {
        let that = this;

        this.slider_el = $('<span class="service-control prevent-select range-srv-input"></span>');
        this.label_el = $('<span class="range-label"></span>').appendTo(this.slider_el);
        this.bar_el = $('<span class="range-bar"></span>').appendTo(this.slider_el);
        target_el.empty();
        target_el.append(this.slider_el);

        let mouse_down = false;
        this.slider_el.mousedown((ev)=>{
            mouse_down =  true;
            that.setValueFromPosition(ev, false);
        });

        this.slider_el.mouseup((ev)=>{
            if (!mouse_down) 
                return;
            mouse_down = false;
            that.setValueFromPosition(ev, true);
        }); 

        this.slider_el.mouseleave((ev)=>{
            if (!mouse_down) 
                return;
            mouse_down = false;
            that.setValueFromPosition(ev, true);
        });

        this.slider_el.mousemove((ev)=>{
            if (!mouse_down)
                return;
            that.setValueFromPosition(ev, false);
        });

        if (this.last_value != null)
            this.updateDisplay(this.last_value);
    }

    setValueFromPosition(ev, send) {
        let span_width = this.slider_el.width();
        let click_x = ev.pageX - $(ev.target).offset().left;
        let percent = (click_x / span_width);
        let value = this.config_data.min + (this.full_range * percent);
        if (!this.use_float)
            value = Math.round(value);
        value = Math.max(Math.min(this.config_data.max, value), this.config_data.min);
        let last_value_set_time = Date.now();
        this.last_value_set_time = last_value_set_time;

        if (send) {
            let that = this;
            let timeout_sec = this.config_data.srv_timeout ? this.config_data.srv_timeout : 2.0; // timeout for the service call reply
            this.bridge_client.serviceCall(this.id_service, { data: value }, true, timeout_sec, (reply) => { 
                if (!reply.success) {
                    console.error('ServiceInput_ExampleSlider got error while setting value ' + value, reply);
                    that.bridge_client.ui.showNotification('Service ' + that.id_service + ' returned error', 'error', '<pre>' + JSON.stringify(reply, null, 2) + '</pre>');
                    if (this.last_value_set_time == last_value_set_time)
                        that.updateDisplay(null, true);  // err
                    return;
                }

                if (this.last_value_set_time == last_value_set_time)
                    that.updateDisplay(reply.data); //set confirmed value
            });
        }
        
        this.updateDisplay(value);
    }

    updateDisplay(value, is_error=false) {
        if (is_error) {
            this.label_el.html('Err!');
            this.bar_el.css({'width': '0%'});
            this.last_value = null; 
            return;
        }

        let percent = (value - this.config_data.min) /  this.full_range;
        this.last_value = value; 

        if (this.use_float)
            this.label_el.html(value.toLocaleString('en-US', { minimumFractionDigits: this.float_decimals, maximumFractionDigits: this.float_decimals }));
        else
            this.label_el.html(value.toLocaleString('en-US'));

        this.bar_el.css({'width': (percent * 100.0)+'%'});
    }

    // trigerred when another peer updates this input
    onValueChanged(msg) {
        if (msg.data === undefined) {
            console.error("Widget for " + this.id_service + ": no 'data' attribute received in onValueChanged");
            return;
        }

        this.last_value_set_time = Date.now();
        this.updateDisplay(msg.data); // update the UI
    }
}