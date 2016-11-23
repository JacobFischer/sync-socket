// This is a script intended to be run as a separate thread and works as a normal Node.js async client
// A synchronous script will be used to query data from it, so we have the illusion of a synchronous client
// Without the need for a C++ dependency

var net = require("net");
var serverPort = process.argv[2] || 13354; // [0] should be the node executable, [1] should be the file worker.js, [2] will be the first arg, which is what we want
var EOT_CHAR = String.fromCharCode(3);

var client = {
    ready: false,
    bufferedData: "",
    closed: false,
    connected: false,
    lastError: null,
    maxBuffer: 1024*16, // any higher may be too much to spit out to stdout for the query thread
    socket: new net.Socket(),
};

client.socket.setNoDelay(true);

client.socket.on("data", function(data) {
    client.bufferedData += data.toString();
});

client.socket.on("close", function() {
    client.closed = true;
});

client.socket.on("error", function(err) {
    client.lastError = err;
});

// Callback methods for TCP requests
// All are invoked via reflection
var handler = {
    ready: function(callback) {
        callback(); // they just want to hear back from us
    },

    connect: function(options, callback) {
        var errorHandler = function(err) {
            callback(err.message);
        };

        client.socket.once("error", errorHandler);

        client.socket.connect(options, function() {
            // success!
            client.socket.removeListener("error", errorHandler);
            client.connected = true;
            callback(null, {
                localAddress: client.socket.localAddress,
                localPort: client.socket.localPort,
                remoteAddress: client.socket.remoteAddress,
                remotePort: client.socket.remotePort,
                remoteFamily: client.socket.remoteFamily,
            });
        });
    },

    read: function(buffer, blocking, callback) {
        if(blocking && client.bufferedData === "") {
            client.socket.once("data", function() {
                handler.read(buffer, false, callback);
            });

            return;
        }

        var reading = client.bufferedData;

        if(!buffer || buffer <= 0) {
            buffer = client.maxBuffer;
        }

        // read the maximum buffer size
        reading = client.bufferedData.substr(0, buffer);
        // and cut out what they just read
        client.bufferedData = client.bufferedData.substr(buffer);

        callback(null, reading);
    },

    write: function(str, encoding, callback) {
        client.socket.write(str, encoding);
        callback();
    },

    disconnect: function(callback) {
        client.socket.end();
        client.socket.destroy();
        callback();
    },
};



//--- TCP Request Server ---\\

var server = net.createServer(function(requestSocket) {
    var buffer = "";
    requestSocket.on("data", function(data) {
        buffer += data.toString();

        if(buffer[buffer.length - 1] !== EOT_CHAR) {
            return; // as we have no received the full text
        }

        var str = buffer.toString();
        str = str.substr(0, str.length - 1); // cut off the EOT_CHAR
        var index = str.indexOf("|");

        var method = str.substr(0, index);
        var data = str.substr(index+1);

        var funct = handler[method];

        function callback(err, data) {
            var res = {};
            if(err) {
                res.error = err;
            }

            if(data) {
                res.data = data;
            }

            if(!client.connected) {
                res.workerNotConnected = true;
            }

            requestSocket.write(JSON.stringify(res));
            requestSocket.destroy();
        };

        if(!funct) {
            return callback("No method handler for " + method);
        }

        if(client.lastError) {
            return callback(client.lastError);
        }

        if(!client.connected && method !== "connect" && method !== "ready") {
            return callback("Client not connected to remote server yet.");
        }

        if(client.closed) {
            return callback("Socket connection closed");
        }

        var args = JSON.parse(data);
        args.push(callback);
        funct.apply(handler, args);
    });
});

server.listen(serverPort, "0.0.0.0", function() {
    client.ready = true;
});
