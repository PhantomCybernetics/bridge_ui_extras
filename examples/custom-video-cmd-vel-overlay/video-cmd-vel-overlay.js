import { VideoPuginBase } from "https://bridge.phntm.io/static/widgets/video/video-plugin-base.js";
import * as THREE from "three";

export class CustomVideoWidget_CmdVel extends VideoPuginBase {
    static SOURCE_TOPIC_TYPE = 'geometry_msgs/msg/TwistStamped';
    static SOURCE_DESCRIPTION = 'Twist Stamped';   
    static SOURCE_DEFAULT_TOPIC = null;
    static SOURCE_MAX_NUM = 1;

    static COLOR_OFF = '#00000073';
    static COLOR_1 = new THREE.Color('yellow');
    static COLOR_2 = new THREE.Color('red');
    static MAX_VAL = 2.0;
    static COLOR_OPACITY = 200;

    constructor(video) {
        super(video);

    }

    addTopic(topic) {
		super.addTopic(topic);
        this.setupOverlay(topic);
    }

    setupOverlay(topic) {
        let overlay = this.overlays[topic];
        if (!overlay) return;

        overlay.container_el = $('<div class="cmd-vel-overlay"/>');
        overlay.left_el = $('<div class="dir left"></div>');
        overlay.left_arrow_el = $('<span/>').appendTo(overlay.left_el);
        overlay.right_el = $('<div class="dir right"></div>');
        overlay.right_arrow_el = $('<span/>').appendTo(overlay.right_el);
        overlay.fw_el = $('<div class="dir fw"></div>');
        overlay.fw_arrow_el = $('<span/>').appendTo(overlay.fw_el);
        overlay.back_el = $('<div class="dir back"></div>');
        overlay.back_arrow_el = $('<span/>').appendTo(overlay.back_el);
        overlay.rot_left_el = $('<div class="dir rot-left"></div>');
        overlay.rot_left_arrow_el = $('<span/>').appendTo(overlay.rot_left_el);
        overlay.rot_right_el = $('<div class="dir rot-right"></div>');
        overlay.rot_right_arrow_el = $('<span/>').appendTo(overlay.rot_right_el);
        overlay.container_el.append([ overlay.left_el, overlay.right_el, overlay.fw_el, overlay.back_el, overlay.rot_left_el, overlay.rot_right_el ]);
        overlay.container_el.appendTo(this.video.overlay_el);

    }

    onTopicData(topic, msg) {
        let overlay = this.overlays[topic];
        if (!overlay) return;
        if (!overlay.container_el) return;

        const opacity = CustomVideoWidget_CmdVel.COLOR_OPACITY.toString(16).padEnd(2,'0');

        let fw_c = CustomVideoWidget_CmdVel.COLOR_1.clone().lerp(CustomVideoWidget_CmdVel.COLOR_2, Math.abs(msg.twist.linear.x) / CustomVideoWidget_CmdVel.MAX_VAL);
        if (msg.twist.linear.x > 0) overlay.fw_arrow_el.css('background-color', '#'+fw_c.getHexString()+opacity);
        else overlay.fw_arrow_el.css('background-color', CustomVideoWidget_CmdVel.COLOR_OFF);
        if (msg.twist.linear.x < 0) overlay.back_arrow_el.css('background-color', '#'+fw_c.getHexString()+opacity);
        else overlay.back_arrow_el.css('background-color', CustomVideoWidget_CmdVel.COLOR_OFF);

        let lr_c = CustomVideoWidget_CmdVel.COLOR_1.clone().lerp(CustomVideoWidget_CmdVel.COLOR_2, Math.abs(msg.twist.linear.y) / CustomVideoWidget_CmdVel.MAX_VAL);
        if (msg.twist.linear.y > 0) overlay.left_arrow_el.css('background-color', '#'+lr_c.getHexString()+opacity);
        else overlay.left_arrow_el.css('background-color', CustomVideoWidget_CmdVel.COLOR_OFF);
        if (msg.twist.linear.y < 0) overlay.right_arrow_el.css('background-color', '#'+lr_c.getHexString()+opacity);
        else overlay.right_arrow_el.css('background-color', CustomVideoWidget_CmdVel.COLOR_OFF);

        let rot_c = CustomVideoWidget_CmdVel.COLOR_1.clone().lerp(CustomVideoWidget_CmdVel.COLOR_2, Math.abs(msg.twist.angular.z) / CustomVideoWidget_CmdVel.MAX_VAL);
        if (msg.twist.angular.z > 0) overlay.rot_left_arrow_el.css('background-color', '#'+rot_c.getHexString()+opacity);
        else overlay.rot_left_arrow_el.css('background-color', CustomVideoWidget_CmdVel.COLOR_OFF);
        if (msg.twist.angular.z < 0) overlay.rot_right_arrow_el.css('background-color', '#'+rot_c.getHexString()+opacity);
        else overlay.rot_right_arrow_el.css('background-color', CustomVideoWidget_CmdVel.COLOR_OFF);
    }

    clearVisuals(topic) {
        let overlay = this.overlays[topic];
        if (!overlay) return;
        if (overlay.container_el) {
            overlay.container_el.remove();
            delete overlay.container_el;
        }
    }
}
