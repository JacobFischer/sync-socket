var childProcess = require('child_process');
var spawn = childProcess.spawn;

function query(method, args) {

};

function Requester(options) {
    options = options || {};
    options.readyTimeout = options.readyTimeout || 5000; // 5 seconds by default

    this._workerPort = options.workerPort || 8080;
    this._requestTimeout = options.timeout || 1000;

    // this spawns the worker.js as a separate node executable
    // we don't use `cluster` as then we could not query it
    // for HTTP requests for some reason, and we don't care about
    // the IPS messaging
    this._worker = spawn(process.execPath, [ __dirname + "/worker.js", this._workerPort ]);

    var timeoutTime = Number(new Date()) + options.readyTimeout;
    var ready = false;
    while(!ready && Number(new Date()) < timeoutTime) {
        try {
            var response = this._request("ready");
            if(response) {
                ready = true;
                break;
            }
        }
        catch(err) {
            // try again
        }
    }

    if(!ready) {
        this.kill();
        throw new Error("Could not connect to child process for SyncSocket");
    }
};

Requester.prototype.request = function request(method, args) {
    var response = this._request.apply(this, arguments);

    if(!response || response.error) {
        throw new Error(response && response.error || ("Error requesting " + method));
    }
    else {
        return response.data;
    }
}

Requester.prototype._request = function _request(method, args) {
    // args are actually the rest of the arguments after the 1st argument
    args = Array.prototype.slice.call(arguments, 1);

    var response = childProcess.execFileSync(process.execPath, [ __dirname + "/query.js" ], {
        env: {
            SYNC_SOCKET_WORKER_PORT: this._workerPort,
            SYNC_SOCKET_WRITE: method + "|" + JSON.stringify(args),
        },
        timeout: this._requestTimeout,
        maxBuffer: 1024*32,
    });

    var parsed = JSON.parse(response.toString());
    return parsed
}

Requester.prototype.kill = function kill() {
    if(this._worker) this._worker.kill("SIGINT");
}

module.exports = Requester;
