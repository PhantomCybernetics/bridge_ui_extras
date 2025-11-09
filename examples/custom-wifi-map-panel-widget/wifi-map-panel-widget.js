import { CompositePanelWidgetBase } from 'static/widgets/inc/composite-widget-base.js'
import * as THREE from "three";

export class CustomWifiMapPanelWidget extends CompositePanelWidgetBase {

    static label = "Wi-Fi Signal Strength Map";

    static default_width = 5;
	static default_height = 18;

    static SIGNAL_LAYER = 0;
    static POSE_LAYER = 1;

    constructor(panel) {
        super(panel, 'wifi-map');

        //this.pose_graph = [];
		//this.scan_graph = [];
		//this.scans_to_process = {};

		//this.last_pose_rendered = -1;
		//this.last_scan_rendered = -1;

		// this.clear_pose = true;
		// this.clear_scan = true;

		this.tile_size = 500;
		this.svg_width = this.tile_size;
		this.svg_height = this.tile_size;
		this.svg_offset = [ -this.svg_width / 2.0, -this.svg_height / 2.0 ];
		this.svg_content_offset = [ 0, 0 ];
		this.render_scale = 100;
		this.base_pos = [ this.tile_size / 2.0, this.tile_size / 2.0];

		this.last_wifi_marker = null;
		this.last_wifi_marker_coords = null;
		this.last_odo = null;
		this.last_odo_mark_coords = null;

		this.color_wifi_max = new THREE.Color(0x0000ff);
		this.color_wifi_min = new THREE.Color(0xff0000);

        this.sources.add(
			"nav_msgs/msg/Odometry",
			"Odometry source",
			null,
			1,
			(topic, msg) => this.onOdometryData(topic, msg),
		);
		this.sources.add(
			"phntm_interfaces/msg/IWStatus",
			"Wi-Fi signal source",
			null,
			1,
			(topic, msg) => this.onWifiData(topic, msg),
		);
		this.sources.add(
			"sensor_msgs/msg/LaserScan",
			"Lidar source",
			null,
			1,
			(topic, msg) => this.onLaserData(topic, msg),
		);

        this.sources.loadAssignedTopicsFromPanelVars(); // init sources
        
		this.default_zoom = 1.0;
		this.default_rot = 0.0;
        this.zoom = this.panel.getPanelVarAsFloat('z', this.default_zoom);
		this.rot = this.panel.getPanelVarAsInt('r', this.default_rot);
		this.follow_target = this.panel.getPanelVarAsFloat('ft', true);
		this.setFollowTarget(this.follow_target);

		this.container_el = $('<div class="container" id="wifi-map-'+this.panel.n+'"></div>');
		this.arrow_el = $('<span title="Follow target" class="arrow"/>');
		this.container_el.append(this.arrow_el);
		this.widget_el.append(this.container_el);

        //this.zoomable_tiles = new Zoomable2DTiles(this.panel, this.widget_el, 1.0, 0);
		this.svg = d3
			.select('#wifi-map-'+this.panel.n)
			.append("svg")
			.attr("id", "svg-wifi-map-"+this.panel.n)
			.attr("width", this.svg_width)
			.attr("height", this.svg_height);
		this.svg_group = this.svg.append('g');
		this.svg_group.attr('transform', 'translate(' + this.svg_content_offset[0] + ',' + this.svg_content_offset[1] + ')');
		this.svg_wifi_group = this.svg_group.append('g');
		this.svg_el = $('#svg-wifi-map-'+this.panel.n);
		this.svg_el.css({
			'left': this.svg_offset[0],
			'top': this.svg_offset[1],
		});

		this.path_points = [ [ this.base_pos[0], this.base_pos[1] ] ];
		
		this.line_width = 1.0;
		this.line_dash_length = 3.0;
		let dash = (1.0 / this.zoom) * this.line_dash_length;
		this.line = d3.line();
		this.path = this.svg_group.append("path")
			.attr("d", this.line(this.path_points))
			.attr("fill", "none")
			.attr("stroke", "#ffffff")
			.attr("stroke-dasharray", dash+','+dash)
			.style("stroke-width", (1.0 / this.zoom) * this.line_width);
		this.path.raise(); // make sure path is above the wifi markers

		this.zoom_val_btn = null; // in setMenu
		this.follow_target_cb = null;

        this._rot = new THREE.Quaternion();
		this._euler = new THREE.Euler();

        this.base_offset_pos = null;
		this.base_offset_rot = null;
        
		let that = this;

		this.arrow_el.click((ev) => {
			ev.preventDefault(); // prevent from moving the panel
			that.follow_target = true;
			that.setFollowTarget(that.follow_target);
		});

		this.container_el.css({
			left: this.panel.widget_width / 2.0,
			top: this.panel.widget_height / 2.0,
			scale: this.zoom,
		});

		this.drag_mouse_offset = [];
		this.drag_frame_offset = [];
		this.dragging = false;

		this.widget_el.on("mousedown touchstart", (ev) => {
			if (ev.button === 0) {
				ev.preventDefault();
				that.drag_mouse_offset = [ev.originalEvent.pageX, ev.originalEvent.pageY];
				let cont_pos = that.container_el.position();
				that.drag_frame_offset = [cont_pos.left, cont_pos.top];
				that.dragging = true;
			}
		});

		this.widget_el.on("wheel", (ev) => {
			ev.preventDefault();
			let d = ev.originalEvent.deltaY;
			that.setZoom(that.zoom - d * 0.005);
		});

		$(window.document).on("mousemove touchmove", function (ev) {
			if (that.dragging) {
				ev.preventDefault();

				if (that.follow_target) {
					that.follow_target = false;
					that.setFollowTarget(that.follow_target);	
				}

				that.container_el.css({
					left: that.drag_frame_offset[0] + (ev.originalEvent.pageX - that.drag_mouse_offset[0]),
					top: that.drag_frame_offset[1] + (ev.originalEvent.pageY - that.drag_mouse_offset[1])
				});
			}
		});

		$(window.document).on("mouseup touchend", function (ev) {
			that.dragging = false;
		});
    }

	setZoom(zoom) {
		if (zoom < 0.1) {
			this.zoom = 0.1;
		} else if (zoom > 5.0) {
			this.zoom = 5.0;
		} else {
			this.zoom = zoom;
		}
		
		this.zoom_val_btn.text("Zoom: " + this.zoom.toFixed(1) + "x");
		this.panel.storePanelVarAsFloat('z', this.zoom); // store in panel vars
		let oldPos = this.arrow_el.offset();

		this.container_el.css({ scale: this.zoom });
		let newPos = this.arrow_el.offset();
		let pos = this.container_el.position();
		this.container_el.css({
			left: pos.left - (newPos.left - oldPos.left),
			top: pos.top - (newPos.top - oldPos.top),
		});

		this.path.style("stroke-width", (1.0 / this.zoom) * this.line_width);
		let dash = (1.0 / this.zoom) * this.line_dash_length;
		this.path.attr("stroke-dasharray", dash+','+dash);
		this.setArrowPosition();
		//this.render_dirty = true;
	}

	setFollowTarget(state) {
		if (this.follow_target_cb)
			this.follow_target_cb.prop("checked", state);
		this.panel.storePanelVarAsBool('ft', state); // store in panel vars

		if (state)
			this.widget_el.removeClass('scrollable');
		else
			this.widget_el.addClass('scrollable');
	}

    setupMenu(menu_els) {
		super.setupMenu(menu_els); // sources

		let that = this;


		// follow target
		let follow_target_line_el = $('<div class="menu_line"></div>');
		let follow_target_label_el = $('<label for="follow_target_' + this.panel.n + '">Follow target</label>');
		this.follow_target_cb = $('<input type="checkbox" id="follow_target_' + this.panel.n + '" title="Follow target"/>');
		if (this.follow_target)
			this.follow_target_cb.prop('checked', true);
		follow_target_label_el.append(this.follow_target_cb);
		follow_target_line_el.append(follow_target_label_el);

		this.follow_target_cb.change(function (ev) {
			that.follow_target = $(this).prop("checked");
			that.setFollowTarget(that.follow_target);
		});
		menu_els.push(follow_target_line_el);

		// clear display
		let clear_line_el = $('<div class="menu_line"></div>');
		let clear_btn = $('<a href="#" id="clear_panel_link_' + this.panel.n + '">Clear</a>');
		clear_btn.appendTo(clear_line_el);
		clear_btn.click((ev) => {
			ev.preventDefault(); //stop from moving the panel
			that.clear();
		});
		menu_els.push(clear_line_el);

		// zoom control
		let zoom_ctrl_line_el = $('<div class="menu_line zoom_ctrl" id="zoom_ctrl_' + this.panel.n + '"></div>');
		let zoom_minus_btn = $('<span class="minus">-</span>');
		this.zoom_val_btn = $('<button class="val" title="Reset zoom">Zoom: ' + this.zoom.toFixed(1) + "x</button>",);
		let zoom_plus_btn = $('<span class="plus">+</span>');
		zoom_ctrl_line_el.append([zoom_minus_btn, this.zoom_val_btn, zoom_plus_btn]);
		zoom_plus_btn.click(function (ev) {
			that.setZoom(that.zoom + that.zoom / 2.0);
		});
		zoom_minus_btn.click(function (ev) {
			that.setZoom(that.zoom - that.zoom / 2.0);
		});
		this.zoom_val_btn.click(function (ev) {
			that.setZoom(that.default_zoom);
		});
		menu_els.push(zoom_ctrl_line_el);
	}

	clear() {
        //this.clear_pose = true;
        // //this.clear_scan = true;
        // this.last_pose_rendered = -1;
        // this.last_scan_rendered = -1;
        // this.scan_graph = [];
        // this.pose_graph = [];
        // this.zoomable_tiles.clearTiles([ CustomLaserOdoPanelWidget.SCAN_LAYER, CustomLaserOdoPanelWidget.POSE_LAYER ], true);
        // this.render_dirty = true;

		this.path_points = [ [ this.base_pos[0], this.base_pos[1] ] ];
		this.path.attr("d", this.line(this.path_points));
		this.svg.selectAll("circle").remove();
		this.base_offset_pos = null;
    }

	setArrowPosition() {
		let scaled_x = this.last_odo[0];
		let scaled_y = this.last_odo[1];
		let rot_rad  = this.last_odo[2];

		this.arrow_el.css({
			left: scaled_x - 10 + "px",
			top: scaled_y - 10 + "px",
			transform: "rotate(" + (-rot_rad - Math.PI / 2) + "rad)",
			scale: 1.0 / this.zoom,
			display: "block",
		});

		if (this.follow_target) {
			this.container_el.css({
				left: (this.panel.widget_width / 2.0) - scaled_x * this.zoom,
				top: (this.panel.widget_height / 2.0) - scaled_y * this.zoom,
			});
		}
	}

	distance2D(point1, point2) {
		const dx = point2[0] - point1[0];
		const dy = point2[1] - point1[1];
		return Math.sqrt(dx * dx + dy * dy);
	}

	onOdometryData (topic, msg) {
		if (this.panel.paused) return;

		this.panel.updateFps(); // you need to call this yourself in composite widgets

		let x = -msg.pose.pose.position.y;
		let y = -msg.pose.pose.position.x;

		if (this.base_offset_pos == null)
            this.base_offset_pos = [x, y];

		this._rot.set(
			msg.pose.pose.orientation.x,
			msg.pose.pose.orientation.y,
			msg.pose.pose.orientation.z,
			msg.pose.pose.orientation.w,
		);
		this._euler.setFromQuaternion(this._rot);

		let angle_rad = this._euler.z - Math.PI/2;
		// console.log('Got odo rot: ', angleInRadians);

		let x_display = (x - this.base_offset_pos[0]) * this.render_scale;
		let y_display = (y - this.base_offset_pos[1]) * this.render_scale;

		if (!this.last_odo_mark_coords || this.distance2D([x_display, y_display], this.last_odo_mark_coords) > 1) {
			this.last_odo_mark_coords = [ x_display, y_display ];
			let px = this.base_pos[0] + x_display;
			let py = this.base_pos[1] + y_display;
			this.path_points.push([ px, py ]);
			this.expandSVG(px, py);
			this.path.attr("d", this.line(this.path_points));
		}

		this.last_odo = [ x_display, y_display, angle_rad ];
		this.setArrowPosition();

		// let ns_stamp = msg.header.stamp.sec * 1000000000 + msg.header.stamp.nanosec;

		// let angular_speed = 0;
		// if (this.pose_graph.length) {
		// 	let ns_d = ns_stamp - this.pose_graph[this.pose_graph.length - 1][0];
		// 	let rad_d = angle_rad - this.pose_graph[this.pose_graph.length - 1][3];
		// 	angular_speed = (rad_d / ns_d) * 1000000000.0;
		// }

		// this.pose_graph.push([
		// 	ns_stamp, //ns
		// 	x - this.base_offset_pos[0],
		// 	y - this.base_offset_pos[1],
		// 	angle_rad,
		// 	angular_speed,
		// ]);

		// if (this.scans_to_process[ns_stamp]) {
		// 	console.log("Late processing scan " + ns_stamp);
		// 	let scan = this.scans_to_process[ns_stamp];
		// 	delete this.scans_to_process[ns_stamp];
		// 	//this.onScanData(scan, ns_stamp, this.pose_graph.length - 1);
		// }

		// that.last_odo = odo;
		//this.render();
	}

	onWifiData (topic, msg) {
		if (this.panel.paused) return;

		let px = this.path_points[this.path_points.length-1][0];
		let py = this.path_points[this.path_points.length-1][1];
		let r = msg.quality * 2.0;
		let c = this.color_wifi_min.clone().lerp(this.color_wifi_max, msg.quality/100.0);

		this.expandSVG(px+r, py+r);
		this.expandSVG(px-r, py-r);

		// if (this.last_wifi_marker) { // prevent from adding too many markers too close
		// 	let d = ;
		// 	// if (d < 20) {
		// 	// 	this.last_wifi_marker.remove();
		// 	// }
		// }

		let drop_marker = this.last_wifi_marker ? this.distance2D([ px,py ], this.last_wifi_marker_coords) > 20 : true;
		if (drop_marker) {
			this.last_wifi_marker_coords = [ px, py ];
			this.last_wifi_marker = this.svg_wifi_group.append("circle")
				.attr("cx", px)         // x center position
				.attr("cy", py)         // y center position
				.attr("r", r)           // radius = diameter/2 = 100/2 = 50
				.attr("fill", '#'+c.getHexString()+'33')    // fill color
				.attr("stroke", "none"); // no stroke
			//this.path.raise(); // amke sure path is above the
		}
	}

	onLaserData (topic, msg) 
	{
		
	}

	expandSVG(px, py) {

		 // expand left
		if (px < -this.svg_content_offset[0]) {
			this.svg_width += this.tile_size;
			this.svg_offset[0] -= this.tile_size;
			this.svg_content_offset[0] += this.tile_size;
			this.svg.attr('width', this.svg_width);
			this.svg_el.css({
				'left': this.svg_offset[0]
			});
			this.svg_group.attr('transform', 'translate(' + this.svg_content_offset[0] + ',' + this.svg_content_offset[1] + ')');

		// expand right
		} else if (px > this.svg_width - this.svg_content_offset[0]) { 
			this.svg_width += this.tile_size;
			this.svg.attr('width', this.svg_width);
		}

		// expand up
		if (py < -this.svg_content_offset[1]) {  
			this.svg_height += this.tile_size;
			this.svg_offset[1] -= this.tile_size;
			this.svg_content_offset[1] += this.tile_size;
			this.svg.attr('height', this.svg_height);
			this.svg_el.css({
				'top': this.svg_offset[1]
			});
			this.svg_group.attr('transform', 'translate(' + this.svg_content_offset[0] + ',' + this.svg_content_offset[1] + ')');
			
		// expand down
		} else if (py > this.svg_height - this.svg_content_offset[1]) {
			this.svg_height += this.tile_size;
			this.svg.attr('height', this.svg_height);
		}
	}

	// onScanData (topic, msg) {
	// 	if (this.panel.paused) return;

	// 	if (!this.pose_graph.length) return; //ignore

	// 	// if (ns_stamp === null)
	// 	let ns_stamp = msg.header.stamp.sec * 1000000000 + msg.header.stamp.nanosec; //ns

	// 	// if (k < 0)
    //     let k = this.pose_graph.length - 1;
	// 	let pose = this.pose_graph[k];

	// 	let x = pose[1];
	// 	let y = pose[2];
	// 	let angle_rad = pose[3];

	// 	let scan_data = [
	// 		ns_stamp,
	// 		k,
    //         x, y,
	// 		//msg.range_max,
	// 		//Math.abs(pose[4]) > 0.01 ? pose[4] : 0.0, // ang speed
	// 		// vec2 points follow
    //         [ ]
	// 	];

	// 	let rot = angle_rad + msg.angle_min;

	// 	for (let j = 0; j < msg.ranges.length; j++) {
	// 		let val = msg.ranges[j];
	// 		if (val === null || val > msg.range_max || val < msg.range_min) continue;

	// 		let fw = [val, 0];

	// 		// let arad = deg2rad(anglePerRange * j);
	// 		// arad = -1.0*a + (Math.PI - arad);
	// 		//  + ;

	// 		scan_data[4].push([
    //             Math.cos(rot) * fw[0] - Math.sin(rot) * fw[1],
    //             Math.sin(rot) * fw[0] + Math.cos(rot) * fw[1]
    //         ]);

	// 		rot += msg.angle_increment;
	// 	}

	// 	this.scan_graph.push(scan_data);

	// 	this.render();
	// }

	// render() {
	// 	// if (clear_pose !== undefined)
    //     //     this.clear_pose = clear_pose;

	// 	// if (clear_scan !== undefined)
    //     //     this.clear_scan = clear_scan;

    //     this.render_dirty = true;
	// }

	// renderingLoop() {
	// 	if (!this.rendering) return; // loop killed

	// 	//this.zoomable_tiles.render();
		
	// 	// if (this.clear_scan || this.clear_pose) {
	// 	// 	let layers = [];
	// 	// 	if (this.clear_scan) layers.push(CustomLaserOdoPanelWidget.SCAN_LAYER);
	// 	// 	if (this.clear_pose) layers.push(CustomLaserOdoPanelWidget.POSE_LAYER);
	// 	// 	this.zoomable_tiles.clearTiles(layers);
	// 	// }

	// 	// if (this.clear_scan) {
	// 	// 	this.clear_scan = false;
			
	// 	// }
	// 	// if (this.clear_pose) {
	// 	// 	this.clear_pose = false;
	// 	// 	this.last_pose_rendered = -1;
	// 	// }

	// 	// move arrow to position
	// 	if (this.pose_graph.length) {
    //         this.zoomable_tiles.setArrowPosition(
    //             this.pose_graph[this.pose_graph.length - 1][1], // y
    //             this.pose_graph[this.pose_graph.length - 1][2], // z
    //             this.pose_graph[this.pose_graph.length - 1][3]
    //         )
	// 	}

	// 	if (!this.render_dirty) {
	// 		requestAnimationFrame((t) => this.renderingLoop());
    //         return;
	// 	}

	// 	//panel.display_widget.fillStyle = "#fff";

	// 	if (this.pose_graph.length > 1 && this.pose_graph.length - 1 > this.last_pose_rendered) {
	// 		if (this.last_pose_rendered < 0) this.last_pose_rendered = 0;

	// 		let p0 = [
	// 			this.pose_graph[this.last_pose_rendered][1] * this.zoomable_tiles.render_scale,
	// 			this.pose_graph[this.last_pose_rendered][2] * this.zoomable_tiles.render_scale,
	// 		];

	// 		let tile0 = null;
	// 		let tile1 = null;
	// 		let tile1_dirty = false;
	// 		// let t_half = this.tile_size/2.0;

	// 		for (let i = this.last_pose_rendered + 1; i < this.pose_graph.length; i++) {
	// 			let p1 = [
	// 				this.pose_graph[i][1] * this.zoomable_tiles.render_scale,
	// 				this.pose_graph[i][2] * this.zoomable_tiles.render_scale,
	// 			];

	// 			tile0 = this.zoomable_tiles.getTile(p0[0], p0[1], CustomLaserOdoPanelWidget.POSE_LAYER);
	// 			tile1 = this.zoomable_tiles.getTile(p1[0], p1[1], CustomLaserOdoPanelWidget.POSE_LAYER);

	// 			if (tile0 != tile1 && tile1_dirty) {
	// 				// console.log('switched tile');
	// 				tile0.ctx.lineTo(p1[0] - tile0.x, p1[1] - tile0.y);
	// 				tile0.ctx.stroke();
	// 				// tile0.ctx.closePath();
	// 				// tile0.ctx.moveTo(t_half,t_half); //test

	// 				tile1.ctx.beginPath();
	// 				tile1.ctx.strokeStyle = "#00ff00";
	// 				tile1.ctx.lineWidth = 2.0;
	// 				tile1.ctx.moveTo(p0[0] - tile1.x, p0[1] - tile1.y);
	// 			}

	// 			if (!tile1_dirty) {
	// 				tile1_dirty = true;
	// 				// console.log('starting tile');

	// 				tile1.ctx.beginPath();
	// 				tile1.ctx.strokeStyle = "#00ff00";
	// 				tile1.ctx.lineWidth = 2.0;
	// 				tile1.ctx.moveTo(p0[0] - tile1.x, p0[1] - tile1.y);
	// 			} //{ // crossing canvas border

	// 			tile1.ctx.lineTo(p1[0] - tile1.x, p1[1] - tile1.y);
	// 			tile1.ctx.moveTo(p1[0] - tile1.x, p1[1] - tile1.y);

	// 			tile0 = tile1;
	// 			p0 = p1;

	// 			this.last_pose_rendered = i;
	// 		}

	// 		if (tile1_dirty) {
	// 			tile1_dirty = false;
	// 			tile1.ctx.stroke();
	// 			// tile1.ctx.closePath();
	// 		}

	// 		// this.ctx_overlay.beginPath();

	// 		// let x = frame[0] + this.pose_graph[this.last_pose_rendered][1] * this.render_scale;
	// 		// let y = frame[1] + this.pose_graph[this.last_pose_rendered][2] * this.render_scale;

	// 		// this.ctx_overlay.strokeStyle = '#00ff00';
	// 		// let width = Math.max(1.0/this.panel.zoom, 1.0);
	// 		// this.ctx_overlay.lineWidth = width;
	// 		// this.ctx_overlay.moveTo(x, y);
	// 		// for (let i = this.last_pose_rendered+1; i < this.pose_graph.length; i++) {
	// 		//     x = frame[0] + this.pose_graph[i][1] * this.render_scale;
	// 		//     y = frame[1] + this.pose_graph[i][2] * this.render_scale;
	// 		//     this.ctx_overlay.lineTo(x, y);
	// 		//     // this.ctx.moveTo(x, y);
	// 		//     this.last_pose_rendered = i;
	// 		// }
	// 		// this.ctx_overlay.stroke();
	// 	}

	// 	if (this.scan_graph.length > 0 && this.scan_graph.length - 1 > this.last_scan_rendered) {
	// 		if (this.last_scan_rendered < 0)
    //             this.last_scan_rendered = 0;

	// 		for (let i = this.last_scan_rendered; i < this.scan_graph.length; i++) {
	// 			// let pos = this.scan_graph[i][1];
	// 			// let range = this.scan_graph[i][2];

	// 			// let ang_speed = Math.abs(this.scan_graph[i][3]);
	// 			// //let amount =
	// 			// let amount = Math.min(Math.max(ang_speed / 2.0, 0.0), 1.0);
	// 			// let c = lerpColor('#FF0000', '#000000', amount);
	// 			// let alpha = parseInt(lerp(255, 50, amount));
	// 			// let a = alpha.toString(16).padStart(2, '0');

	// 			// this.ctx.fillStyle = c + a;
	// 			// if (amount)
	// 			//     console.log(ang_speed.toFixed(2)+' => '+amount.toFixed(2)+' ', c, a, this.ctx.fillStyle);
	// 			// else
	// 			//     console.log(ang_speed.toFixed(2)+' => ', this.ctx.fillStyle);

	// 			// this.ctx.fillStyle = "#000000ff";
	// 			// this.ctx.beginPath();
	// 			// this.ctx.arc(
	// 			//     frame[0] + this.pose_graph[pos][1] * panel.zoom,
	// 			//     frame[1] + this.pose_graph[pos][2] * panel.zoom,
	// 			//     range * panel.zoom, 0, 2 * Math.PI);
	// 			// this.ctx.fill();

    //             let scan_data = this.scan_graph[i];
	// 			// let last_tile = null;
	// 			for (let j = 0; j < scan_data[4].length; j++) {
	// 				let x = scan_data[2] + scan_data[4][j][0] * this.zoomable_tiles.render_scale;
	// 				let y = scan_data[3] + scan_data[4][j][1] * this.zoomable_tiles.render_scale;

	// 				let tile = this.zoomable_tiles.getTile(x, y, CustomLaserOdoPanelWidget.SCAN_LAYER);

	// 				tile.ctx.fillStyle = "#FF0000";

	// 				tile.ctx.fillRect(x - tile.x - 5, y - tile.y - 5, 5, 5);

	// 				// if (t != last_tile) {
	// 				//     last_tile = t;
	// 				// }
	// 				// this.ctx.fillRect( x, y, 1, 1 );

	// 				// let d  = this.px.data;                        // only do this once per page
	// 				// d[0]   = 255;
	// 				// d[1]   = 0;
	// 				// d[2]   = 0;
	// 				// d[3]   = 255;
	// 				// this.ctx.putImageData(this.px, x, y);

	// 				// console.log(i, j, this.scan_graph[i][j])

	// 				// this.ctx.fillStyle = "#ff0000";
	// 				// this.ctx.beginPath();
	// 				// this.ctx.arc(
	// 				//     x,
	// 				//     y,
	// 				//     .5, 0, 2 * Math.PI);
	// 				// this.ctx.fill();
	// 			}

	// 			// this.ctx.lineTo(x, y);
	// 			// this.ctx.moveTo(x, y);

	// 			this.last_scan_rendered = i;
	// 		}
	// 	}

	// 	// for (let i = 0; i < panel.data_trace.length; i++) {
	// 	//     let pts = panel.data_trace[i];

	// 	//     for (let j = 0; j < pts.length; j++) {
	// 	//         let p = [ pts[j][0]*panel.zoom, pts[j][1]*panel.zoom ]; //zoom applied here
	// 	//         this.ctx.fillStyle = (i == panel.data_trace.length-1 ? "#ff0000" : "#aa0000");
	// 	//         this.ctx.beginPath();
	// 	//         this.ctx.arc(frame[0]+p[0], frame[1]-p[1], 1.5, 0, 2 * Math.PI);
	// 	//         this.ctx.fill();
	// 	//     }
	// 	// }
    //     this.render_dirty = false;

	// 	requestAnimationFrame((t) => this.renderingLoop());
	// }

    onClose() {
        console.warn("Closing odoscan widget");
		//this.rendering = false; //kills the loop
        super.onClose();
    }

}