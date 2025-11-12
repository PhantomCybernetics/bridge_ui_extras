import { SingleTypePanelWidgetBase } from 'static/widgets/inc/single-type-widget-base.js'

export class CustomBoolPanelWidget extends SingleTypePanelWidgetBase {

    static handled_msg_types = [ 'std_msgs/msg/Bool' ];

    static DEFAULT_COLOR_TRUE = '#00ff00';
    static DEFAULT_COlOR_FALSE = '#ff0000';

    constructor(panel, topic) {
        super(panel, topic, 'bool-test');

        //console.log('CustomBoolPanelWidget got initial '+this.topic+' config:', topic_config, 'ui_config: ', ui_config);

        this.state = false;
        // this.initialized = false;
       
        this.label_el = $('<span class="label"></span>');
        this.icon_el = $('<span class="icon"></span>');
        this.widget_el.append([ this.label_el, this.icon_el ]);
        this.enable_visual = this.panel.getPanelVarAsBool('vis', true); // get value from the panel vars, default is true

        let config = this.client.getTopicConfig(topic);

        this.color_true = config && config.color_true !== undefined ? config.color_true : CustomBoolPanelWidget.DEFAULT_COLOR_TRUE; // defaults overwritten with topic config
        this.color_false = config && config.color_false !== undefined ? config.color_false : CustomBoolPanelWidget.DEFAULT_COlOR_FALSE;

        this.setState();
    }

    onData(msg) {
        this.state = msg.data;
        this.setState();
    }

    setState() {
        // if (!this.initialized )
        //     return; // wait for topic config

        if (!this.enable_visual)
            this.icon_el.css('display', 'none');
        else
            this.icon_el.css('display', 'block');

        this.widget_el.css('background-color', this.state ? this.color_true : this.color_false);
        this.label_el.text(this.state ? 'True' : 'False');
        if (this.state) 
            this.icon_el.addClass('on').removeClass('off');
        else
            this.icon_el.addClass('off').removeClass('on');
    }

    setupMenu(menu_els) {
        console.log('menu_els: ', menu_els);

        //display rotation cube
        let enable_visual_line_el = $('<div class="menu_line"></div>');
        let enable_visual_label = $('<label for="enable_visual_' + this.panel.n + '">Enable visual</label>');
        let enable_visual_cb = $('<input type="checkbox" id="enable_visual_' + this.panel.n + '" ' + (this.enable_visual ? "checked " : "") + 'title="Enable visual"/> ');
        enable_visual_label.append(enable_visual_cb).appendTo(enable_visual_line_el);
        menu_els.push(enable_visual_line_el);

        let that = this;
        enable_visual_cb.change(function (ev) {
			that.enable_visual = $(this).prop("checked");
			that.panel.storePanelVarAsBool('vis', that.enable_visual); // store in panel vars
			that.setState(); // update display
		});
    }
} 