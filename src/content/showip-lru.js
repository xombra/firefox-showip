/*
 * ShowIP (c) Jan Dittmer <jdi@l4x.org> 2011
 *
 * LRU Cache Module
 */
function ShowipCache(size) {
	this.size = size;
	this.items = {};
	this.length = 0;
	this.count = 0;
	this.stats = {hits: 0, misses:0, inserts:0, purges: 0, deletes:0};
}
ShowipCache.prototype.get = function(key) {
	var item = this.items[key];
	var now = new Date().getTime();
	if (item && (!item.expires || (item.expires > now))) {
		item.last = new Date().getTime() + this.count;
		this.count = this.count + 1;
		this.stats.hits = this.stats.hits + 1;
		return item.data;
	}
	this.stats.misses = this.stats.misses + 1;
	return null;
};
ShowipCache.prototype.purge = function() {
	// purge, try to free at least one item
	if (this.length < this.size) {
		return;
	}
	var now = new Date().getTime();
	// first phase remove expired entries
	var tmp = [];
	for(k in this.items) {
		var item = this.items[k];
		if (item.expires < now) {
			this.del(k);
		}
		tmp.push({key: k, last: item.last});
	}
	// see if we have enough room
	if (this.length < this.size) {
		return;
	}
	// second phase, remove least-recently-used entry
	this.stats.purges = this.stats.purges + 1;
	tmp.sort(function(a, b) {
			return a.last > b.last;
		});
	while (this.length >= this.size) {
		this.del(tmp[0].key);
		tmp.shift();
	}
};
ShowipCache.prototype.set = function(key, data, expires) {
	if (!this.size || (this.size <= 0) || (!expires)) {
		// zero means disabled
		return;
	}
	if ((this.length >= this.size) && !this.items[key]) {
		this.purge();
	}
	var item = this.items[key];
	var created = new Date().getTime();
	if (expires < 0) {
		// near infinity
		expires = 86400*365;
	}
	this.items[key] = {
		data: data,
		last: null,
		created: created,
		expires: created + 1000*expires
	};
	this.length = this.length + 1;
	this.stats.inserts = this.stats.inserts + 1;
};
ShowipCache.prototype.del = function(key) {
	if (this.items[key]) {
		delete this.items[key]
		this.length = this.length - 1;
		this.stats.deletes = this.stats.deletes + 1;
	}
};
ShowipCache.prototype.stat = function() {
	var s = '';
	for(k in this.stats) {
		s += k + ': ' + this.stats[k] + ', ';
	}
	s += this.length + '/' + this.size + ' (' + this.count + ')';
	return s;
};
