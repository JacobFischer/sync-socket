var spawn = require('child_process').spawn;
var syncRequest = require("sync-request");

module.exports = function(options) {
    options = options || {};
    options.httpPort = options.httpPort || 8080;
    options.readyTimeout = options.readyTimeout || 5000; // 5 seconds by default

    var url = "http://127.0.0.1:" + options.httpPort + "/";

    // this spawns the worker.js as a separate node executable
    // we don't use `cluster` as then we could not query it
    // for HTTP requests for some reason, and we don't care about
    // the IPS messaging
    var worker = spawn(process.execPath, [ __dirname + "/worker.js", options.httpPort, ">", __dirname + "/out.txt" ]);

    function request(method, args) {
        var type = "GET";
        var opts = {
            timeout: 5000,
        };

        if(args) {
            type = "POST";
            opts.json = Array.prototype.slice.call(arguments, 1);
        }

        var response = syncRequest(type, url + method, opts);

        if(response.statusCode !== 200) { // 200 means OK, so if not OK then...
            // an error probably occurred
            throw new Error(response.body);
        }

        return response.body;
    };

    request.kill = function() {
        worker.kill("SIGINT");
    };

    var timeoutTime = Number(new Date()) + options.readyTimeout;
    var ready = false;
    while(!ready && Number(new Date()) < timeoutTime) {
        try {
            var response = syncRequest("GET", url + "ready", { timeout: options.readyTimeout });
            if(response.statusCode === 200) {
                ready = true;
            }
        }
        catch(err) {
            ready = false;
        }
    }

    if(!ready) {
        request.kill();
        throw new Error("Could not connect to child process for SyncSocket");
    }

    return request;
};

