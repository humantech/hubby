
var _ = require('underscore'),
	uuid = require('node-uuid');

////////////////////////////////////////////////////////////////////////////////
// the default message object that will be part of the bus

var Message = (function() {

	var Constructor = function(content) {
		this._id = uuid.v1();
		this._date = new Date();
		this.content = content;
	};

	Constructor.prototype = {
		constructor: Message
	};

	return Constructor;

}());

////////////////////////////////////////////////////////////////////////////////
// useful code

Object.defineProperty(this, "id", {
	enumerable: true,
	get: function () {
		return this._id;
	},
	set: function (v) {
		this.internalHint = normalizeHintField(v);
	}
 });

module.exports = Message;
