function Edi(container) {
	var layouts = new Array();
	var layoutname = "default";
	var themename = "RWClassic";
	var language = "en_CA";
	panels['false'] = false;
	
	var that = {};
	var oldurl = location.href;
	var urlhistory = [];
	
	that.initcallback = false;	
	that.themeobj = false;
	that.log = EdiLogger();
	
	that.urlChangeDetect = function() {
		if (oldurl != location.href) {
			var i = parseInt(location.href.substring(location.href.indexOf("#") + 1));
			if (urlhistory[i]) {
				that.openPanelLink(urlhistory[i].panel, urlhistory[i].link);
			}
			oldurl = location.href;
		}
	};
	
	that.openPanelLink = function(panel, link) {
		if (link.history) {
			delete(link.history);
			urlhistory.push({ "panel": panel, "link": link });
			if (location.href.indexOf("#") >= 0) oldurl = location.href.substring(0, location.href.indexOf("#")) + "#" + (urlhistory.length - 1);
			else oldurl = location.href + "#" + (urlhistory.length - 1);
			location.href = oldurl;
		}
		if (typeof(layouts[layoutname].openpanels[panel]) != "undefined") {
			layouts[layoutname].openpanels[panel].openLink(link);
			return;
		}
		for (i in layouts[layoutname].openpanels) {
			if (layouts[layoutname].openpanels[i].mpi) {
				if (layouts[layoutname].openpanels[i].openPanelLink(panel, link)) 
					return;
			}
		}
	};
	
	that.loadLayouts = function() {
		var c = prefs.loadCookie("edilayouts");
		for (var l in c) {
			if (c[l].length > 0) layouts[l] = new Array();
			for (var row = 0; row < c[l].length; row++) {
				layouts[l][row] = new Array();
				for (var p in c[l][row]) {
					if (panels[c[l][row][p]]) {
						that.log.log("Edi", 0, "Saved Layout '" + l + "' Row " + row + " Added Panel: " + p);
						layouts[i][row].push(panels[c][l][row][p]);
					}
				}
			}
		}
	};
	
	that.saveLayouts = function() {
		var c = new Array();
		for (var l in layouts) {
			if (layouts[l].length > 0) c[l] = new Array();
			for (var row = 0; row < layouts[l].length; row++) {
				c[l][row] = new Array();
				for (var p in layouts[l][row]) {
					c[l][row].push(p);
				}
			}
		}
		prefs.saveCookie("edilayouts", c);
	};
	
	// obtained from http://www.javascriptkit.com/javatutors/loadjavascriptcss.shtml
	that.loadExternalFile = function(filename, filetype, callback) {
		if (filetype == "js") { //if filename is a external JavaScript file
			var fileref = document.createElement('script');
			fileref.setAttribute("type","text/javascript");
			fileref.setAttribute("src", filename);
		}
		else if (filetype == "css") { //if filename is an external CSS file
			var fileref = document.createElement("link");
			fileref.setAttribute("rel", "stylesheet");
			fileref.setAttribute("type", "text/css");
			fileref.setAttribute("href", filename);
		}
		if (typeof(fileref) != "undefined") {
			if (callback) fileref.addEventListener('load', callback, false);
			document.getElementsByTagName("head")[0].appendChild(fileref);
			return true;
		}
		return false;
	};
	
	that.loadStage1 = function() {
		that.loadExternalFile("skins_r" + BUILDNUM + "/" + themename + "/" + themename + ".css", "css", false);
		that.loadExternalFile("skins_r" + BUILDNUM + "/" + themename + "/" + themename + ".js", "js", that.loadStage2);
	};
	
	that.loadStage2 = function() {
		if (typeof(EdiTheme) != "function") {
			themename = "RWClassic";
			loadStage1();
			return;
		}
		that.themeobj = EdiTheme();
		
		that.loadLayouts();
		layouts['default'] = EdiLayout([ [ panels.MenuPanel ], [ panels.TimelinePanel, panels.NowPanel ], [ false, panels.MainMPI ] ], "Default Layout", that);

		var svgdefs = svg.make( { style: "position: absolute;", "width": 0, "height": 0 } );
		var defs = svg.makeEl("defs");
		if (theme) theme = that.themeobj;
		that.themeobj.allDefs(svgdefs, defs);
		svgdefs.appendChild(defs);
		container.appendChild(svgdefs);
		
		layouts[layoutname].sizeLayout();
		layouts[layoutname].drawGrid(container);
		if (that.initcallback != false) {
			that.initcallback();
			that.initcallback = false;
		}
	};
	
	that.init = function() {
		prefs.addPref("edi", { name: "language", defaultvalue: "en_CA", type: "dropdown", options: [ { value: "en_CA", option: "English (Canada)" } ], refresh: true });
		prefs.addPref("edi", { hidden: true, name: "theme", defaultvalue: "RWClassic", type: "dropdown", options: [ { value: "RWClassic", option: "Rainwave 3" } ], refresh: true });
		
		var newthemename = prefs.p.edi.theme.value;
		if (newthemename) themename = newthemename;
		
		var newlang = prefs.p.edi.language.value;
		if (newlang) language = newlang;
		
		that.loadExternalFile("lang_r" + BUILDNUM + "/" + language + ".js", "js", that.loadStage1);
	}
	
	setInterval(that.urlChangeDetect, 200);
		
	return that;
}