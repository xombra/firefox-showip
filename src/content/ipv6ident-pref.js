/*
    ShowIP Firefox Extension
    Copyright (C) 2007 Jan Dittmer <jdi@l4x.org>

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program; if not, write to the Free Software
    Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
*/
var showipExtPrefs = {

Show: function() {
	// for the mozilla suite
	window.open("chrome://ipv6ident/content/ipv6ident-pref.xul", "ipv6prefs", "chrome,width=500,height=440,resizable");
},

_UpdRows: function() {
	var lb = document.getElementById("EntryList");
	lb.setAttribute("rows",lb.childNodes.length+1);
},

// clear complete listbox (from adblock)
_ClearList: function() {
	var lb = document.getElementById("EntryList");
	lb.parentNode.replaceChild(lb.cloneNode(false), lb);
	this._UpdRows();
},

// add a cell to a list row
_AddCell: function (li, label) {
	var cell = document.createElement('listcell');
	cell.setAttribute('label', label);
	li.appendChild(cell);
},

// add a row to the list
_AddEntry: function(isipv4, isipv6, ishost, title, url) {
	var lb = document.getElementById("EntryList");
	var li = document.createElement("listitem");
	this._AddCell(li, isipv4);
	this._AddCell(li, isipv6);
	this._AddCell(li, ishost);
	this._AddCell(li, title);
	this._AddCell(li, url);
	lb.appendChild(li);
	this._UpdRows();
},

// set the global vars used in preferences and in the main program
Init: function() {
	this.prefs = Components.classes["@mozilla.org/preferences-service;1"].
                getService(Components.interfaces.nsIPrefBranch);
	this.hiddentab = null;
	this.newtab = null;
	this.asyncresolve = true;
	this.remote = false;
	this.remote_host_default = 'https://dns.l4x.org/%s/ip.xml?sync';
	this.remote_host = this.remote_host_default;
	this.remote_immediate = false;
	this.resolve_immediate = true;
	this.showdomain = false;
	this.color = null;
	this.menuurls = null;
	this.ipv4style = 0; // 0:'d'ecimal, 1:'o'ctal, 2:'h'ex or 3:d'w'ord
//var ipv6_menus = null;
	this.cacheage = -1; // -1: infinite, 0: disable, else time in seconds
	this.forcesocks = false;
	this.debug = false;
	this.firstrun = 0;
	var urls = null;
	this.newservices = [];
	//"46H|l4x.org - Official ShowIP DNS Tools|http://dnstools.l4x.org/##?src=showip",
	this.defaulturls =[
	       "H|robtex.com - Host|http://www.robtex.com/dns/##.html",
	       "4|robtex.com - IP|http://www.robtex.com/ip/##.html",
	       "4H|ip2country.cc|http://www.ip2country.cc/?q=##",
	       "6|l4x.org|http://dnstools.l4x.org/##",
	       "46H|dns.l4x.org|http://dns.l4x.org/##",
	       "4|whois.sc|http://www.whois.sc/##",
	       "H|whoishostingthis.com|www.whoishostingthis.com/##",
	       "H|netcraft|http://uptime.netcraft.com/up/graph/?host=##",
	       "H|whois.sc|http://www.whois.sc/domain-explorer/?q=##&sub=Search&filter=y&pool=C&rows=100&bc=25&last="
		       ];

	// blacklisted urls...
	this.urlbl = [
		"ipv6tools.com","dnsstuff.com","esymbian.info"
		];
	if (this.prefs.getPrefType("ipv6ident.urls") == this.prefs.PREF_STRING){
		urls = this.prefs.getCharPref("ipv6ident.urls");
	} else {
		// default, first run...
	       urls = this.defaulturls.join('||')
		this.newservices = this.defaulturls.join('||');
	}
	this.menuurls = urls;

	this.blacklist = [];
	if (this.prefs.getPrefType("ipv6ident.blacklist") == this.prefs.PREF_STRING){
		var x = this.prefs.getCharPref("ipv6ident.blacklist");
		if (x) {
			this.blacklist = x.split('|');
		}
	}
	if (this.prefs.getPrefType("ipv6ident.newservices") == this.prefs.PREF_STRING){
		// this remembers for which services we asked the user
		// to add them to their list (domains only)
		this.newservices = this.prefs.getCharPref("ipv6ident.newservices").split('|');
	} else {
		// do nothing, default is handled above
	}

	if (this.prefs.getPrefType("ipv6ident.newtab") == this.prefs.PREF_BOOL){
		this.newtab = this.prefs.getBoolPref("ipv6ident.newtab");
	} else {
		this.newtab = true;
	}

	if (this.prefs.getPrefType("ipv6ident.hiddentab") == this.prefs.PREF_BOOL){
		this.hiddentab = this.prefs.getBoolPref("ipv6ident.hiddentab");
	} else {
		this.hiddentab = true;
	}

	if (this.prefs.getPrefType("ipv6ident.async") == this.prefs.PREF_BOOL){
		this.asyncresolve = this.prefs.getBoolPref("ipv6ident.async");
	} else {
		this.asyncresolve = true;
	}

	if (this.prefs.getPrefType("ipv6ident.resolve_immediate") == this.prefs.PREF_BOOL){
		this.resolve_immediate = this.prefs.getBoolPref("ipv6ident.resolve_immediate");
	}
	if (this.prefs.getPrefType("ipv6ident.remote_do") == this.prefs.PREF_BOOL){
		this.remote = this.prefs.getBoolPref("ipv6ident.remote_do");
	}
	if (this.prefs.getPrefType("ipv6ident.remote_immediate") == this.prefs.PREF_BOOL){
		this.remote_immediate = this.prefs.getBoolPref("ipv6ident.remote_immediate");
	}
	if (this.prefs.getPrefType("ipv6ident.remote_host") == this.prefs.PREF_STRING){
		this.remote_host = this.prefs.getCharPref("ipv6ident.remote_host");
	}

	if (this.prefs.getPrefType("ipv6ident.debug") == this.prefs.PREF_BOOL){
		this.debug = this.prefs.getBoolPref("ipv6ident.debug");
	}

	this.color = new Array();
	if (this.prefs.getPrefType("ipv6ident.color") == this.prefs.PREF_STRING){
		this.color['unknown'] = this.prefs.getCharPref("ipv6ident.color");
	} else {
		this.color['unknown'] = "#000000";
	}

	if (this.prefs.getPrefType("ipv6ident.colorv4") == this.prefs.PREF_STRING){
		this.color['ipv4'] = this.prefs.getCharPref("ipv6ident.colorv4");
	} else {
		this.color['ipv4'] = "#FF0000";
	}

	if (this.prefs.getPrefType("ipv6ident.colorv6") == this.prefs.PREF_STRING){
		this.color['ipv6'] = this.prefs.getCharPref("ipv6ident.colorv6");
	} else {
		this.color['ipv6'] = "#00FF00";
	}

	if (this.prefs.getPrefType("ipv6ident.ipv4style") == this.prefs.PREF_INT){
		this.ipv4style = this.prefs.getIntPref("ipv6ident.ipv4style");
	}
	if (this.prefs.getPrefType("ipv6ident.cacheage") == this.prefs.PREF_INT){
		this.cacheage = this.prefs.getIntPref("ipv6ident.cacheage");
	}
	if (this.prefs.getPrefType("ipv6ident.forcesocks") == this.prefs.PREF_BOOL){
		this.forcesocks = this.prefs.getBoolPref("ipv6ident.forcesocks");
	} else {
		this.forcesocks = false;
	}
	if (this.prefs.getPrefType("ipv6ident.showdomain") == this.prefs.PREF_BOOL){
		this.showdomain = this.prefs.getBoolPref("ipv6ident.showdomain");
	}
	if (this.prefs.getPrefType("ipv6ident.firstrun") == this.prefs.PREF_INT){
		this.firstrun = this.prefs.getIntPref("ipv6ident.firstrun");
	}

},
setfirstrun: function () {
		this.prefs.setIntPref("ipv6ident.firstrun", 1);
},
yesno: function(text) {
	var ps = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
		.getService(Components.interfaces.nsIPromptService);
	var rv = ps.confirmEx(window, "ShowIP Add On", text,
		                ps.BUTTON_TITLE_IS_STRING * ps.BUTTON_POS_0 +
		                ps.BUTTON_TITLE_IS_STRING * ps.BUTTON_POS_1,
		                "Yes", "No", null, null, {});
	return !(rv == 1); // 0 == Yes == True...
},
checkblacklist: function() {
	this.strings = document.getElementById("showip_strings");
	var blacklist = this.blacklist;
	var newservices = this.newservices;
	var menuurls = this.menuurls;
	// check for urls in the blacklist
	for(var i = 0; i < this.urlbl.length; i++) {
		if (blacklist.indexOf(this.urlbl[i]) != -1) {
			continue;
		}
		blacklist[blacklist.length] = this.urlbl[i];
		var s = this.strings.getFormattedString("askblacklist", [this.urlbl[i]]);
		/* don't confuse the users.
		var yes = this.yesno(s);
		if (!yes) {
			continue;
		}
		*/

		var entries = menuurls.split("||");
		var nentries = [];
		for(var j = 0; j < entries.length; j++) {
			if (entries[j].indexOf(this.urlbl[i]) == -1) {
				nentries[nentries.length] = entries[j];
			} else {
				//alert("Removed " + entries[j]);
			}

		}
		menuurls = nentries.join('||');
	}
	// check for services which got recently added
	for(i = 0; i < this.defaulturls.length; i++) {
		var d = this.defaulturls[i].split('|');
		//alert(d[1] + ' ' + d[2]);
		var url = d[2];
		if ( newservices.indexOf(url) != -1) {
			// already asked
			continue;
		}
		if ( menuurls.indexOf(url) != -1) {
			// already in list
			continue;
		}
		newservices[newservices.length] = url;
		var s = this.strings.getFormattedString("asknewservice", [d[1]]);
		/*
		var yes = this.yesno(s);
		if (!yes) {
			continue;
		}
		*/
		var entries = menuurls.split("||");
		entries[entries.length] = this.defaulturls[i];
		menuurls = entries.join('||');

	}
	this.prefs.setCharPref("ipv6ident.urls", menuurls); // keep this first!
	if (newservices && newservices.join) {
		this.prefs.setCharPref("ipv6ident.newservices", newservices.join('|'));
	}
	if (blacklist) {
		this.prefs.setCharPref("ipv6ident.blacklist", blacklist.join('|'));
	}
	/*
	alert(this.blacklist.join('|'));
	alert(this.newservices.join('|'));
	alert(this.menuurls);
	*/
},

DialogInit: function () {
	this.Init();
	var entries = this.menuurls.split("||");
	for(var i = 0; i < entries.length; i++) {
		var parts = entries[i].split("|");
		if (parts.length != 3)
			continue;
		this._AddEntry( 
			parts[0].indexOf("4") != -1,
			parts[0].indexOf("6") != -1,
			parts[0].indexOf("H") != -1,
			parts[1],
			parts[2]
			);
	}
	document.getElementById("newtab").checked = this.newtab;
	document.getElementById("hiddentab").disabled = !this.newtab;
	document.getElementById("hiddentab").checked = this.hiddentab;
	document.getElementById("async").checked = this.asyncresolve;
	document.getElementById("ipv6_coldef").value = this.color['unknown'];
	document.getElementById("ipv6_colv4").value = this.color['ipv4'];
	document.getElementById("ipv6_colv6").value = this.color['ipv6'];
	document.getElementById("ipv6_colpdef").color = this.color['unknown'];
	document.getElementById("ipv6_colpv4").color = this.color['ipv4'];
	document.getElementById("ipv6_colpv6").color = this.color['ipv6'];
	document.getElementById("showip_stylev4").selectedIndex = this.ipv4style;
	document.getElementById("showip_cacheage").value = this.cacheage;
	document.getElementById("showip_forcesocks").checked = this.forcesocks;

	document.getElementById("resolve_immediate").checked = this.resolve_immediate;
	document.getElementById("show_domain").checked = this.showdomain;

	document.getElementById("remote_do").checked = this.remote;
	document.getElementById("remote_immediate").checked = this.remote_immediate;
	document.getElementById("remote_host").value = this.remote_host;

	this.ForceSocksClick();
	this.RemoteClick();
	this.NewtabClick();
},

Save: function() {
	this.prefs.setBoolPref("ipv6ident.hiddentab", document.getElementById("hiddentab").checked);
	this.prefs.setBoolPref("ipv6ident.newtab", document.getElementById("newtab").checked);
	this.prefs.setBoolPref("ipv6ident.async", document.getElementById("async").checked);

	this.prefs.setCharPref("ipv6ident.color", document.getElementById("ipv6_coldef").value);
	this.prefs.setCharPref("ipv6ident.colorv4", document.getElementById("ipv6_colv4").value);
	this.prefs.setCharPref("ipv6ident.colorv6", document.getElementById("ipv6_colv6").value);
	this.prefs.setIntPref("ipv6ident.ipv4style", document.getElementById("showip_stylev4").selectedIndex);
	this.prefs.setIntPref("ipv6ident.cacheage", document.getElementById("showip_cacheage").value);
	this.prefs.setBoolPref("ipv6ident.forcesocks", document.getElementById("showip_forcesocks").checked);

	this.prefs.setBoolPref("ipv6ident.remote_do", document.getElementById("remote_do").checked);
	this.prefs.setBoolPref("ipv6ident.remote_immediate", document.getElementById("remote_immediate").checked);
	this.prefs.setCharPref("ipv6ident.remote_host", document.getElementById("remote_host").value);

	this.prefs.setBoolPref("ipv6ident.resolve_immediate", document.getElementById("resolve_immediate").checked);
	this.prefs.setBoolPref("ipv6ident.showdomain", document.getElementById("show_domain").checked);

	var urls = "";
	var lb = document.getElementById("EntryList");
	// i = 2 to skip header
	for(var i = 2; i < lb.childNodes.length; i++) {
		var li = lb.childNodes[i];
		var newstr = "";

		newstr += ((li.childNodes[0].getAttribute("label") == "true" )?"4":"");
		newstr += ((li.childNodes[1].getAttribute("label") == "true" )?"6":"");
		newstr += ((li.childNodes[2].getAttribute("label") == "true" )?"H|":"|");
		newstr += li.childNodes[3].getAttribute("label") + "|";
		newstr += li.childNodes[4].getAttribute("label");
		if (newstr.indexOf("||") != -1) // this is the delimiter - don't save it.
			continue;
		urls = urls + "||" + newstr;
	}
	this.prefs.setCharPref("ipv6ident.urls", urls);
},

AddEntry: function() {
	this._AddEntry(
		document.getElementById("entryIPv4").checked,
		document.getElementById("entryIPv6").checked,
		document.getElementById("entryHost").checked,
		document.getElementById("entryTitle").value,
		document.getElementById("entryURL").value);

	document.getElementById("entryTitle").value = "";
	document.getElementById("entryURL").value = "";
},

UpdEntry: function() {
	var lb = document.getElementById("EntryList");
	if (lb.selectedIndex == -1) {
		alert("No item selected");
		return;
	}
	var li = lb.selectedItem;
	li.childNodes[0].setAttribute("label", document.getElementById("entryIPv4").checked);
	li.childNodes[1].setAttribute("label", document.getElementById("entryIPv6").checked);
	li.childNodes[2].setAttribute("label", document.getElementById("entryHost").checked);
	li.childNodes[3].setAttribute("label", document.getElementById("entryTitle").value);
	li.childNodes[4].setAttribute("label", document.getElementById("entryURL").value);
},

DelEntry: function() {
	var lb = document.getElementById("EntryList");
	if (lb.selectedIndex == -1) {
		alert("No item selected");
		return;
	}
	lb.removeChild(lb.selectedItem);
	this._UpdRows();
},

CopyEntry: function() {
	var lb = document.getElementById("EntryList");
	if (lb.selectedIndex == -1)
		return;
	var li = lb.selectedItem;
	document.getElementById("entryIPv4").checked = (li.childNodes[0].getAttribute("label") == "true" );
	document.getElementById("entryIPv6").checked = (li.childNodes[1].getAttribute("label") == "true" );
	document.getElementById("entryHost").checked = (li.childNodes[2].getAttribute("label") == "true" );
	document.getElementById("entryTitle").value = li.childNodes[3].getAttribute("label");
	document.getElementById("entryURL").value =  li.childNodes[4].getAttribute("label");
},

NewtabClick: function() {
	var newtab = document.getElementById("newtab").checked;
	document.getElementById("hiddentab").disabled = !newtab;
},
ForceSocksClick: function() {
	var fs = document.getElementById("showip_forcesocks").checked;
	document.getElementById("remote_do").disabled = fs;
	document.getElementById("remote_immediate").disabled = fs;
	document.getElementById("remote_host").disabled = fs;
},
RemoteClick: function() {
	var fs = document.getElementById("remote_do").checked;
	document.getElementById("resolve_immediate").disabled = fs;
	document.getElementById("remote_host").disabled = !fs;
},
SetRemoteDefault: function() {
	document.getElementById("remote_host").value = this.remote_host_default;
},



updatecolor: function(picker, id) {
	document.getElementById(id).value = picker.color;
},

updatecolorp: function(textbox, id) {
	document.getElementById(id).color = textbox.value;
}
};
