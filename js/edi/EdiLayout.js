function EdiLayout(layout, name, parent) {
	var colw = new Array();
	var rowh = new Array();
	var mincolw = new Array();
	var minrowh = new Array();
	var colflags = new Array();
	var rowflags = new Array();	
	var vborders = new Array();
	var hborders = new Array();
	var log = parent.log;
	
	var that = {};
	
	that.openpanels = new Array();
	
	var EdiBorder = function(el) {
		var that = {};
		that.el = el;
		that.vfirst = false;
		that.vlast = false;
		that.hfirst = false;
		that.hlast = false;
		that.top = false;
		that.right = false;
		that.bottom = false;
		that.left = false;
		//that.irregular = false;
		return that;
	};

	that.sizeLayout = function() {
		var maxcols = 0;
		for (var i = 0; i < layout.length; i++) {
			rowh[i] = 0;
			minrowh[i] = 0;
			if (layout[i].length > maxcols) maxcols = layout[i].length;
		}

		for (var j = 0; j < maxcols; j++) {
			colw[j] = 0;
			mincolw[j] = 0;
		}
		log.log("Edi", 0, "maxcols = " + maxcols);
		
		// Step 1: Find out the normal width/height for each column and row and the minimum width/height
		for (var i = 0; i < layout.length; i++) {
			for (var j = 0; j < layout[i].length; j++) {
				if (typeof(layout[i][j]) != "object") continue;
				layout[i][j].row = i;
				layout[i][j].column = j;
				if (rowh[i] < layout[i][j].height) rowh[i] = layout[i][j].height;
				if (minrowh[i] < layout[i][j].minheight) minrowh[i] = layout[i][j].minheight;
				if (colw[j] < layout[i][j].width) colw[j] = layout[i][j].width;
				if (mincolw[j] < layout[i][j].minwidth) mincolw[j] = layout[i][j].minwidth;
			}
		}
		
		// Step 2: Get how large our current layout is
		var ediwidth = 0;
		var ediheight = 0;
		log.log("Edi", 0, "Heights: ", false);
		for (var i = 0; i < layout.length; i++) {
			ediheight += rowh[i];
			log.log("Edi", 0, rowh[i] + " ", false);
		}
		log.flush("Edi");
		log.log("Edi", 0, "Widths: ", false);
		for (var j = 0; j < maxcols; j++) {
			ediwidth += colw[j];
			log.log("Edi", 0, colw[j] + " ", false);
		}
		log.flush("Edi");
		
		log.log("Edi", 0, "Size: " + ediwidth + " " + ediheight);
		log.log("Edi", 0, "Screen: " + window.innerWidth + " " + window.innerHeight);
		// Step 3: Shrink or expand panels to fit screen
		var xbudget = window.innerWidth - ediwidth;
		var ybudget = window.innerHeight - ediheight;

		log.log("Edi", 0, "Budgets: " + xbudget + " " + ybudget);
		
		// Find out which columns and rows are slackable or maxable
		for (var i = 0; i < layout.length; i++) rowflags[i] = "slack";
		for (var j = 0; j < maxcols; j++) colflags[j] = "slack";
		for (var i = 0; i < layout.length; i++) {
			for (var j = 0; j < layout[i].length; j++) {
				if (typeof(layout[i][j]) != "object") continue;
				// Fixed always takes precedence
				if ((rowflags[i] == "fixed") || (layout[i][j].ytype == "fixed")) {
					rowflags[i] = "fixed";
				}
				// max is second in command
				else if ((rowflags[i] == "max") || (layout[i][j].ytype == "max")) {
					rowflags[i] = "max";
				}
				// if we have a fit column, do not use slack space
				else if ((rowflags[i] == "fit") || (layout[i][j].ytype == "fit")) {
					rowflags[i] = "fit";
				}
				// slack is the default flag as a last resort

				if ((colflags[j] == "fixed") || (layout[i][j].xtype == "fixed")) {
					colflags[j] = "fixed";
				}
				else if ((colflags[j] == "max") || (layout[i][j].xtype == "max")) {
					colflags[j] = "max";
				}
				else if ((colflags[j] == "fit") || (layout[i][j].xtype == "fit")) {
					colflags[j] = "fit";
				}
			}
		}
		
		log.log("Edi", 0, "** COLUMN SIZING **");
		colw = that.getGridSize(colw, mincolw, colflags, xbudget, parent.themeobj.borderwidth);
		log.log("Edi", 0, "** ROW SIZING **");
		rowh = that.getGridSize(rowh, minrowh, rowflags, ybudget, parent.themeobj.borderheight);

		for (var i = 0; i < layout.length; i++) {
			for (var j = 0; j < layout[i].length; j++) {
				if (typeof(layout[i][j]) != "object") continue;
				var k = j + 1;
				layout[i][j].colspan = 1;
				layout[i][j].rowspan = 1;
				while ((k < maxcols) && !layout[i][k]) {
					layout[i][j].colspan++;
					layout[i][k] = true;
					k++;		
				}
				if (layout[i][j].rowspannable) {
					k = i + 1;
					while ((k < layout.length) && !layout[k][j]) {
						layout[i][j].rowspan++;
						layout[k][j] = "rowspan";
						k++;
					}
				}
			}
		}
	};
	
	that.drawGrid = function(element) {
		for (var i = 0; i < layout.length; i++) {
			vborders[i] = new Array();
			hborders[i] = new Array();
			//cborders[i] = new Array();
		}
		var runningy = 0;
		for (var i = 0; i < layout.length; i++) {
			var runningx = 0;
			var borderheight = parent.themeobj.borderheight;
			for (var j = 0; j < layout[i].length; j++) {
				if (!layout[i][j]) continue;
				if (layout[i][j] === "rowspan") {
					var cellwidth = (layout[i - 1][j].colspan - 1) * parent.themeobj.borderwidth;
					for (var k = j; k <= (j + layout[i - 1][j].colspan - 1); k++) {
						cellwidth += colw[k];
					}
					runningx += cellwidth + parent.themeobj.borderwidth;
				}
				if (typeof(layout[i][j]) != "object") continue;
				
				var usevborder = false;
				var usehborder = false;
				var borderwidth = parent.themeobj.borderwidth;
				var cirregular = (layout[i][j].colspan > 1) || (layout[i][j].colspan > 1) ? true : false;
				if ((j + layout[i][j].colspan) < colflags.length) usevborder = true;
				if ((i + layout[i][j].rowspan) < layout.length) usehborder = true;
				if (panels[layout[i][j].intitle].noborder) {
					//usevborder = false;
					usehborder = false;
					//borderwidth = Math.floor(borderwidth / 2);
					borderheight = Math.floor(borderheight / 2);
					rowh[rowh.length - 1] += borderheight;
				}
				
				var cellwidth = (layout[i][j].colspan - 1) * parent.themeobj.borderwidth;
				for (var k = j; k <= (j + layout[i][j].colspan - 1); k++) cellwidth += colw[k];
				var cellheight = (layout[i][j].rowspan - 1) * parent.themeobj.borderheight;
				for (var k = i; k <= (i + layout[i][j].rowspan - 1); k++) cellheight += rowh[k];
				
				var dispwidth = (typeof(layout[i][j].initSizeX) == "function") ? layout[i][j].initSizeX(cellwidth, colw[j]) : cellwidth;
				var dispheight = (typeof(layout[i][j].initSizeY) == "function") ? layout[i][j].initSizeY(cellheight, rowh[i]) : cellheight;
				if ((dispwidth != cellwidth) || (dispheight != cellheight)) cirregular = true;

				var vborder = svg.make();
				vborder.setAttribute("style", "position: absolute; top: " + runningy + "px; left: " + (runningx + dispwidth) + "px; width: " + parent.themeobj.borderwidth + "px; height: " + dispheight + "px;");
				vborders[i][j] = new EdiBorder(vborder);
				vborders[i][j].vfirst = (i == 0) ? true : false;
				vborders[i][j].vlast = ((i + (layout[i][j].rowspan - 1)) >= (rowflags.length - 1)) ? true : false;
				//vborders[i][j].irregular = ((typeof(cborders[i - 1]) != "undefined") && (typeof(cborders[i - 1][j]) == "object")) ? cborders[i - 1][j].irregular : true;
				if (usevborder) {
					parent.themeobj.borderVertical(vborders[i][j]);
					element.appendChild(vborders[i][j].el);
				}
				
				var hborder = svg.make();
				hborder.setAttribute("style", "position: absolute; top: " + (runningy + dispheight) + "px; left: " + runningx + "px; width: " + dispwidth + "px; height: " + parent.themeobj.borderheight + "px;");
				hborders[i][j] = new EdiBorder(hborder);
				hborders[i][j].hfirst = (j == 0) ? true : false;
				hborders[i][j].hlast = (j >= (layout[i].length - 1)) ? true : false;
				// IF TURNING CORNER BORDERS BACK ON: hborders are not insulated against irregularities
				if (usehborder) {
					parent.themeobj.borderHorizontal(hborders[i][j]);
					element.appendChild(hborders[i][j].el);
					
					//if (hborders[i][j].hlast && (typeof(cborders[i][j - 1]) == "object")) {
					//	cborders[i][j - 1].right = true;
					//}
				}
				
				/*if (usevborder && usehborder) {
					var cborder = svg.make();
					cborder.setAttribute("style", "position: absolute; top: " + (runningy + dispheight) + "px; left: " + (runningx + dispwidth) + "px; width: " + parent.themeobj.borderheight + "px; height: " + parent.themeobj.borderwidth + "px;");
					cborders[i][j] = new EdiBorder(cborder);
					cborders[i][j].top = true;
					cborders[i][j].left = true;
					cborders[i][j].irregular = cirregular;
					//if (parent.layoutname == "default") {
					//	cborders[i][j].top = (vborders[i][j].vlast != true) ? true : false;
					//	cborders[i][j].right = (j == (colflags.length - 2)) ? true : false;
					//	cborders[i][j].bottom = (i == (rowflags.length - 2)) ? true : false;
					//}
					//parent.themeobj.borderDefs(cborders[i][j].el);
					cborders[i][j].el.setAttribute("id", "cborder" + i + "_" + j);
					element.appendChild(cborders[i][j].el);
				}*/
				
				var panelel = document.createElement("div");
				panelel.row = i;
				panelel.column = j;
				panelel.setAttribute("style", "position: absolute; top: " + runningy + "px; left:" + runningx + "px; width: " + dispwidth + "px; height: " + dispheight + "px;");
				that.openpanels[layout[i][j].intitle] = layout[i][j].constructor(parent, panelel);
				var panelcl = layout[i][j].title;
				panelcl = panelcl.replace(" ", "_");
				panelel.setAttribute("class", "EdiPanel Panel_" + panelcl);
				element.appendChild(panelel);
				that.openpanels[layout[i][j].intitle].init();
				
				runningx += cellwidth + borderwidth;
			}
		runningy += rowh[i] + borderheight;
		}
		
		for (i = 0; i < layout.length; i++) {
			for (j = 0; j < layout[i].length; j++) {
				if (typeof(layout[i][j]) != "object") continue;
				if (that.openpanels[layout[i][j].intitle].onLoad) that.openpanels[layout[i][j].intitle].onLoad();
			}
		}
		
		/*for (var i = 0; i < (layout.length - 1); i++) {
			for (var j = 0; j < (layout[i].length - 1); j++) {
				if (typeof(cborders[i][j]) != "object") continue;
				parent.themeobj.borderCorner(cborders[i][j]);
			}
		}*/
	};
	
	that.getGridSize = function(sizes, minsizes, flags, budget, bordersize) {
		budget -= bordersize * (sizes.length - 1);
	
		// Find out how many max/slack cells we have
		var nummax = 0;
		var numslack = 0;
		log.log("Edi", 0, "Cell flags: ", false);
		for (var j = 0; j < flags.length; j++) {
			log.log("Edi", 0, flags[j] + " ", false);
			if (flags[j] == "max") nummax++;
			else if (flags[j] == "slack") numslack++;
		}
		log.flush("Edi");

		// If we've got width to spare, let's maximize any cells
		if ((budget > 0) && (nummax > 0)) {
			var addwidth = Math.floor(budget / nummax);
			var spare = budget - addwidth;		// catch rounding errors!
			log.log("Edi", 0, "Maximizing " + nummax + " cells.");
			for (var j = 0; j < flags.length; j++) {
				if (flags[j] == "max") {
					sizes[j] += addwidth + spare;
					budget -= addwidth - spare;
					log.log("Edi", 0, "Cell " + j + ", added " + (addwidth + spare) + ".");
					spare = 0;
				}
			}
		}
		// Shrink or expand slack space if available
		if ((budget != 0) && (numslack > 0)) {
			var addwidth = Math.floor(budget / numslack);
			var spare = budget - addwidth;
			log.log("Edi", 0, "Shrinking/expanding slack space.  Addwidth: " + addwidth + " / spare: " + spare);
			for (var j = 0; j < flags.length; j++) {
				if (flags[j] == "slack") {
					log.log("Edi", 0, "Slack cell " + j + ".  minsize: " + minsizes[j] + " / size: " + sizes[j] + " / budget: " + budget + " / addwidth: " + addwidth + " / spare: " + spare);
					if ((sizes[j] + addwidth + spare) < minsizes[j]) {
						log.log("Edi", 0, "Slack not enough on " + j + ".  Shrinking to min. " + (sizes[j] - minsizes[j]));
						budget -= (sizes[j] - minsizes[j]);
						sizes[j] = minsizes[j];
					}
					else {
						log.log("Edi", 0, "Slack used.");
						sizes[j] += (addwidth + spare);
						budget -= (addwidth + spare);
						spare = 0;
					}
				}
			}
		}
		log.log("Edi", 0, "Budget after max and slack: " + budget);
		// Shrink all columns.
		if (budget < 0) {
			// Add up the minimum attainable width
			var minwidthtotal = 0;
			for (var j = 0; j < minsizes.length; j++) minwidthtotal += minsizes[j];
			log.log("Edi", 0, "Need to shrink cells.  Minimum width total: " + minwidthtotal);
			// If minimum width is <= available width, we can shrink some of our columns without doing any sacrifices.
			if (minwidthtotal <= window.innerWidth) {
				var shrinkable = 1;
				var lastshrink = window.innerWidth;
				while ((budget < 0) && (shrinkable > 0)) {
					var largestmin = 0;
					shrinkable = 0;
					for (var j = 0; j < sizes.length; j++) {
						if ((sizes[j] > minsizes[j]) && (lastshrink > minsizes[j])) {
							largestmin = minsizes[j];
							lastshrink = minsizes[j];
						}
					}
					log.log("Edi", 0, "Shrink loop: budget: " + budget + " / largestmin: " + largestmin + " / lastshrink: " + lastshrink);
					var gain = 0;
					for (var j = 0; j < sizes.length; j++) {
						if ((sizes[j] > minsizes[j]) && (minsizes[j] <= largestmin)) {
							shrinkable++;
							gain += (sizes[j] - largestmin);
						}
					}
					if (gain > Math.abs(budget)) gain = Math.abs(budget);
					log.log("Edi", 0, "Shrink loop: shrinkable: " + shrinkable + " / gain: " + gain);
					if (shrinkable > 0) {
						var shrinkeach = Math.floor(gain / shrinkable);
						var spare = gain - (shrinkeach * shrinkable);
						log.log("Edi", 0, "Shrink loop: shrinkeach = " + shrinkeach + " / spare: " + spare);
						for (var j = 0; j < sizes.length; j++) {
							if ((sizes[j] > minsizes[j]) && (minsizes[j] <= largestmin)) {
								sizes[j] -= shrinkeach - spare;
								spare = 0;
								budget += shrinkeach + spare;
								log.log("Edi", 0, "Shrinking cell " + j + " to " + sizes[j] + " / budget: " + budget);
							}
						}
					}
				}
			}
			
			if (budget < 0) {
				// Find out how much other space can be squeezed evenly out of the other columns
				var shrinkable = 0;
				for (var j = 0; j < sizes.length; j++) {
					if (flags[j] != "fixed") shrinkable++;
				}
				var subwidth = Math.floor(Math.abs(budget) / shrinkable);
				var spare = Math.abs(budget) - (subwidth * shrinkable);
				log.log("Edi", 0, "Final shrink subwidth and spare: " + subwidth + "  " + spare);
				for (var j = 0; j < sizes.length; j++) {
					if (flags[j] != "fixed") {
						sizes[j] -= subwidth - spare;
						budget += subwidth + spare;
						spare = 0;
					}
				}
			}
		}
		
		log.log("Edi", 0, "Final budget: " + budget);
		return sizes;
	};
	
	return that;
}