import { CustomServiceInput } from '%UI_HOST%/static/input/custom-service-input.js'
// The %UI_HOST% will be replaced with uiHost from the config.json file by the attached node.js server
// You can also replace it with https://bridge.phntm.io and then host this file statically,
// only remember the Access-Control-Allow-Origin header must be set either to the UI host name
// such as 'https://bridge.phntm.io' or to '*'

// JQuery is available in this context via $

export class ServiceInput_ExampleSlider extends CustomServiceInput {

    value = 0;
    full_range = 0;
    slider_el = null;
    label_el = null;
    bar_el = null;

    constructor(id_service, custom_data, client) {
        super(id_service, custom_data, client);

        let that = this;
        this.full_range = that.data.max - that.data.min;

        // get theinitial value
        this.client.serviceCall(this.data.value_read_srv, null, true, (reply)=>{
            console.warn(id_service+' initial value is ', reply);
            if (reply.success) {
                that.value = reply.data;
                that.makeMenuControls();
            } else {
                console.error('ServiceInput_ExampleSlider got error while reading '+this.data.value_read_srv, reply);
            }
        });
    }

    // makes the service UI for the dropdown menu
    makeMenuControls() {
        let that = this;

        this.slider_el = $('<span class="service-control prevent-select range-srv-input"></span>');
        this.label_el = $('<span class="range-label"></span>').appendTo(this.slider_el);
        this.bar_el = $('<span class="range-bar"></span>').appendTo(this.slider_el);
        this.target_el.empty();
        this.target_el.append(this.slider_el);

        let mouse_down = false;
        this.slider_el.mousedown((ev)=>{
            mouse_down =  true;
            that.posToVal(ev, false);
        });

        this.slider_el.mouseup((ev)=>{
            if (!mouse_down) 
                return;
            mouse_down = false;
            that.posToVal(ev, true);
        }); 

        this.slider_el.mouseleave((ev)=>{
            if (!mouse_down) 
                return;
            mouse_down = false;
            that.posToVal(ev, true);
        });

        this.slider_el.mousemove((ev)=>{
            if (!mouse_down)
                return;
            that.posToVal(ev, false);
        });

        this.updateDisplay();
    }

    posToVal(ev, send) {
        let span_width = this.slider_el.width();
        let click_x = ev.pageX - $(ev.target).offset().left;
        let percent = (click_x / span_width);
        let value = Math.round(this.data.min + (this.full_range * percent));
        this.value = Math.max(Math.min(this.data.max, value), this.data.min);

        if (send) {
            let that = this;
            this.client.serviceCall(this.id_service, { data: this.value }, true, (reply)=>{
                if (!reply.success) {
                    console.error('ServiceInput_ExampleSlider got error while setting value '+this.value, reply);
                    that.client.ui.showNotification('Service '+that.id_service+' returned error', 'error', '<pre>'+JSON.stringify(reply, null, 2)+'</pre>');
                }
            });
        }
        
        this.updateDisplay();
    }

    updateDisplay() {
        let percent = (this.value - this.data.min) /  this.full_range;

        this.label_el.html(this.value.toLocaleString('en-US'));
        this.bar_el.css({'width': (percent * 100.0)+'%'});
    }

    // trigerred when another peer updates this input
    onValueChanged(msg) {
        this.value = msg.data;
        this.updateDisplay(); // update the UI
    }

    // this generates CSS styles for the custom input
    static GetStyles() {
        return `
            .range-srv-input {
                background-color: rgb(128 0 128 / 33%);
                color: white;
                padding: 0px 0px;
                cursor: pointer;
                border-radius: 5px;
                width: 220px;
                overflow: hidden;
            }
            
            /* make the input narrower inside the touchscreen side menu */
            .hamburger .range-srv-input {
                width: 120px; 
            }

            .range-srv-input .range-label {
                position: absolute;
                pointer-events: none;
                z-index: 2;
                left: 0px;
                top: 0px;
                width: 100%;
                text-align: center;
            }

            .range-srv-input .range-bar {
                position: absolute;
                pointer-events: none;
                z-index: 1;
                left: 0px;
                top: 0px;
                width: 0%;
                height: 100%;
                background-color: blue;
            }
        `;
    }
}