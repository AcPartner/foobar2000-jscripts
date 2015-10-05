// 2015/09/21
function oVolume() {
	this.pos = 0;
	this.drag = false;
	//
	this.isHover = function(x, y) {
		return x > this.x && x < this.x + this.w && y > this.y - 5 && y < this.y + this.h + 10;
	}

	this.repaint = function() {
		window.RepaintRect(this.x - 2, this.y - 2, this.w + 4, this.h + 4);
	};

	this.draw = function(gr) {
		var pos;
		// bg
		gr.FillSolidRect(this.x, this.y, this.w, this.h, slider_bg_color);
		pos = vol2pos(fb.Volume);
		if (pos > 0) {
			gr.FillSolidRect(this.x, this.y, this.w * pos, this.h, slider_active_color);
		};
	};

	this.setSize = function(x, y, w, h) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
	};

	this.onMouse = function(event, x, y, mask) {
		var pos, is_hover;
		var delta;
		is_hover = this.isHover(x, y);
		switch(event) {
			case "move":
				if (this.drag) {
					x -= this.x;
					pos = x < 0 ? 0 : x > this.w ? 1 : x / this.w;
					fb.Volume = pos2vol(pos);
				};
				break;
			case "down":
				if (is_hover) {
					this.drag = true;
					x -= this.x;
					pos = x < 0 ? 0 : x > this.w ? 1 : x / this.w;
					fb.Volume = pos2vol(pos);
				} else {
					this.drag = false;
				};
				break;
			case "up":
				this.drag = false;
				break;
			case "wheel":
				if (is_hover) {
					delta = mask;
					pos = vol2pos(fb.Volume);
					pos += delta / 50;
					pos = (pos < 0 ? 0 : pos > 1 ? 1 : pos);
					fb.Volume = pos2vol(pos);
				};
				break;
		}
	};

};

function oSeekBar() {
	this.pos = 0;
	this.drag = false;
	this.visible = true;

	this.setSize = function(x, y, w, h) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
	};

	this.repaint = function() {
		window.RepaintRect(this.x - 2, this.y - 2, this.w + 4, this.h + 4);
	};

	this.isHover = function(x, y) {
		return (x > this.x && x < this.x + this.w && y > this.y - 5 && y < this.h + this.y + 10);
	};

	this.draw = function(gr) {
		if (!this.visible) {return; }
		gr.FillSolidRect(this.x, this.y, this.w, this.h, slider_bg_color);
		if (fb.PlaybackTime) {
			this.pos = fb.PlaybackTime / fb.PlaybackLength;
			if (fb.IsPlaying && this.pos > 0) {
				gr.FillSolidRect(this.x, this.y, this.pos * this.w, this.h, slider_active_color);
			};
		};
	};

	this.onMouse = function(event, x, y, mask) {
		if (!this.visible) { return };
		var fb_playback_time;
		switch(event) {
			case "move":
				if (this.drag) {
					x -= this.x;
					this.pos = x < 0 ? 0 : x > this.w ? 1 : x / this.w;
					fb_playback_time = fb.PlaybackLength * this.pos;
					fb.PlaybackTime = fb_playback_time < fb.PlaybackLength ? fb_playback_time : fb.PlaybackLength;
					this.repaint();
				};
				break;
			case "down":
				if (this.isHover(x, y)) {
					if (fb.IsPlaying && fb.PlaybackLength > 0) {
						this.drag = true;
						x -= this.x;
						this.pos = x < 0 ? 0 : x > this.w ? 1 : x / this.w;
						fb_playback_time = fb.PlaybackLength * this.pos;
						fb.PlaybackTime = fb_playback_time < fb.PlaybackLength ? fb_playback_time : fb.PlaybackLength;
						this.repaint();
					};
				};
				break;
			case "up":
				this.drag = false;
				break;
			default:
				break;
		};
	};
};



////////////////////////////////////////////////////////////////// global variables
var panel_name = "Status bar";
var ww, wh;
var mouse_x, mouse_y;
var slider_bg_color, slider_active_color, slider_hover_color;
var slider_height = window.GetProperty("custom.Slider Height", 4);
var bg_color, txt_color;
var time_font = gdi.Font("Consolas", 13, 1);
var dt_cc = DT_VCENTER | DT_CENTER | DT_CALCRECT | DT_NOPREFIX;
var sk, vol;
var buttons = [];
var images = {};
var shuffle_type = window.GetProperty("system.Shuffle Type", 4);
var muted = false;
var colorScheme = "light";

//////////////////// main process
sk = new oSeekBar();
vol = new oVolume();
get_colors();
create_button_images();
set_buttons();

window.SetInterval(function() {
	if (!fb.IsPlaying || fb.IsPaused || fb.PlaybackLength <= 0 || sk.drag || !sk.visible) {return;}
	window.RepaintRect(0, 0, buttons[0].x, wh);
}, 1000);

///////////////////////////////////////////////////////////////// callback functions
function on_size() {

	window.MinHeight = window.MaxHeight = 22;
	if (!window.Width || !window.Height) {return;};
	ww = window.Width;
	wh = window.Height;

	var sliderY = Math.floor(wh / 2 - slider_height / 2);
	var volW = 120;
	var volX = Math.max(ww - volW - 35, 215);
	var textW = 70;
	var gap = 80;
	vol.setSize(volX, sliderY, volW, slider_height); 
	if (ww > 450) {
		sk.visible = true;
		sk.setSize(textW, sliderY, volX - textW * 2 - gap, slider_height);
	} else {
		sk.visible = false;
	};

	// set buttons position
	var w = images.repeatOff[0].Width;
	var y = Math.floor(wh / 2 - w / 2) - 1;
	var p = 9;
	var x = vol.x - gap + 2;
	buttons[0].setPos(x, y);
	buttons[1].setPos(x + w + p, y);
	buttons[2].setPos(vol.x + 125, y);
};

function on_paint(gr) {
	var textW = 60;
	var time1, time2;
	// draw bg
	gr.FillSolidRect(0, 0, ww, wh, bg_color);
	//
	sk.draw(gr);
	vol.draw(gr);
	// draw seekbar text
	if (fb.IsPlaying && fb.PlaybackTime) {
		time1 = fb.TitleFormat("%playback_time%").Eval();
		time2 = fb.TitleFormat("%length%").Eval();
	} else {
		time1 = "0:00";
		time2 = "0:00";
	};

	if (sk.visible) {
		gr.GdiDrawText(time1, time_font, txt_color, sk.x - textW, 0, textW, wh, dt_cc);
		gr.GdiDrawText(time2, time_font, txt_color, sk.x + sk.w, 0, textW, wh, dt_cc);
	} else {
		gr.GdiDrawText(time1 + " / " + time2, time_font, txt_color, 0, 0, textW * 2, wh, dt_cc);
	};

	// draw buttons
	for (var i = 0; i < buttons.length; i++) {
		buttons[i].draw(gr);
	};
	
};

function on_mouse_move(x, y, mask) {
	// vol & sk
	sk.onMouse("move", x, y);
	vol.onMouse("move", x, y);
	// buttons
	for (var i = 0; i < buttons.length; i++) {
		buttons[i].checkState("move", x, y);
	};

	mouse_x = x;
	mouse_y = y;
};

function on_mouse_lbtn_down(x, y, mask) {
	window.NotifyOthers("another_panel_is_clicked", panel_name);
	// vol & sk
	sk.onMouse("down", x, y);
	vol.onMouse("down", x, y);
	// buttons
	for (var i = 0; i < buttons.length; i++) {
		buttons[i].checkState("down", x, y);
	};
}

function on_mouse_lbtn_up(x, y, mask) {
	// sk & vol
	sk.onMouse("up", x, y);
	vol.onMouse("up", x, y);
	// buttons
	for (var i = 0; i < buttons.length; i++) {
		if (buttons[i].checkState("up", x, y) == ButtonStates.hover) {
			buttons[i].onClick();
		};
	};
};

function on_mouse_rbtn_up(x, y, mask) {
	set_popup_menu(x, y);
	return true;
};

function on_mouse_wheel(delta) {
	// vol
	vol.onMouse("wheel", mouse_x, mouse_y, delta);
};

function on_mouse_leave() {
	// buttons
	for (var i = 0; i < buttons.length; i++) {
		buttons[i].checkState("leave", 0, 0);
	};
};

function on_volume_change(val) {
	var img, muted_;
	vol.repaint();
	// repaint vol button
	muted_ = (fb.Volume == -100);
	if (muted_ != muted) {
		img = muted_ ? images.muted : images.mute;
		buttons[2].update(img);
		buttons[2].repaint();
	};
	muted = muted_;
};

/////////////////////////// playback callback
function on_playback_stop(reason) {
	if (reason != 2) {
		sk.repaint();
	};
};

function on_playback_pause(state) {
};

function on_playback_starting() {
	sk.repaint();
};

function on_playback_order_changed(new_order) {
	refresh_pbo_button();
};


/////////////////////////////////////////////////////////// functions
function get_colors() {
//	bg_color = utils.GetSysColor(15);
//	bg_color = RGB(38, 38, 38);
	bg_color = RGB(247, 247, 247);
	if (colorScheme == "light") {
		txt_color = RGB(88, 88, 88);
		slider_bg_color = RGBA(0, 0, 0, 20);
		slider_active_color = RGBA(0, 0, 0, 100);
	};
};

function pos2vol(pos) {
	return (50 * Math.log(0.99 * pos + 0.01) / Math.LN10);
}

function vol2pos(v) {
	return ((Math.pow(10, v / 50) - 0.01) / 0.99);
}

function create_button_images() {
	var fontGuifx = gdi.Font("Guifx v2 Transports", 18, 0);
	var w = 24;
	var normal_color, hover_color, down_color, color;
	var s, img_arr, img;
	var sf_cc = StringFormat(1, 1);

	// repeat off
	normal_color = RGB(150, 150, 150);
	hover_color = RGB(120, 120, 120);
	down_color = RGB(100, 100, 100);

	img_arr = [];
	for (s = 0; s < 3; s++) {
		color = normal_color;
		if (s == 1) { 
			color = hover_color;
		} else if (s == 2) {
			color = down_color;
		};

		img = gdi.CreateImage(w, w);
		g = img.GetGraphics();
		g.SetTextRenderingHint(5);

		g.FillSolidRect(0, 0, w, w, bg_color);
		g.DrawString("*", fontGuifx, color, 0, 0, w, w, sf_cc);

		img.ReleaseGraphics(g);
		img_arr[s] = img;
	};
	images.repeatOff = img_arr;

	// repeat playlist
	normal_color = RGB(35, 135, 255);
	hover_color = RGB(15, 100, 255);
	down_color = RGB(0, 80, 180);
	img_arr = [];

	for (s = 0; s < 3; s++) {
		color = normal_color;
		if (s == 1) { 
			color = hover_color;
		} else if (s == 2) {
			color = down_color;
		};

		img = gdi.CreateImage(w, w);
		g = img.GetGraphics();
		g.SetTextRenderingHint(5);

		g.FillSolidRect(0, 0, w, w, bg_color);
		g.DrawString("*", fontGuifx, color, 0, 0, w, w, sf_cc);

		img.ReleaseGraphics(g);
		img_arr[s] = img;
	};
	images.repeatPlaylist = img_arr;

	// repeat track
	img_arr = [];

	for (s = 0; s < 3; s++) {
		color = normal_color;
		if (s == 1) { 
			color = hover_color;
		} else if (s == 2) {
			color = down_color;
		};

		img = gdi.CreateImage(w, w);
		g = img.GetGraphics();
		g.SetTextRenderingHint(5);

		g.FillSolidRect(0, 0, w, w, bg_color);
		g.DrawString("(", fontGuifx, color, 0, 0, w, w, sf_cc);

		img.ReleaseGraphics(g);
		img_arr[s] = img;
	};
	images.repeatTrack = img_arr;

	// shuffle off
	normal_color = RGB(150, 150, 150);
	hover_color = RGB(120, 120, 120);
	down_color = RGB(100, 100, 100);

	img_arr = [];

	for (s = 0; s < 3; s++) {
		color = normal_color;
		if (s == 1) { 
			color = hover_color;
		} else if (s == 2) {
			color = down_color;
		};

		img = gdi.CreateImage(w, w);
		g = img.GetGraphics();
		g.SetTextRenderingHint(5);

		g.FillSolidRect(0, 0, w, w, bg_color);
		g.DrawString("&", fontGuifx, color, 0, 0, w, w, sf_cc);

		img.ReleaseGraphics(g);
		img_arr[s] = img;
	};
	images.shuffleOff = img_arr;

	// shuffle on
	normal_color = RGB(35, 135, 255);
	hover_color = RGB(15, 100, 255);
	down_color = RGB(0, 80, 180);

	img_arr = [];

	for (s = 0; s < 3; s++) {
		color = normal_color;
		if (s == 1) { 
			color = hover_color;
		} else if (s == 2) {
			color = down_color;
		};

		img = gdi.CreateImage(w, w);
		g = img.GetGraphics();
		g.SetTextRenderingHint(5);

		g.FillSolidRect(0, 0, w, w, bg_color);
		g.DrawString("&", fontGuifx, color, 0, 0, w, w, sf_cc);

		img.ReleaseGraphics(g);
		img_arr[s] = img;
	};
	images.shuffleOn = img_arr;

	// mute
	normal_color = RGB(150, 150, 150);
	hover_color = RGB(120, 120, 120);
	down_color = RGB(100, 100, 100);

	img_arr = [];

	for (s = 0; s < 3; s++) {
		color = normal_color;
		if (s == 1) { 
			color = hover_color;
		} else if (s == 2) {
			color = down_color;
		};

		img = gdi.CreateImage(w, w);
		g = img.GetGraphics();
		g.SetTextRenderingHint(5);

		g.FillSolidRect(0, 0, w, w, bg_color);
		g.DrawString("$", fontGuifx, color, 0, 0, w, w, sf_cc);

		img.ReleaseGraphics(g);
		img_arr[s] = img;
	};
	images.mute = img_arr;


	// muted
	normal_color = RGB(200, 200, 200);
	hover_color = RGB(180, 180, 180);
	down_color = RGB(150, 150, 150);
	img_arr = [];

	for (s = 0; s < 3; s++) {
		color = normal_color;
		if (s == 1) { 
			color = hover_color;
		} else if (s == 2) {
			color = down_color;
		};

		img = gdi.CreateImage(w, w);
		g = img.GetGraphics();
		g.SetTextRenderingHint(5);

		g.FillSolidRect(0, 0, w, w, bg_color);
		g.DrawString("@", fontGuifx, color, 0, 0, w, w, sf_cc);

		img.ReleaseGraphics(g);
		img_arr[s] = img;
	};
	images.muted = img_arr;

};

function set_buttons() {
	buttons[0] = new oButton(images.repeatOff, 0, 0, function() {
		if (fb.PlaybackOrder == 0 || fb.PlaybackOrder > 2) {
			fb.PlaybackOrder = 1;
		} else if (fb.PlaybackOrder == 1) {
			fb.PlaybackOrder = 2;
		} else if (fb.PlaybackOrder == 2) {
			fb.PlaybackOrder =  0;
		};
	});
	buttons[1] = new oButton(images.shuffleOff, 0, 0, function() {
		// check shuffle type
		if (shuffle_type < 3 || shuffle_type > 5) {
			shuffle_type = 4;
			window.SetProperty("system.Shuffle Type", shuffle_type);
		};
		fb.PlaybackOrder = (fb.PlaybackOrder >= 3) ? 0 : shuffle_type;
	});
	buttons[2] = new oButton((fb.Volume == -100) ? images.muted : images.mute, 0, 0, function() {
		fb.VolumeMute();
	});

	refresh_pbo_button();
};

function refresh_pbo_button() {
	var pbo = fb.PlaybackOrder;

	buttons[0].img = images.repeatOff;
	buttons[1].img = images.shuffleOff;
	
	if (pbo == 1) {
		buttons[0].update(images.repeatPlaylist);
	} else if (pbo == 2) {
		buttons[0].update(images.repeatTrack);
	} else if (pbo > 2) {
		buttons[1].update(images.shuffleOn);
	};

	buttons[0].repaint();
	buttons[1].repaint();
};

function set_popup_menu(x, y) {
	var VK_SHIFT = 0x10;
	var _menu = window.CreatePopupMenu();
	var _st = window.CreatePopupMenu();
	var id;

	_menu.AppendMenuItem(MF_STRING, 1, "Console");
	_menu.AppendMenuItem(MF_STRING, 2, "Preferences....");
	if (utils.IsKeyPressed(VK_SHIFT)) {
		_menu.AppendMenuItem(MF_STRING, 10, "Configure...");
		_menu.AppendMenuItem(MF_STRING, 11, "Properties...");
		_menu.AppendMenuItem(MF_STRING, 12, "Restart");
	};
	_menu.AppendMenuSeparator();
	_st.AppendMenuItem(MF_STRING, 20, "Random");
	_st.AppendMenuItem(MF_STRING, 21, "Shuffle(tracks)");
	_st.AppendMenuItem(MF_STRING, 22, "Shuffle(albums)");
	_st.AppendMenuItem(MF_STRING, 23, "Shuffle(folders)");
	_st.AppendTo(_menu, MF_STRING, "Shuffle type");
	_st.CheckMenuRadioItem(20, 23, shuffle_type + 17);

	id = _menu.TrackPopupMenu(x, y);
	switch(id) {
		case 1:
			fb.ShowConsole();
			break;
		case 2:
			fb.ShowPreferences();
			break;
		case 10:
			window.ShowConfigure();
			break;
		case 11:
			window.ShowProperties();
			break;
		case 12:
			fb.RunMainMenuCommand("File/Restart");
			break;
	};
	// shuflle type
	if (id <= 23 && id >= 20) {
		shuffle_type = id - 17;
		window.SetProperty("system.Shuffle Type", shuffle_type);
	};

	_st.Dispose();
	_menu.Dispose();
	return true;
};

	