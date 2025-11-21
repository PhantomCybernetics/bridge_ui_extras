import { WorldModel3DPluginBase } from 'https://bridge.phntm.io/static/widgets/world-model-3d/world-model-plugin-base.js'
import * as THREE from "three";

export class CustomWorldModelBatteryPlugin extends WorldModel3DPluginBase {

    static SOURCE_TOPIC_TYPE = 'sensor_msgs/msg/BatteryState';
    static SOURCE_DESCRIPTION = 'Battery state';   
    static SOURCE_DEFAULT_TOPIC = null;
    static SOURCE_MAX_NUM = 1; // only one source allowed

    constructor(world_model) {
        super(world_model);
    }

    addTopic(topic) {
        super.addTopic(topic);

        let config = this.client.getTopicConfig(topic);
        this.setTopicConfig(topic, config);

        this.overlays[topic].config_change_cb = (new_config) => { // we need a wrapper for config change
            this.setTopicConfig(topic, new_config);
        }
        this.client.onTopicConfig(topic, this.overlays[topic].config_change_cb); // rebuild from new config when the bridge node restarts (urdf model may not change)
    }

    setTopicConfig(topic, config) {
        this.overlays[topic].config = config

        if (config['min_voltage'] === undefined) {
            console.error('No min_voltage specified for '+topic+', not rendering');
            this.clearTopic(topic);
            return;
        }
        if (config['max_voltage'] === undefined) {
            console.error('No max_voltage specified for '+topic+', not rendering');
            this.clearTopic(topic);
            return;
        }

        // store cusotm data in overlays
        this.overlays[topic].min_voltage = config['min_voltage'];
        this.overlays[topic].max_voltage = config['max_voltage'];
        this.overlays[topic].num_segments = config['world_model.num_segments'] ? config['world_model.num_segments'] : 10;
        this.overlays[topic].offset_pos = config['world_model.offset_pos'] ? new THREE.Vector3().fromArray(config['world_model.offset_pos']) : new THREE.Vector3(0,0,0);
        this.overlays[topic].offset_rot = config['world_model.offset_rot'] ? new THREE.Quaternion().setFromEuler(new THREE.Euler().fromArray(config['world_model.offset_rot'])) : new THREE.Quaternion();
        this.overlays[topic].scale = config['world_model.scale'] ? new THREE.Vector3().fromArray(config['world_model.scale']) : new THREE.Vector3(1,1,1);
        this.overlays[topic].color_on = config['world_model.color_on'] ? new THREE.Color(config['world_model.color_on']) : new THREE.Color('green');
        this.overlays[topic].color_off = config['world_model.color_off'] ? new THREE.Color(config['world_model.color_off']) : new THREE.Color('black');    
        this.overlays[topic].material_on = new THREE.MeshStandardMaterial({
            emissive: this.overlays[topic].color_on.clone().lerp(new THREE.Color('black'), 0.5),
            color: this.overlays[topic].color_on.clone().lerp(new THREE.Color('black'), 0.5),
            transparent: false
        });
        this.overlays[topic].material_off = new THREE.MeshStandardMaterial({
            color: this.overlays[topic].color_off,
            transparent: false
        });

        this.clearVisuals(topic); // force re-render
    }

    onTopicData(topic, msg) {
        if (this.world_model.panel.paused)
            return;
        let overlay = this.overlays[topic];
        if (!overlay)
            return;
        overlay.last_voltage = msg.voltage;
        overlay.last_percentage = msg.percentage;

        if (!overlay.container) {
            let frame_id = overlay.config['force_frame_id'] ? overlay.config['force_frame_id']  : msg.header.frame_id;
            let frame = frame_id ? this.world_model.robot_model.getFrame(frame_id) : null;
            if (!frame_id || !frame) {
                let err = 'Frame "' + frame_id+ '" not found in robot model for battery data from ' + topic;
                this.ui.showNotification(err, "error");
                console.error(err);
                this.clearTopic(topic);
                return;
            }
            overlay.container = new THREE.Object3D();
            frame.add(overlay.container);
            overlay.container.position.copy(overlay.offset_pos);
            overlay.container.quaternion.copy(overlay.offset_rot);
            overlay.container.scale.copy(overlay.scale);

            overlay.markers = [];
            for (let i = 0; i < overlay.num_segments; i++) {
                const geometry = new THREE.BoxGeometry(1, 1, 1);
                const m = new THREE.Mesh(geometry, overlay.material_off);
                m.castShadow = true;
                m.receiveShadow = true;
                overlay.markers.push(m);
                overlay.container.add(m);
                m.position.set((i * 1.5), 0.0, 0.0);
            }
        }
    }

    onRender() {
        if (!this.world_model.robot_model)
            return; // wait for the robot model to load

        let topics = Object.keys(this.overlays);
        let that = this;
        topics.forEach((topic)=>{
            let overlay = that.overlays[topic];
            if (overlay.last_percentage === undefined)
                return; // wait for data

            if (!overlay.container)
                return;

            let num_leds_on = Math.round(overlay.last_percentage * overlay.num_segments);
            for (let i = 0; i < overlay.num_segments; i++) {
                overlay.markers[i].material = i <= num_leds_on ? overlay.material_on : overlay.material_off;
            }
        });
    }

    clearVisuals(topic) {
        if (this.overlays[topic].container) {
            this.overlays[topic].container.removeFromParent();
            delete this.overlays[topic].container;
        }
    }

    clearTopic(topic) {
        this.client.offTopicConfig(topic, this.overlays[topic].config_change_cb);
        super.clearTopic(topic);
    }
}