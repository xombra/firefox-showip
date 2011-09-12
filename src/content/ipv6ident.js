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

window.addEventListener("load", function() { showipExt.init(); }, false);
//window.addEventListener("unload", function() { showipExt.destroy(); }, false);
var showipExtRunOnce = 0;
var showipExt = {
init: function()  {
	if(showipExtRunOnce == 1) { return; }
	showipExtRunOnce = 1;

	this.localip = null;
	this.updating = false;
	this.purgecache();
	this.strings = document.getElementById("showip_strings");

	this.currenthost = null;
	this.displayhost = 'not null ;-)';
	this.currentstatus = 'none';
	this.currentip = null;
	this.panelText = 'init';

	this.progressListener = {
		register: function() {
			const IPV6_NOTIFY_STATE_DOCUMENT =
				Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT;
			const IPV6_NOTIFY_LOCATION =
				Components.interfaces.nsIWebProgress.NOTIFY_LOCATION;
			try {
				window.getBrowser().addProgressListener(this,
					IPV6_NOTIFY_LOCATION | IPV6_NOTIFY_STATE_DOCUMENT);
			} catch(e) {
				window.getBrowser().addProgressListener(this);
			}
		},
		onLocationChange:function(aProgress,aRequest,aLocation) {
			// this gets nsIWebProgress and nsIRequest
			var host = 'none';
			var scheme = 'none';
			// try to prevent strange NS_ERRORS from StringBundle...
			try {
				host = aLocation.host;
				scheme = aLocation.scheme;
			} catch(e) {
				host = 'none';
				scheme = 'none';
			}
			if (!host || (host == '')) {
				host = 'none';
			}
			if ( (scheme == 'chrome') || (scheme == 'file') ) {
				host = 'none';
			}
			this.parent.updatestatus(host);
		},
		onStateChange:function(aProgress,aRequest,aFlag,aStatus) {},
		onProgressChange:function(a,b,c,d,e,f){},
		onStatusChange:function(a,b,c,d){},
		onSecurityChange:function(a,b,c){},
		onLinkIconAvailable:function(a){}
	}; // this.progressListener
	this.progressListener.parent = this;

	this.PrefObserver = {
		register: function() {
			var prefService = Components.classes["@mozilla.org/preferences-service;1"].
				  getService(Components.interfaces.nsIPrefService);
			this._branch = prefService.getBranch(""); // listen to all changes to also catch socks_remote_dns changes

			var pbi = this._branch.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
			pbi.addObserver("", this, false);
		},
		unregister: function() {
			 if(!this._branch) return;

			    var pbi = this._branch.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
			    pbi.removeObserver("", this);
		},
		observe: function(aSubject, aTopic, aData) {
			 if(aTopic != "nsPref:changed") return;
			 if (!aData) return;
			 if(aData.indexOf('ipv6ident')!=-1) {
				this.parent.prefs.Init();
			 }

			 if( (aData.indexOf('network.proxy')!=-1)||
			     (aData.indexOf('ipv6ident')!=-1)) {
				this.parent.updatesockspref(1);
			 }

		 }
	}; // this.prefObserver
	this.PrefObserver.parent = this;


	// see https://developer.mozilla.org/en/Monitoring_HTTP_activity
	// Define a reference to the interface
	this.httpObserver = {
		register: function() {
			try {
				this.nsIHttpActivityObserver = Components.interfaces.nsIHttpActivityObserver;

				var activityDistributor = Components.classes["@mozilla.org/network/http-activity-distributor;1"]
			              .getService(Components.interfaces.nsIHttpActivityDistributor);
				if (activityDistributor) {
					activityDistributor.addObserver(this);
				}
			} catch(e) { this.parent.dump('httpactivityobserver not available'); }
		},
		observeActivity: function(aHttpChannel, aActivityType, aActivitySubtype, aTimestamp, aExtraSizeData, aExtraStringData) {
			 var req = aHttpChannel.QueryInterface(Components.interfaces.nsIHttpChannelInternal);
			 var chan = aHttpChannel.QueryInterface(Components.interfaces.nsIChannel);
			 if (req) {
				if (req.proxyInfo && req.proxyInfo.type && (req.proxyInfo.type != 'direct')) {
					return null;
				}
				var local = '';
				var remote = '';
				var host = '';
				try {
					local = req.localAddress;
				} catch(e) { };
				try {
					remote = req.remoteAddress;
				} catch(e) { };
				try {
					host = chan.originalURI.host;
				} catch(e) { };
				try {
					if (!host) {
						host = chan.URI.host;
					}
				} catch(e) { };
				if (host && remote) {
					//this.parent.dump(host + ' ' + local + ' ' + remote + '\n');
					this.parent.updateactualip(host, remote);
				}
			 }
		}
	};
	this.httpObserver.parent = this;


	// load preferences
	this.prefs = showipExtPrefs;
	this.prefs.Init();

	// ff >= v4 init
	this.v4 = false;
	this.initv4();

	// defer the notifier a bit, so that it shows after the main window
	// to not confuse the users
	window.setTimeout( function() { showipExt.prefs.checkblacklist(); }, 2000);

	this.ipv6enabled = !this.prefs.prefs.getBoolPref("network.dns.disableIPv6");
	// needed for ff < 3
	var appcontent = document.getElementById("appcontent");
	if (appcontent) {
		// not defined for ff >= 4
		appcontent.addEventListener("load", this.onPageLoad, true);
	}

	if (gBrowser && gBrowser.tabContainer) {
		// ff2+
		function ontab(event) {
			var browser = gBrowser.selectedTab.linkedBrowser;
			//alert("Tab select " + browser.currentURI.host);
			try {
				showipExt.updatestatus(browser.currentURI.host);
			} catch(e) { 
				showipExt.updatestatus('none');
			}
		}
		gBrowser.tabContainer.addEventListener("TabSelect",ontab,false);
		gBrowser.tabContainer.addEventListener("TabOpen",ontab,false);
		gBrowser.tabContainer.addEventListener("TabClose",ontab,false);
	}


	this.progressListener.register();
	this.httpObserver.register()
	this.PrefObserver.register();

	this.updatesockspref(0);

},

initv4: function() {
	// init v4
	var mediator = Components.classes['@mozilla.org/appshell/window-mediator;1']
	             .getService(Components.interfaces.nsIWindowMediator);
	if (!mediator) {
		return;
	}
	var doc = mediator.getMostRecentWindow("navigator:browser").document;
	if (!doc) {
		return;
	}

	var addonBar = doc.getElementById("addon-bar");
	if (!addonBar) {
		return;
	}
	if (this.prefs.firstrun == 0) {
		var cb = doc.getElementById("addonbar-closebutton");
		addonBar.insertItem("showip_status_item", cb.nextSibling);
		addonBar.collapsed = false;
		this.prefs.setfirstrun();
	}
	this.v4 = true;
		/*
	addonBar.addEventListener("click", function(e) {
		showipExt.dump("el " + e.target.id);
		if (e.target.id == "showip_status_test") {
			e.preventDefault();
			e.stopPropagation();
			showipExt.showPopup(e);
		}
		if (e.target.id == "showip_status_text") {
			showipExt.showPopup(e);
		}
		if (e.target.id == "showip_status_domain") {
			showipExt.showPopupDomain(e);
		}
	}, false);
		*/
	var popup = document.getElementById("showip_popup");
	if (!popup) {
		return null;
	}
	popup.addEventListener("popupshowing", function(e) {
		showipExt.dump("popupshowing " + e.target.id + " " + e.button);
		return true;
	//	alert(e.target);
		//showipExt.showPopup(e);
	}, false);
	var status_text = document.getElementById("showip_status_text");
	/*
	status_text.addEventListener("contextmenu", function(e) {
		showipExt.dump("contextmenu " + e.target.id + ' ' + e.button);
		showipExt.showPopup(e);
	}, false);
	*/
	status_text.addEventListener("click", function(e) {
		// handle right click
		showipExt.dump("status_text click " + e.target.id + " " + e.button);
		showipExt.showPopup(e);
		/*
		if (e.button == 2) { // right click
			var mpopup = document.getElementById("showip_popup");
			if (mpopup.state != 'closed') {
				mpopup.hidePopup();
			}
			mpopup.openPopup(e.target, 'after_start', 0, 0, false, false, e);
		}
		*/
	}, false);

	var status_domain = document.getElementById("showip_status_domain");
	status_domain.addEventListener("click", function(e) {
		showipExt.dump("status_domain click " + e.target.id + " " + e.button);
		showipExt.showPopup(e);
		/*
		if ((e.button == 2) || (e.button == 0)) {
			var mpopup = document.getElementById("showip_popup");
			if (mpopup.state != 'closed') {
				popup.hidePopup();
			}
			mpopup.openPopup(e.target, 'after_start', 0, 0, false, false, e);
		}
		*/
	}, false);

	/*
	var test1 = document.getElementById("showip_test1");
	test1.addEventListener("click", function(e) {
		var tb = document.getElementById("toolbar-context-menu");
		try { tb.hidePopup(); } catch(e) {}
		showipExt.showPopup(e);
		e.preventDefault();
		e.stopPropagation();
	}, false);
	*/
},
updatesockspref: function(updatestatus) {
		var srdprefs = Components.classes["@mozilla.org/preferences-service;1"].
				getService(Components.interfaces.nsIPrefBranch);
		try {
			var sh = srdprefs.getCharPref("network.proxy.socks"); // string
			var sp = srdprefs.getIntPref("network.proxy.socks_port");
			var sv = srdprefs.getIntPref("network.proxy.socks_version"); // dns socks only supported for version 5
			var srd = srdprefs.getBoolPref("network.proxy.socks_remote_dns");
			var pt = srdprefs.getIntPref("network.proxy.type"); // == 1 for proxy
			this.socks_remote_dns = sh && sp && sv && srd &&
					(sh != '') && (sp > 0) && (sv > 4) && (pt == 1) && (this.prefs.forcesocks == false);
			//alert(this.prefs.forcesocks + ',' + this.socks_remote_dns + ',' + sh + ',' + sp + ',' + sv + ',' + pt + ',' + (this.prefs.forcesocks == false));
		} catch(e) {
			this.socks_remote_dns = false;
		}
		this.purgecache();
		this.displayhost = '';
		this.localip = null;
		if (updatestatus)
			this.updatestatus(this.currenthost);
},

useproxy: function (url) {
	// detect if the given url would use a proxy for dns resolution
	var ios = Components.classes["@mozilla.org/network/io-service;1"]
		.getService(Components.interfaces.nsIIOService);
	var pps = Components.classes["@mozilla.org/network/protocol-proxy-service;1"]
		.getService(Components.interfaces.nsIProtocolProxyService);
	try {
		var uri = ios.newURI(url, null, null);
		var pi = pps.resolve(uri, 0);
		// TRANSP... is only set in case of a SOCKS proxy 
		// (see nsProtocolProxyService.cpp#1329)
		return (pi != null);
		//  && (pi.flags & pi.TRANSPARENT_PROXY_RESOLVES_HOST);
	} catch (e) {
		this.dump("useproxy catch");
		this.dump(e.description);
		return false;
	}
},

purgecache: function () {
	this.dnscache_lru = new ShowipCache(1000);
	this.actualip_lru = new ShowipCache(1000);
},
destroy: function()  {
	this.PrefObserver.unregister();
	window.getBrowser().removeProgressListener(this.progressListener);
},

// 'load' event handler, necessary??
onPageLoad: function(e) {
	var doc = e.originalTarget;
	if (doc && doc.location &&
			(
			(doc.location.protocol == 'http:') ||
			(doc.location.protocol == 'ftp:') ||
			0
			)
		   ) {
		showipExt.updatestatus(doc.location.host);
	} else {
		showipExt.updatestatus("none");
	}
},

getdns: function() {
	var cls = Components.classes['@mozilla.org/network/dns-service;1'];
	var iface = Components.interfaces.nsIDNSService;
	var dns = cls.getService(iface);
	return dns;
},

// setup ipv6_localip with all local ips
getLocalIp: function() {
	if (this.localip)
		return this.localip;
	if (this.socks_remote_dns)
		return "Disabled due to SOCKS proxy";
	var a = new Array();
	// doc.location is the Location object
	try {
		var dns = this.getdns();
		var nsrecord = dns.resolve(dns.myHostName, true);
		while (nsrecord && nsrecord.hasMore()) {
			a[a.length] = nsrecord.getNextAddrAsString();
		}
		this.localip = a.join(" | ");
	} catch (e) {
		this.localip = dns.myHostName + " not resolvable";
	}
	return this.localip;
},

resolveIp: function(host) {
	if (!host || (host == 'none') || (host == 'exception') ||
		(host == 'string_none') || (host == 'string_exception') )
		return [];
	if (this.prefs.remote) {
		return this.resolveIpRemote(host);
	}
	return this.resolveIpDNS(host);
},
// return the ip of host
resolveIpDNS: function(host, canonical) {
	if (this.socks_remote_dns)
		return new Array();
	var asyncLookup = this.prefs.asyncresolve;
	var dns = this.getdns();
	try {
		if (asyncLookup) {

			var dnslistenerc = {
			onLookupComplete: function(aRequest, aRecord, aStatus) {
				  var c = new Array();
				  if (aRecord && aRecord.canonicalName) {
				  	c.push(aRecord.canonicalName);
				}
				  if (c.length) {
					this.parent.dump("Canonical name " + c[0] + " for " + this.host + "\n");
				  	this.parent.updatestatus(this.host, this.ips, false, c[0]);
				  }
			  }
			};

			var dnslistener = {
			onLookupComplete: function(aRequest, aRecord, aStatus) {
				  var ip = new Array();
				  while(aRecord && aRecord.hasMore()) {
					  var addr = aRecord.getNextAddrAsString();
					  if (ip.indexOf(addr) == -1) {
						ip.push(addr);
					  }
				  }
				  this.parent.updatestatus(this.host, ip);
				  if (this.parent.prefs.showdomain) {
					  this.parent.dump("Kick off canonical name resolve\n");
					  this.rc.ips = ip;
				          this.dns.asyncResolve(this.host, 2, this.rc, this.th);
				  }
			  }
			};

			var th;
			if (Components.classes["@mozilla.org/event-queue-service;1"]) {
				const EQS = Components.classes["@mozilla.org/event-queue-service;1"].getService(Components.interfaces.nsIEventQueueService);
				th = EQS.getSpecialEventQueue(EQS.CURRENT_THREAD_EVENT_QUEUE);
			} else {
				th = Components.classes["@mozilla.org/thread-manager;1"].getService().mainThread;

			}

			dnslistenerc.parent = this;
			dnslistenerc.host = host;

			dnslistener.parent = this;
			dnslistener.host = host;
			dnslistener.rc = dnslistenerc;
			dnslistener.dns = dns;
			dnslistener.th = th;
			dns.asyncResolve(host, 0, dnslistener, th);
			return ['pending'];
		} else {
			var ns = dns.resolve(host, true);
			var ip = new Array();
			while (ns && ns.hasMore()) {
				ip.push(ns.getNextAddrAsString());
			}
			return ip;
		}
	} catch(e) {
		this.dump("Resolve exception " + host);
		this.dump(e.description);
		return ['error'];
	}

	return new Array();

},

resolveIpRemote: function(host) {
	var url = this.prefs.remote_host.replace(/%s/,host);
	var x = XMLHttpRequest();
	var p = this;
	x.open("GET",url,true);
	x.onreadystatechange = function() {
		if (x.readyState != 4) { return; }
		if (x.status != 200) {
			p.updatestatus(host, ["error " + x.status]);
			return;
		}
		var xml = x.responseXML;
		if (!xml) {
			p.updatestatus(host, ["error invalid xml"]);
			return;
		}
		var root = xml.getElementsByTagName("domain")[0];
		p.localip = root.getAttribute("yourip");
		var rs = xml.getElementsByTagName("record");
		var ip = [];
		var i;
		for(i = 0; i < rs.length; i++) {
			var r = rs[i];
			if ( (r.getAttribute("type") == "A") ||
			     (r.getAttribute("type") == "AAAA") )
			   {
				ip.push(r.getAttribute("dst"));
			}
		}
		p.updatestatus(host, ip);
	};
	x.send(null);
	return ["pending"];
},

// convert num to base 'radix'
dec2radix: function(num, radix, pad) {
	var a = [0,1,2,3,4,5,6,7,8,9,'A','B','C','D','E','F'];
	var s = '';
	while(num > 0) {
		s = a[num % radix] + s;
		num = Math.floor(num / radix);
	}
	while((pad - s.length) > 0) {
		s = '0' + s;
	}
	return s;
},

// update the statusbar panel
// @host string hostname to look up
// @ips  array  ips corresponding to the host (when called from async resolver)
dump: function(s) {
	if (this.prefs.debug && s) {
		if (s && (s.charAt(s.length-1) != '\n')) {
			s = s + '\n';
		} else {
			s = '(undefined)\n';
		}
		var now = new Date();
		dump("[ShowIP " + now + "] " + s);
	}
},
cachekey: function(host) {
	return 'string_' + host;
},
updateactualip: function(host, ip) {
	var entry = this.actualip_lru.get(host);
	this.dump('updateactualip ' + host + ' ' + ip);
	if (!entry) {
		entry = { ips: [] };
	}
	var i = entry.ips.indexOf(ip);
	if (i == 0) {
		return;
	}
	if (i > 0) {
		// move ip to the beginning of the array, so
		// remove it here first
		entry.ips.splice(i, 1);
	}
	entry.ips.unshift(ip);
	this.actualip_lru.set(host, entry, 1*this.prefs.cacheage);
},
getactualips: function(host) {
	this.dump('getactualips ' + host);
	var entry = this.actualip_lru.get(host);
	if (entry) {
		return entry.ips;
	}
	return [];
},
updatecache: function(host, ips, canonical) {
	var cacheage = 1*this.prefs.cacheage; // -1: inf, 0: no cache, else time in seconds
	var cachekey = this.cachekey(host);
	var cache_entry = this.dnscache_lru.get(cachekey);
	if (ips) {
		var uniq = [];
		var tmp = ips.join(',').split(',');
		var i = 0;
		for(i = 0; i < tmp.length; i++) {
			if (tmp[i] && (uniq.indexOf(tmp[i]) == -1)) {
				uniq.push(tmp[i]);
			}
		}
		cache_entry = {
			state: 'final',
			ips: uniq,
			canonical: canonical
		};
		this.dnscache_lru.set(cachekey, cache_entry, cacheage);
	}
},
updatestatus: function(host, ips, force, canonical) {
	this.dump("host: " + host + "\n");
	if (!host)
		host = 'none';
	var cachekey = this.cachekey(host);
	var panel = document.getElementById("showip_status_text");
	var dpanel = document.getElementById("showip_status_domain");
	var cacheage = 1*this.prefs.cacheage; // -1: inf, 0: no cache, else time in seconds
	var d = new Date();
	var now = Math.ceil(d.getTime()/1000);
	var cachetime = now;
	var text = "";
	var status = "";
	//var winurl = getBrowser().window.top.currentURI.spec;
	var winurl = null;
	if (gBrowser && gBrowser.currentURI) {
		try {
			winurl = gBrowser.currentURI.host;
		} catch(e) {
			winurl = 'none';
		}
		this.dump("winurl1: " + winurl + "\n");
	} else {
	try {
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
		                   .getService(Components.interfaces.nsIWindowMediator);
		var mainWindow = wm.getMostRecentWindow("navigator:browser");
		winurl = mainWindow.getBrowser().currentURI.host;
		this.dump("winurl2: " + winurl + "\n");
	} catch(e) {
		// firefox 2.0 or no url, http is a guess...
		winurl = host;
		this.dump("winurl3: " + winurl + "\n");
	}
	}

	if ((winurl != host) && ((host != 'none') || (winurl)))   {
		this.dump('Ignoring update for ' + host + ', visible url ' + winurl + "\n");
		return;
	}

	// cache handling, getting
	if (!ips) {
		var cache_entry = this.dnscache_lru.get(cachekey);
		if (cache_entry) {
			ips = cache_entry.ips;
			canonical = cache_entry.canonical;
		}

		if (canonical && !cache_entry.canonical) {
			cache_entry.canonical = canonical;
			this.dnscache_lru.set(cachekey, cache_entry);
		}
	}

	this.currenthost = host;

	if (canonical && this.prefs.showdomain) {
		this.canonical = canonical;
		dpanel.setAttribute("label", canonical);
		dpanel.setAttribute("hidden", false);
	} else {
		this.canonical = null;
		dpanel.setAttribute("label", "");
		dpanel.setAttribute("hidden", true);
	}

	if ((host == this.displayhost) && (!force) && (!ips)) {
		this.dump('Host ' + host + ' already showing\n');
		// optimize out about 4/5 of all calls...
		return;
	}

	// deferred resolve
	this.needsresolve = false;
	if (  (!ips) && (
		(!force && !this.prefs.remote && (this.prefs.resolve_immediate == false)) ||
		(!force && this.prefs.remote && (this.prefs.remote_immediate == false)) ||
		((this.prefs.forcesocks == false) && (this.socks_remote_dns || this.useproxy(winurl)))
	   )) {
		if (host && (host != "")) {
			panel.setAttribute("label", host);
			panel.label = host;
		} else {
			panel.setAttribute("label", "none");
			panel.label = "none";
		}
		if (this.socks_remote_dns) {
			panel.setAttribute("tooltiptext", this.strings.getFormattedString("socksdisabled",  []));
		} else {
			panel.setAttribute("tooltiptext", this.strings.getFormattedString("clicktoresolve",  []));
			this.needsresolve = true;
		}
		panel.setAttribute("style", "color:" + this.prefs.color['unknown']+";");
		dpanel.setAttribute("label", "");
		dpanel.setAttribute("hidden", true);
		this.displayhost = host;
		this.dump("Resolve for " + host + " deferred, displayhost set\n");
		return;
	}


	if (!ips) {
		ips = this.resolveIp(host);
	}

	// no result yet, async lookup
	if (ips.length && (ips[0] == 'pending')) {
		text = this.strings.getString("pending");
		panel.setAttribute("label", text);
		panel.label = text;
		this.panelText = text;
		this.currentip = null;
		return;
	}

	if (ips.length && (ips[0] == 'error')) {
		//text = this.strings.getString("pending");
		panel.setAttribute("label", "DNS Error");
		panel.label = text;
		this.panelText = "DNS Error";
		this.currentip = null;
		return;
	}


	// cache value
	this.updatecache(host, ips, canonical);

	var aips = this.getactualips(host);
	var actip = false;
	if (ips.length || aips.length) {
		var j = 0;
		text = ips[j];
		// if ipv6 is disabled try to find a ipv4 address
		// for display
		while (!this.ipv6enabled && (text.indexOf(':') != -1) &&
		        ( j < ips.length) ) {
			text = ips[j];
			j++;
		}
		// if ipv6 is enabled try to find a ipv6 address
		// for display
		while (this.ipv6enabled && (text.indexOf('.') != -1) &&
		        ( j < ips.length) ) {
			text = ips[j];
			j++;
		}

		if (aips.length && (!winurl || !this.useproxy(winurl))) {
			text = aips[0];
			actip = true;
		}
	} else {
		text = this.strings.getString("nopage");
	}
	// text is ip or host here
	if (text.indexOf(":") != -1) {
		// ipv6
		status = "ipv6";
	} else if (text.indexOf(".") != -1) {
		// ipv4
		status = "ipv4";
		// 0: break; // decimal
		if (this.prefs.ipv4style) {
			var n = text.split('.');
			var i;
			for(i=0;i<4;i++) {
				n[i]=parseInt(n[i]);
			}
			switch(this.prefs.ipv4style) {
			case 1:
				for(i=0;i<4;i++) {
					n[i] = this.dec2radix(n[i], 8, 4);
				}
				text = n.join('.');
				break; // octal
			case 2:
				for(i=0;i<4;i++) {
					n[i] = '0x' + this.dec2radix(n[i], 16, 2);
				}
				text = n.join('.');
				break; // hex
			case 3:
				text = (n[0]*16777216)+(n[1]*65536)+(n[2]*256)+n[3];
				break; // dword
			}
		}
	} else {
		// unknown
		status = "unknown";
	}
	if (aips.length) {
		// merge lists
		var i;
		for(i = 0; i < aips.length; i++) {
			if (ips.indexOf(aips[i]) == -1) {
				ips.push(aips[i]);
			}
		}
	}
	this.currentip = ips.join(',');
	if (ips.length > 1) {
		text += ' +' + (ips.length - 1);
	}
//	text += ' @' + cachetime;
	this.currentstatus = status;

	if (text && (text != "")) {
		panel.setAttribute("label", text);
		panel.label = text;
	} else {
		panel.setAttribute("label", "no domain");
		panel.label = "no domain";
	}
	panel.setAttribute("tooltiptext", this.strings.getFormattedString("localips",  [this.getLocalIp()]));
	panel.setAttribute("style", "color:" + this.prefs.color[status]+";");
	this.panelText = text;


	/*
	var popup = document.getElementById("showip_ipmenu");
	if (popup) {
		// re-arm
		popup.onpopupshowing = function() {showipExt.AddIPItems(this);};
	}
	*/
	this.dump("Set displayhost to " + host + "\n");
	this.displayhost = host;
	if (this.popupafterresolve) {
		this.showPopup(this.popupafterresolve);
		this.popupafterresolve = null;
	}
	this.dump('dnscache_lru ' + this.dnscache_lru.stat());
	this.dump('actualip_lru ' + this.actualip_lru.stat());
	this.dump("updatestatus " + host + " finished\n");
	return;
},
showPopupDomain: function(e,o) {
	this.dump("showPopupDomain: " + this.currenthost);
	var popup = document.getElementById("showip_popup");
	/*
	if (popup.state != 'closed') {
		this.dump('hidePopup ' + popup.state);
		popup.hidePopup();
		return;
	}
	*/
	if (!this.prefs.showdomain || !this.canonical)
		return;
	if (this.currenthost == "none")
		return;
	// only do domain actions
	if (e.button == 1) {
		this.openurl('https://dns.l4x.org/##',this.canonical);
		return;
	}
	this._AddPopupItems("showip_popup","H",this.canonical, 1);
	popup.showPopup(e.target,-1,-1,"popup","bottomleft","topleft");
},

showPopup: function(e,o) {
	this.dump('showPopup event ' + e.button + ' target ' + e.target.id);
	if ( (e.target.id != 'showip_status_text') &&
	     (e.target.id != 'showip_status_domain') ) {
		return;
	}
	this.dump("showPopup: " + this.currenthost + '\n');
	var popup = document.getElementById("showip_popup");
	if ((popup.state != 'closed') && (popup.state != 'closing')) {
		if (this.v4) {
			this.dump('hidePopup ' + popup.state + '\n');
		//	popup.hidePopup();
		//	return;
		}
	}
	// debug helpers
	//e.preventDefault();
	//e.stopPropagation();
	if (this.currenthost == "none") {
		return;
	}
	switch(e.button) {
	case 0: //left
		this._AddPopupItems("showip_popup","H",this.currenthost, 1);
		break;
	case 1: //middle?
		this.openurl('https://dns.l4x.org/##',this.currenthost);
		return;
		break;
	case 2: //right
		if (this.socks_remote_dns) {
			this._AddPopupItems("showip_popup","H",this.currenthost, 1);
			break;
		}
		this.popupafterresolve = null;
		if (this.needsresolve) {
			this.updatestatus(this.currenthost,null,true);
			this.popupafterresolve = e;
			return;
		}
		var ip = this.currentip;
		if (!ip) {
			ip = '';
		}
		var ips = ip.split(',');
		if (ips.length == 1) {
			if (ip.indexOf(":") == -1) {
				this._AddPopupItems("showip_popup","4",ip,1);
			} else {
				this._AddPopupItems("showip_popup","6",ip,1);
			}
			break;
		}

		// deletes all items
		this._AddPopupItems("showip_popup","M","Multiple...",1);

		// TODO sort by real IP value
		ips.sort();
		// show one submenus for every IP
		var i;
		var seen = [];
		var aips = this.getactualips(this.currenthost);
		this.dump(aips.join(','));
		this.dump(ips.join(','));
		for(i = 0; i < ips.length; i++) {
			var xip = ips[i];
			if (seen.indexOf(xip) != -1) {
				continue;
			}
			seen.push(xip);

			var menu = document.createElement("menu");
			if (aips.indexOf(xip) > -1) {
				menu.setAttribute("label", '*' + xip + '*');
			} else {
				menu.setAttribute("label", xip);
			}
			popup.appendChild(menu);

			var mp = document.createElement("menupopup");
			mp.id = "showip_ipmenu_" + xip;
			// dummy function to prevent recursion
			mp.onpopupshowing = function() {};
			menu.appendChild(mp);

			if (xip.indexOf(":") == -1) {
				this._AddPopupItems("showip_ipmenu_" + xip, "4", xip, 0);
			} else {
				this._AddPopupItems("showip_ipmenu_" + xip, "6", xip, 0);
			}
		}
		break;
	}
	this.dump('showPopup end ' + e.target + '\n');
	if (this.v4) {
		this.assertPopupShowing(e);
	} else {
		popup.showPopup(e.target,-1,-1,"popup","bottomleft","topleft");
	}
	this.dump('showPopup end end\n');
},
assertPopupShowing: function(e) {
	var popup = document.getElementById("showip_popup");
	this.dump('v4 assertPopupShowing ' + popup.state);
	if (popup.state == 'closed') {
		popup.openPopup(e.target, 'after_start', 0, 0, false, false, e);
	}
	if (popup.state == 'hiding') {
		this.dump('v4 popup still in hiding state');
		popup.hidePopup();
		popup.openPopup(e.target, 'after_start', 0, 0, false, false, e);
		//window.setTimeout(showipExt.assertPopupShowing, 250);
	}
},
// build popup menu
// @ident 4, 6 or H
// @hostname IP or Hostname
_AddPopupItems: function(popupname, ident, hostname, header) {
	var popup = document.getElementById(popupname);
	var item;
	if (!popup) {
		return;
	}
	this.dump('populate ' + popupname + '\n');
	// top 3 items remain (currentip, seperator, copy to clipboard
	if (popup.childNodes.length > 1)
		for(var j=popup.childNodes.length - 1; j>=0; j--)
			popup.removeChild(popup.childNodes.item(j));

	if (header) {
		item = document.createElement("menuitem");
		if (ident == 'H') {
			item.setAttribute("label", this.strings.getFormattedString("hostmenutitle" , [hostname]));
		} else {
			item.setAttribute("label", this.strings.getFormattedString("ipmenutitle" , [hostname]));
		}
		popup.appendChild(item);

		item = document.createElement("menuseparator");
		popup.appendChild(item);
	}

	item = document.createElement("menuitem");
	item.setAttribute("label", this.strings.getFormattedString("copytoclipboard",[]));
	var clipdata = this.currentip;
	if (ident != 'M') {
		clipdata = hostname;
	}
	var handler = 'oncommand';
	if (this.v4) {
		handler = 'onclick';
	}
	item.setAttribute(handler, 'showipExt.copytoclip("'+clipdata+'");');
//	item.addEventListener("command", function(e) {
//		showipExt.copytoclip(clipdata);
//	}, false);
	popup.appendChild(item);

	var entries = this.prefs.menuurls.split("||");
	for(var i = 0; i < entries.length; i++) {
		var parts = entries[i].split("|");
		if (parts.length != 3)
			continue;
		if (parts[0].indexOf(ident) == -1 )
			continue;
		item = document.createElement("menuitem");
		item.setAttribute("label", parts[1]);
		item.setAttribute(handler, "showipExt.openurl(\"" + parts[2] + "\",\"" + hostname + "\",\"" + ident + "\");");
		/*
		item.addEventListener("click", function(e) {
			alert('x');
			e.stopPropagation()
			//showipExt.openurl(parts[2], hostname, ident);
		}, false);
		*/
		popup.appendChild(item);
	}

	/*
	item = document.createElement("menuitem");
	item.setAttribute("label", "socketping");
	item.setAttribute("oncommand", "showipExt.socketping(\"" + hostname + "\")");
	popup.appendChild(item);
	*/
},

// openurl in newtab/hiddentab/same tab
openurl: function(url, rep, ident) {
	this.dump("openurl url " + url + " rep " + rep + " ident " + ident);
	var orgurl = url;
	// complete uri
	url = url.replace(/###/, encodeURIComponent(getBrowser().currentURI.spec));
	url = url.replace(/#U#/, encodeURIComponent(getBrowser().currentURI.spec));
	// only domain/ip
	url = url.replace(/##/, rep);
	if (this.currentip) {
		url = url.replace(/#I#/, this.currentip);
	}
	// extract domain name
	if (this.currenthost) {
		var dn = this.currenthost;
		var x = dn.split(/\./);
		if (x.length > 1) {
			var tld = x[x.length - 1];
			var sld = x[x.length - 2];
			dn = sld + '.' + tld;
			// handle co.uk etc.
			if ((sld.length < 3) && (x.length > 2))
				dn = x[x.length - 3] + '.' + dn;
		}
		url = url.replace(/#D#/, dn);
	}
	if (url.indexOf('!') == 0) {
		// call local program
		// create an nsILocalFile for the executable
		var file = Components.classes["@mozilla.org/file/local;1"]
			.createInstance(Components.interfaces.nsILocalFile);
		var p= url.substr(1);
		//alert(p);
		try {
			file.initWithPath(p);
		//	file.initWithPath("C:\\showip.bat");
		} catch(e) {
			alert("File at '"+p+"' not found");
			return;
		}


		// create an nsIProcess
		var process = Components.classes["@mozilla.org/process/util;1"]
			.createInstance(Components.interfaces.nsIProcess);
		try {
			process.init(file);
		} catch(e) {
			alert("Could not init process with file " + p);
			return;
		}

		// Run the process.
		// If first param is true, calling process will be blocked until
		// called process terminates.
		// Second and third params are used to pass command-line arguments
		// to the process.
		var args = [rep,encodeURIComponent(getBrowser().currentURI.spec)];
		try {
			process.run(false, args, args.length);
		} catch(e) {
			alert("Could not run process at " + p);
		}
		return;
	}
	//alert(orgurl + ' -> ' + url);
	if (this.prefs.newtab) {
		var tab = getBrowser().addTab(url);
		if (!this.prefs.hiddentab)
			getBrowser().selectedTab = tab;

	} else {
		getBrowser().loadURI(url);
	}
},

// copy first argument to clipboard
copytoclip: function(host) {
  const gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
      .getService(Components.interfaces.nsIClipboardHelper);
        gClipboardHelper.copyString(host);
},

socketping: function(host) {
	 var transportService =
		      Components.classes["@mozilla.org/network/socket-transport-service;1"]
		             .getService(Components.interfaces.nsISocketTransportService);
	var socket = transportService.createTransport(null,0,host,80, null);
	this.TPEventSink = {
	 onTransportStatus: function( aTransport,aStatus,aProgress,aProgressMax) {
				    alert("TP" + aStatus + " " + aProgress);
			    },
	QueryInterface : function(aIID) {
		 if (aIID.equals(Components.interfaces.nsISupports) ||
				 aIID.equals(Components.interfaces.nsITransportEventSink))
			 return this;
		 throw Components.results.NS_NOINTERFACE;
	 }
	}

	//socket.setEventSink(this.TPEventSink,null);
	var ostream = socket.openOutputStream(0,0,0);
	ostream.write("1",1);
	ostream.close()
	//alert(socket.getPeerAddr());
},

httplistenerInit: function() {
	// see also stackoverflow.com 928735 TracingListener
	this.HttpObserver = {
	observe : function(aSubject, aTopic, aData) {
		  // Make sure it is our connection first.
//		  if (aSubject == gChannel) {
			  var httpChannel = aSubject.QueryInterface(Components.interfaces.nsIHttpChannel);
			  if (aTopic == "http-on-modify-request") {
				  // ...
			  } else if (aTopic == "http-on-examine-response") {
				showipExt.dump("examine-response");
				  // ...
			  }
//		  }
	  },
	QueryInterface : function(aIID) {
		 if (aIID.equals(Components.interfaces.nsISupports) ||
				 aIID.equals(Components.interfaces.nsIObserver))
			 return this;
		 throw Components.results.NS_NOINTERFACE;
	 }
	};
	 // get the observer service and register for the two coookie topics.
	  var observerService = Components.classes["@mozilla.org/observer-service;1"]
			  .getService(Components.interfaces.nsIObserverService);
	  observerService.addObserver(listener, "http-on-modify-request", false);
	  observerService.addObserver(listener, "http-on-examine-response", false);
},

dummy: function() {
} // without a comma
}; // showipExt
