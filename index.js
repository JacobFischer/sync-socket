var Requester = require("./requester");

/**
 * This is intended to be a net.Socket "like" class, with the important distinction of all methods being synchronous instead of asynchronous.
 * Most methods/properties available to net.Socket are available here too
 */

/**
 * Creates a SyncSocket
 * @class
 * @classdesc This is intended to be a net.Socket "like" class, with the important distinction of all methods being synchronous instead of asynchronous.
 * @param {Object} [options] - key/value pairs of options, all optional
 * @param {number} [options.workerPort] - the port to use for the request TCP server used to communicate the TCP client data, must be free to work
 * @param {number} [options.timeout] - the amount of time in ms to test to make sure the helper thread is responding to requests before throwing an Error
 */
function SyncSocket(options) {
    this.destroyed = false;
    this.connecting = false;

    this.requester = new Requester(options);
};

/**
 * A synchronous version of net.Socket.connect(options).
 * Note: it does not accept a connectListener as part of the argument
 *
 * @param {Object|number} options - options to use to create the connection. Accepts all the options net.Socket.connect does (as it's just sent to that function). Alternatively can the just the number `port` to connect to.
 * @param {string} [host] - the host to connect to, if options was used as `port`.
 * @return {SyncSocket} returns itself
 */
SyncSocket.prototype.connect = function(options, host) {
    this.connecting = true;

    // if options is not a number, then it's the port to connect to
    if(!isNaN(options)) {
        options = {
            port: options, // it's a number
            host: host,
        };
    }

    var settings = this.requester.request("connect", options);

    for(var key in settings) {
        if(settings.hasOwnProperty(key)) {
            this[key] = settings[key];
        }
    }

    this.connecting = false;

    return this;
};

/**
 * Reads a socket for data. Basically a replacement for on('data');
 *
 * @param {number} [buffer=16384] - how many bytes to read from the buffer
 * @param {boolean} [blocking=false] - True if you want to block the read until data is available, false/undefined otherwise (normal behavior)
 * @return {string} the string read from the socket, or undefined if no data to read
 */
SyncSocket.prototype.read = function(buffer, blocking) {
    return this.requester.request("read", buffer, blocking);
};

/**
 * Writes data to the socket
 * @param {string} data - data to write to the socket
 * @param {string} [encoding] - encoding of the data being written, defaults to 'utf-8'
 */
SyncSocket.prototype.write = function(data, encoding) {
    this.requester.request("write", data, encoding);
};

/**
 * Disconnects/Destroys the connection and its workers
 */
SyncSocket.prototype.disconnect = function() {
    this.destroyed = true;
    this.requester.kill();
    this.requester.request("disconnect");
};

SyncSocket.prototype.destroy = SyncSocket.prototype.disconnect;

/**
 * Returns the bound address, the address family name and port of the socket as reported by the operating system. Returns an object with three properties, e.g. `{ port: 12346, family: 'IPv4', address: '127.0.0.1' }`
 * @return {Object} - the remote `family`, `address`, and `port` in an object
 */
SyncSocket.prototype.address = function address() {
    return {
        family: this.remoteFamily,
        address: this.remoteAddress,
        port: this.remotePort,
    };
};

module.exports = SyncSocket;
