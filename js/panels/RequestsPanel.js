panels.RequestsPanel = {
	ytype: "slack",
	height: svg.em * 2,
	minheight: svg.em * 2,
	xtype: "fit",
	width: svg.em * 20,
	minwidth: svg.em * 8,
	title: "Requests",
	intitle: "RequestsPanel",
	
	constructor: function(edi, container) {
		var that = {};
		var list = RequestList(true);
		var line = AllRequestList();
		var pos = 0;
		var num = 0;
		var total = 0;
		var technicalhint = false;
		
		that.container = container;
		
		that.init = function() {
			container.style.overflow = "scroll";
			container.appendChild(line.el);
			container.appendChild(list.el);
			
			ajax.addCallback(that, list.update, "requests_user");
			ajax.addCallback(that, line.update, "requests_all");
			user.addCallback(that, that.updatePos, "radio_requestposition");
			ajax.addCallback(that, that.updateNum, "requests_user");
			ajax.addCallback(that, that.updateTitle, "requests_user");
			
			initpiggyback['requests'] = "true";
			if (ajax.sync_time) {
				ajax.async_get("get_requests", {});
			}
			
			help.addStep("managingrequests", { "h": "managingrequests", "p": "managingrequests_p", "skipf": function() { edi.openPanelLink("RequestsPanel", false); } });
			if (edi.mpi) {
				help.addStep("timetorequest", { "h": "timetorequest", "p": "timetorequest_p", "pointel": [ edi.tabs.panels["RequestsPanel"].el ] });
			}
			help.addToTutorial("request", [ "managingrequests", "timetorequest" ]);
		};
		
		that.updatePos = function(newpos) {
			pos = newpos;
		};
		
		that.updateNum = function(json) {
			num = 0;
			total = 0;
			for (var i = 0; i < json.length; i++) {
				if (json[i].song_available) num++;
				total++;
			};
		};
		
		that.updateTitle = function(json) {
			if (edi.changeTitle) {
				var str = "";
				if (technicalhint) {
					var numstring = "";
					numstring += num;
					if (total != num) numstring += "/" + total;
					if (pos > 0) str = " (" + _lSuffixNumber(pos) + " " + _l("with") + " " + numstring + ")";
					else if ((num > 0) || (total > 0)) str = " (" + numstring + ")";
				}
				else {
					var str = "";
					if (total == 0) str = "";
					else if (user.p.radio_request_expiresat) str = " (" + _l("expiring") + ")";
					else if ((num == 0) & (total > 0)) str = " (" + _l("reqoncooldown") + ")";
					else if ((num == 0) && user.p.radio_request_position) str = " (" + _l("reqempty") + ")";
					else if (user.p.radio_request_position == 0) str = "";
					else if (user.p.radio_request_position > 10) str = " (" + _l("longwait") + ")";
					else if (user.p.radio_request_position > 6) str = " (" + _l("wait") + ")";
					else if (user.p.radio_request_position > 3) str = " (" + _l("shortwait") + ")";
					else str = " (" + _l("soon") + ")";
				}
				edi.changeTitle(panels.RequestsPanel.intitle, panels.RequestsPanel.title + str);
			}
		};
		
		that.p_technicalhint = function(techhint) {
			technicalhint = techhint;
			that.updateTitle({});
		}
		
		prefs.addPref("requests", { name: "technicalhint", defaultvalue: false, type: "checkbox", callback: that.p_technicalhint });
		
		return that;
	}
}

var AllRequestList = function() {
	var that = {};
	that.el = document.createElement("ol");
	that.el.setAttribute("class", "allrequestlist");
	var line = [];
	
	that.update = function(json) {
		var i = 0;
		var j = 0;
		var found = false;
		var newreq = false;
		for (i = 0; i < json.length; i++) {
			found = false;
			for (j = 0; j < line.length; j++) {
				if (json[i].request_id == line[j].p.request_id) {
					that.updateLi(line[j], json[i]);
					found = true;
				}
			}
			if (!found) {
				var newli = that.makeLi(json[i]);
				that.el.appendChild(newli.el);
				line.push(newli);
			}
		}
		
		for (j = 0; j < line.length; j++) {
			found = false;
			for (i = 0; i < json.length; i++) {
				if (json[i].request_id == line[j].p.request_id) found = true;
			}
			if (!found) {
				that.removeLi(line[j]);
				line.splice(j, 1);
			}
		}
	};
	
	that.makeLi = function(json) {
		var li = {};
		li.el = document.createElement("li");
		li.username = document.createElement("span");
		li.username.textContent = json.request_username;
		li.el.appendChild(li.username);
		that.updateLi(li, json);
		return li;
	};
	
	that.updateLi = function(li, json) {
		li.p = json;
		var expiry = 0;
		if ((json.request_expires_at > 0) && (json.request_tunedin_expiry > 0)) {
			expiry = json.request_expires_at < json.request_tunedin_expiry ? json.request_expires_at : json.request_tunedin_expiry;
		}
		else if (json.request_expires_at > 0) expiry = json.request_expires_at;
		else if (json.request_tunedin_expiry > 0) expiry = json.request_tunedin_expiry;
		if ((expiry > 0) && (!li.expires_on)) {
			li.expires_on = document.createElement("span");
			li.expires_on.setAttribute("class", "request_expires_on");
			if (expiry > clock.now) li.expires_on.textContent = " (expires in " + formatHumanTime(expiry - clock.now, true, true) + ")";
			else li.expires_on.textContent = " (expires next request fulfillment)";
			li.el.appendChild(li.expires_on);
		}
		else if ((expiry > 0) && (li.expires_on)) {
			if (expiry > clock.now) li.expires_on.textContent = " (expires in " + formatHumanTime(expiry - clock.now, true, true) + ")";
			else li.expires_on.textContent = " (expires next request fulfillment)";
		}
		else if (li.expires_on) {
			li.el.removeChild(li.expires_on);
			delete(li.expires_on);
		}
	};
	
	that.removeLi = function(li) {
		that.el.removeChild(li.el);
	};
	
	return that;
};

var RequestList = function(sortable) {
	var that = {};
	that.el = document.createElement("div");
	that.el.setAttribute("class", "requestlist");
	var maxy = 0;
	var mouseorigy = 0;
	var lastmousey = 0;
	var dragorigy = 0;
	var dragidx = 0;
	var dragging = false;
	var dragdestidx = -1;
	var reqs = [];
	var goingup = false;

	that.update = function(json) {
		that.stopDrag();
		var i = 0;
		var j = 0;
		var found = false;
		var newreq;
		for (i = 0; i < json.length; i++) {
			found = false;
			for (j = 0; j < reqs.length; j++) {
				if (json[i].requestq_id == reqs[j].p.requestq_id) {
					found = true;
					reqs[j].update(json[i]);
					if (reqs[j].fx_opacity.now != 1) reqs[j].fx_opacity.start(1);
				}
			}
			if (!found) {
				newreq = Request.make(json[i]);
				newreq.purge = false;
				newreq.fx_posY = fx.make(fx.CSSNumeric, [ newreq.el, 250, "marginTop", "px" ]);
				newreq.fx_posY.set(0);
				newreq.fx_opacity = fx.make(fx.CSSNumeric, [ newreq.el, 250, "opacity", "" ]);
				newreq.fx_opacity.set(0);
				if (sortable) {
					newreq.el.requestq_id = json[i].requestq_id;
					newreq.el.addEventListener('mousedown', that.startDrag, true);
				}
				reqs.push(newreq);
				that.el.appendChild(newreq.el);
				newreq.fx_opacity.start(1);
			}
		}
		
		maxy = 0;
		var reqid;
		for (j = 0; j < reqs.length; j++) {
			reqid = reqs[j].p.requestq_id;
			found = false;
			for (var i = 0; i < json.length; i++) {
				if (json[i].requestq_id == reqs[j].p.requestq_id) found = true;
			}
			if (!found) {
				reqs[j].destruct();
				reqs[j].purge = true;
				reqs[j].fx_opacity.start(0);
			}
			else if (j < (reqs.length - 1)) {
				maxy += reqs[j].el.offsetHeight + 3;
			}
		}
		
		reqs.sort(that.sortRequestArray);
		that.positionReqs();
		
		if (sortable && (reqs.length > 0)) {
			help.changeStepPointEl("managingrequests", [ reqs[reqs.length - 1].el ]);
		}
		else {	
			help.changeStepPointEl("managingrequests", [ ]);
		}
	};
	
	that.purgeRequests = function() {
		for (var i = 0; i < reqs.length; i++) {
			if (reqs[i].purge) {
				that.el.removeChild(reqs[i].el);
				reqs.splice(i, 1);	
			}
		}
	};
	
	that.positionReqs = function() {
		var runy = 0;
		var runz = reqs.length;
		for (var i = 0; i < reqs.length; i++) {
			if (!reqs[i].purge) {
				reqs[i].el.style.zIndex = runz;
				reqs[i].fx_posY.start(runy);
				runy += reqs[i].el.offsetHeight + 3;
				runz -= 1;
			}
		}
		that.el.style.height = runy + "px";
		setTimeout(that.purgeRequests, 250);
	};
	
	that.startDrag = function(e, id) {
		mouseorigy = getMousePosY(e);
		for (var i = 0; i < reqs.length; i++) {
			if (reqs[i].p.requestq_id == e.currentTarget.requestq_id) { dragidx = i; break; } 
		}
		reqs[dragidx].fx_opacity.start(0.6);
		dragorigy = reqs[dragidx].fx_posY.now;
		reqs[dragidx].el.style.zIndex = reqs.length + 1;
		document.getElementById("body").addEventListener("mousemove", that.runDrag, true);
		document.getElementById("body").addEventListener("mouseup", that.stopDrag, true);
		dragging = true;
	};
	
	that.runDrag = function(e) {
		var moved = 0;
		var desty = 0;
		goingup = false;
		var mousey;
		if (e) {
			mousey = getMousePosY(e);
			moved = mousey - mouseorigy;
			desty = dragorigy + moved;
			if (desty > maxy) return;
			if (desty < 0) return;
			if (mousey < lastmousey) goingup = true;
			lastmousey = mousey;
			reqs[dragidx].fx_posY.set(desty);
		}
		var runy = 0;
		// it might seem inefficient to trigger the posY fx every time, but if the fx.now == fx.end the fx won't run
		// so the overhead is 2 function calls per sortable.  not terrible, considering there's an upper limit of 12 sortables here.
		var newdragdestidx = -1;
		var detecty;
		if (desty < (reqs[0].el.offsetHeight / 2)) newdragdestidx = 0;
		else {
			for (var i = 0; i < reqs.length; i++) {
				if (i == dragidx) continue;
				if (goingup) {
					detecty = (reqs[i].fx_posY.now + (reqs[i].el.offsetHeight / 2));
					if (desty < detecty) {
						newdragdestidx = i;
						break;
					}
				}
				else {
					detecty = (reqs[i].fx_posY.now - (reqs[i].el.offsetHeight / 2))
					if (desty < detecty) {
						newdragdestidx = i;
						break;
					}
				}
			}
		}
		if (newdragdestidx == -1) newdragdestidx = reqs.length;
		if (newdragdestidx == dragdestidx) return;
		dragdestidx = newdragdestidx;
		var passed = false;
		for (var i = 0; i < reqs.length; i++) {
			if (i == dragidx) continue;
			if (!passed && (i >= dragdestidx)) {
				passed = true;
				runy += reqs[dragidx].el.offsetHeight + 3;	
			}
			reqs[i].fx_posY.start(runy);
			runy += reqs[i].el.offsetHeight + 3;
		}
		
	};
	
	that.stopDrag = function(e) {
		if (!dragging) return;
		document.getElementById("body").removeEventListener("mousemove", that.runDrag, true);
		document.getElementById("body").removeEventListener("mouseup", that.stopDrag, true);
		dragging = false;
		if (!goingup) dragdestidx--;
		if ((dragdestidx == dragidx) || (dragdestidx < 0)) {
			reqs[dragidx].fx_opacity.start(1);
			that.positionReqs();
			return;
		}
		reqs.splice(dragdestidx, 0, reqs.splice(dragidx, 1)[0]);
		var params = "";
		for (var i = 0; i < reqs.length; i++) {
			if (i > 0) params += ",";
			params += reqs[i].p.requestq_id;
		}
		ajax.async_get("request_order", { "order": params });
	};
	
	that.sortRequestArray = function(a, b) {
		if (a.p.song_available && !b.p.song_available) return -1;
		else if (!a.p.song_available && b.p.song_available) return 1;
		if (!a.p.song_available && !b.p.song_available) {
			if (a.p.song_releasetime < b.p.song_releasetime) return -1;
			else if (a.p.song_releasetime > b.p.song_releasetime) return 1;
		}
		if (a.p.requestq_order < b.p.requestq_order) return -1;
		else if (a.p.requestq_order > b.p.requestq_order) return 1;
		if (a.p.requestq_id < b.p.requestq_id) return -1;
		else if (a.p.requestq_id > b.p.requestq_id) return 1;
		return 0;
	};

	return that;
};

var Request = {
	linkify: function(song_id, el) {
		el.style.cursor = "pointer";
		el.addEventListener('click', function() { if (user.p.radio_tunedin) ajax.async_get("request", { "song_id": song_id }); else errorcontrol.doError(3002); }, true);
	},
	
	linkifyDelete: function(requestq_id, el) {
		el.style.cursor = "pointer";
		el.addEventListener('click', function(e) { ajax.async_get("request_delete", { "requestq_id": requestq_id }); }, true);
	},
	
	make: function(json) {
		var that = {};
		that.el = document.createElement("div");
		
		//theme.Extend.Request(that);
		//that.draw();
		
		that.songrating_svg = svg.make({ "width": theme.Rating_width, "height": svg.em * 1.4 });
		that.songrating_svg.setAttribute("class", "request_songrating");
		that.songrating = Rating({ category: "song", id: json.song_id, userrating: json.song_rating_user, x: 0, y: 1, siterating: json.song_rating_avg, favourite: json.song_favourite, register: true });
		that.songrating_svg.appendChild(that.songrating.el);
		that.el.appendChild(that.songrating_svg);
		
		that.song_title = document.createElement("div");
		that.song_title.setAttribute("class", "request_song_title");
		
		that.xbutton = document.createElement("span");
		that.xbutton.textContent = "X";
		that.xbutton.setAttribute("class", "request_xbutton");
		Request.linkifyDelete(json.requestq_id, that.xbutton);
		that.song_title.appendChild(that.xbutton);
		
		that.song_title_text = document.createElement("span");
		that.song_title_text.setAttribute("class", "request_song_title_text");
		that.song_title_text.textContent = json.song_title;
		Song.linkify(json.song_id, that.song_title_text);
		that.song_title.appendChild(that.song_title_text);
		
		that.el.appendChild(that.song_title);
		
		that.albumrating_svg = svg.make({ "width": theme.Rating_width, "height": svg.em * 1.4 });
		that.albumrating_svg.setAttribute("class", "request_albumrating");
		that.albumrating = Rating({ category: "album", id: json.album_id, userrating: json.album_rating_user, x: 0, y: 1, siterating: json.album_rating_avg, favourite: json.album_favourite, register: true });
		that.albumrating_svg.appendChild(that.albumrating.el);
		that.el.appendChild(that.albumrating_svg);
		
		that.album_name = document.createElement("div");
		that.album_name.setAttribute("class", "request_album_name");
		that.album_name_text = document.createElement("span");
		that.album_name_text.textContent = json.album_name;
		that.album_name.appendChild(that.album_name_text);
		Album.linkify(json.album_id, that.album_name_text);
		that.el.appendChild(that.album_name);
		
		that.update = function(json) {
			that.p = json;
			/*if (json.request_expires_at > 0) {
				that.expires_on = document.createElement("div");
				that.expires_on.setAttribute("class", "request_expires_on");
				that.expires_on.textContent = "Expires in " + formatHumanTime(json.request_expires_at - clock.now, true, true);
				that.el.appendChild(that.expires_on);
			}
			else if (that.expires_on) {
				that.el.removeChild(that.expires_on);
				delete(that.expires_on);
			}*/
			that.el.setAttribute("class", "request request_" + json.song_available);
			if ((json.song_available == false) && (!that.cooldown)) {
				that.cooldown = document.createElement("div");
				that.cooldown.setAttribute("class", "request_cooldown");
				that.cooldown.textContent = _l("oncooldown") + " " + formatHumanTime(json.song_releasetime - clock.now, true, true) + ".";
				that.el.appendChild(that.cooldown);
			}
			else if (json.song_available == false) {
				that.cooldown.textContent = _l("oncooldown") + " " + formatHumanTime(json.song_releasetime - clock.now, true, true) + ".";
			}
			else if (that.cooldown) {
				that.el.removeChild(that.cooldown);
				delete(that.cooldown);
			}
		};
		
		that.destruct = function() {
			that.songrating.destruct();
			that.albumrating.destruct();
		};
		
		that.update(json);
		
		return that;
	},
	
	sortRequests: function(a, b) {
		return 1;
	}
}