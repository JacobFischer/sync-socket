// This is a script intended to be run as a separate thread and works as a normal Node.js async client
// A synchronous script will be used to query data from it, so we have the illusion of a synchronous client
// Without the need for a C++ dependency

var http = require("http");
var net = require("net");
var cluster = require("cluster");
var httpPort = process.argv[2]; // [0] should be the node executable, [1] should be the file worker.js, [2] will be the first arg, which is what we want

var client = {
    ready: false,
    bufferedData: "",
    closed: false,
    connected: false,
    lastError: null,
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

// Callback methods for http requests
// All are invoked via reflection
var httpHandler = {
    connect: function(options, callback) {
        var errorHandler = function(err) {
            callback(err.message);
        };
        client.socket.once("error", errorHandler);

        client.socket.connect(options, function() {
            // success!
            client.socket.removeListener("error", errorHandler);
            client.connected = true;
            callback();
        });
    },

    read: function(callback) {
        callback(null, client.bufferedData);
        client.bufferedData = ""; // we've sent them the data, now unbuffer the data
    },

    blockingRead: function(callback) {
        if(client.bufferedData === "") {
            client.socket.once("data", function() {
                httpHandler.read(callback);
            });
        }
        else {
            httpHandler.read(callback);
        }
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

//--- HTTP Server ---\\

var server = http.createServer(function(request, response) {
    // assume they sent us something bad
    var method = request.url.substr(1);

    // special case to see if the http server is ready
    if(method === "ready") {
        response.statusCode = 200;
        response.end();
        return;
    }

    response.statusCode = 500;

    if(client.lastError) {
        response.end(client.lastError.message);
        return;
    }

    if(!client.connected && method !== "connect") {
        response.end("Not connected to a socket yet.");
        return;
    }

    if(client.closed) {
        response.end("Socket connection closed.");
        return;
    }

    var funct = httpHandler[method];
    if(!funct) {
        response.method = 404; // method not found
        response.end("Method `" + method + "` not found.");
        return;
    }

    // if we got here it looks good!

    // this is like a poor man's promise
    function callback(err, returned) {
        if(err) {
            response.statusCode = 500;
            response.end(err);
            return;
        }

        // assume OK
        response.statusCode = 200; // OK
        if(returned !== undefined) {
            response.end(returned);
        }
        response.end();
    };

    // get all the data from the body streaming in
    if(request.method === "POST") {
        // then write data to the socket
        var body = "";
        request.on("data", function(data) {
            body += data;

            // Too much POST data, kill the connection!
            // 1e7 = ~10MB, to prevent flood attacks
            if(body.length > 1e7) {
                request.connection.destroy();
            }
        });

        request.on("end", function() {
            // assume post data is always an array of arguments
            var args = JSON.parse(body);
            args.push(callback);
            funct.apply(httpHandler, args);
        });
    }
    else { // assume GET
        funct(callback);
    }
});

server.listen(httpPort, "0.0.0.0", function() {
    client.ready = true;
});
