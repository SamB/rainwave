<?php

require("jsmin.php");
require("cssmin.php");

function getBuildNumber($suffix = "") {
	$bnum = file_get_contents("buildnum" . $suffix);
	str_replace("\n", "", $bnum);
	return intval($bnum);
}

function bumpBuildNumber($suffix = "") {
	$bnum = getBuildNumber() + 1;
	$d = fopen("buildnum" . $suffix, 'w') or die("Can't open buildnum file to write.");
	fwrite($d, $bnum);
	fclose($d);
}

function removeOldBuild($dest) {
	print "Cleaning old build.\n";
	$dir = opendir($dest);
	while (false !== ($file = readdir($dir))) {
        if (is_dir($dest . $file) && preg_match("/^(lang|skins)_r\d*$/", $file)) {
			exec("rm -rf \"" . $dest . $file . "\"");
		}
		else if (preg_match("/^rainwave3_r\d*.js$/", $file)) {
			exec("rm -rf \"" . $dest . $file . "\"");
		}
    }
	closedir($dir);
}

function writeParsedFile($source, $dest, $bnum) {
	print "Building " . $dest . ".\n";
	$d = fopen($dest, 'w') or die("Can't open " . $dest);
	$s = fopen($source, "r") or die("Can't open " . $source);
	while (($buffer = fgets($s, 4096)) !== false) {
		$buffer = str_replace("<%BUILDNUM%>", $bnum, $buffer);
		fwrite($d, $buffer);
    }
	fclose($s);
	fclose($d);
}

function copyStatic($dest, $bnum) {
	print "Copying static files.\n";
	copyFile("root/tunein.php", "tunein.php", $dest);
	copyDirectory("auth", "auth", $dest);
	copyDirectory("images", "images", $dest);
}

function buildLanguages($dest, $bnum) {
	print "Building languages.\n";
	$dest2 = $dest . "lang_r" . $bnum;
	mkdir($dest2) or die("Can't make destination language directory.");
	$dir = opendir("lang");
	while (false !== ($file = readdir($dir))) {
        if (preg_match("/.js$/", $file)) {
			$d = fopen($dest2 . "/" . $file, 'w') or die("Can't open javascript destination.");
			fwrite($d, JSMin::minify(file_get_contents("lang/" . $file)));
			fclose($d);
		}
    }	
}

function buildSkins($dest, $bnum) {
	print "Building skins.\n";
	$dir = opendir("skins") or die ("Can't read skins.");
	$dest2 = $dest . "skins_r" . $bnum;
	mkdir($dest2) or die ("Can't make destination skins directory.");
	while (false !== ($skin = readdir($dir))) {
		if (($skin == ".") || ($skin == "..")) {
			# pass
		}
        else if (is_dir("skins/" . $skin)) {
			$skindir = opendir("skins/" . $skin) or die("Can't open " . $skin . " skin directory.");
			mkdir($dest2 . "/" . $skin) or die("Can't create " . $skin . " skin directory.");
			while (false !== ($file = readdir($skindir))) {
				if (($file == ".") || ($file == "..")) {
					# pass
				}
				else if (preg_match("/.js$/", $file)) {
					$d = fopen($dest2 . "/" . $skin . "/" . $file, 'w') or die("Can't open destination file.");
					fwrite($d, JSMin::minify(file_get_contents("skins/" . $skin . "/" . $file)));
					fclose($d);
				}
				else if (preg_match("/.css$/", $file)) {
					$d = fopen($dest2 . "/" . $skin . "/" . $file, 'w') or die("Can't open destination file.");
					fwrite($d, CssMin::minify(file_get_contents("skins/" . $skin . "/" . $file)));
					fclose($d);
				}
				else if (is_dir("skins/" . $skin . "/" . $file)) {
					copyDirectory("skins/" . $skin . "/" . $file, $dest2 . "/" . $skin . "/" . $file, "");
				}
				else {
					copyFile("skins/" . $skin . "/" . $file, $dest2 . "/" . $skin . "/" . $file, "");
				}
			}
		}
    }
}

function copyFile($source, $dest, $destdir) {
	if (!copy($source, $destdir . $dest)) {
		print "*** Could not copy file " . $source . " to " . $dest . ": exiting.\n";
		exit(0);
	}
}

function copyDirectory($source, $dest, $destdir) {
	$phpisdumb = array();
	unset($phpisdumb);
	$return = 1;
	if (file_exists($destdir . $dest)) {
		exec("rm -rf " . $destdir . $dest);
	}
	exec("cp -r " . $source . " " . $destdir . $dest, $phpisdumb, $return);
	if ($return != 0) {
		print "*** Could not copy directory " . $source . " to " . $dest . ": " . $return . ".\n";
		exit(0);
	}
}

function minifyJavascript($dest, $bnum) {
	$d = fopen($dest . "rainwave3_r" . $bnum . ".js", 'w') or die("Can't open javascript destination.");
	print "Minifying all JS.\n";
	for ($i = 0; $i < count($GLOBALS['jsorder']); $i++) {
		fwrite($d, JSMin::minify(file_get_contents($GLOBALS['jsorder'][$i])));
	}
	fclose($d);
}

function makeAPIDirectory($lyredir, $destdir) {
	print "Making API directory.\n";
	copyDirectory($lyredir . "docs", "api", $destdir);
	copyFile($lyredir . "javascript/lyre-ajax.js", "api/lyre-ajax.js", $destdir);
}

function crushPNG() {
	print "Crushing images.\n";
	$images = array();
	exec("find images skins -name *.png", $images);
	for ($i = 0; $i < count($images); $i++) {
		exec("optipng -q -o7 '" . $images[$i] . "'");
		exec("pngcrush -q -rem gAMA -rem cHRM -rem iCCP -rem sRGB -rem time '" . $images[$i] . "' /tmp/pngcrush.png");
		rename("/tmp/pngcrush.png", $images[$i]) or die("Could not move /tmp/pngcrush.png to " . $images[$i]);
	}
}

?>