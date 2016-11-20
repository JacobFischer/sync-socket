var request = require("./request");

/**
 * Creates a SyncSocket
 *
 * @constructor
 * @param {Object} [options] - key/value pairs of options, all optional
 * @param {number} [options.httpPort] - the port to use for the http server used to communicate tcp data, must be free to work
 * @param {number} [options.readyTimeout] - the amount of time in ms to test to make sure the helper thread is ready. This constructor will block for that time if need be.
 */
function SyncSocket(options) {
    this.destroyed = false;
    this.connecting = false;

    this.request = request(options);
};

/**
 * A synchronous version of net.Socket.connect(options).
 * Note: it does not accept a connectListener as part of the argument
 * @return {[type]} [description]
 */
SyncSocket.prototype.connect = function(options) {
    this.connecting = true;
    return this.request("connect", options);
    this.connecting = false;
};

SyncSocket.prototype.read = function() {
    return this.request("read");
};

SyncSocket.prototype.write = function(data, encoding) {
    return this.request("write", data, encoding);
};

SyncSocket.prototype.disconnect = function() {
    this.request.kill();
    return this.request("disconnect");
};

module.exports = SyncSocket;
