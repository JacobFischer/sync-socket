// This is a simple script that sends a lightweight request via a TCP socket
// to the worker thread and plops that to stdout
// This is intended to be ran via child_process.runFileSync();

var net = require("net");
var EOT_CHAR = String.fromCharCode(3);

var socket = new net.Socket();

socket.setNoDelay(true);

socket.on("data", function(data) {
    var str = data.toString();
    process.stdout.write(str);
    if(str[str.length - 1] === EOT_CHAR){
        process.exit();
    }
});

socket.on("error", function(error) {
    process.stdout.write('{"couldNotConnect":true,"error":"' + error.message + '"}');
    process.exit();
});

socket.connect(process.env.SYNC_SOCKET_WORKER_PORT, "127.0.0.1", function() {
    socket.write(process.env.SYNC_SOCKET_WRITE + EOT_CHAR);
});

