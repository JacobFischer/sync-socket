var expect = require("chai").expect;
var net = require("net");
var EventEmitter = require('events');
var Buffer = require("buffer").Buffer;
var SyncSocket = require("../src/");
var PORT = 1337;
var MESSAGE = "This is just a test message";

var server;
var serverClosed = false;
function onServerClosed() {
  serverClosed = true;
}

describe("sync-socket", function() {
  beforeEach(function(done) {
    serverClosed = false;
    server = net.createServer();
    server.listen(PORT, done);
    server.on("close", onServerClosed);
  });

  afterEach(function(done) {
    server.removeListener("close", onServerClosed);

    if(serverClosed) {
      done();
    }
    else {
      server.close(done);
    }
  });

  it("should initialize", function() {
    expect(SyncSocket).to.be.a("function");

    var syncSocket = new SyncSocket();

    expect(syncSocket).to.be.an("Object");
    expect(syncSocket).to.be.an.instanceof(SyncSocket);
    expect(syncSocket).to.have.own.property("destroyed", false);
    expect(syncSocket).to.have.own.property("connecting", false);
    expect(syncSocket).to.have.own.property("connected", false);

    syncSocket.destroy();
  });

  it("should connect", function(done) {
    var syncSocket = new SyncSocket();

    server.on('connection', function(socket) {
      expect(socket).to.exist;

      expect(syncSocket).to.have.own.property("destroyed", false);
      expect(syncSocket).to.have.own.property("connecting", false);
      expect(syncSocket).to.have.own.property("connected", true);

      syncSocket.destroy();
      done();
    });

    syncSocket.connect(PORT);
  });

  it("should have the correct address", function(done) {
    var syncSocket = new SyncSocket();

    expect(syncSocket).to.have.property("address");

    server.on('connection', function(socket) {
      var address = syncSocket.address();
      expect(address).to.have.own.property("family");
      expect(address).to.have.own.property("address", "127.0.0.1");
      expect(address).to.have.own.property("port", PORT);

      syncSocket.destroy();
      done();
    });

    syncSocket.connect(PORT);
  });

  it("should send data", function(done) {
    var syncSocket = new SyncSocket();

    server.on('connection', function(socket) {
      socket.on('data', function(data) {
        expect(data).to.be.an.instanceof(Buffer);
        expect(data.toString()).to.equal(MESSAGE);

        syncSocket.destroy();
        done();
      });

      syncSocket.write(MESSAGE);
    });

    syncSocket.connect(PORT);
  });

  it("should receive data", function(done) {
    var syncSocket = new SyncSocket();

    server.on('connection', function(socket) {
      socket.write(MESSAGE, undefined, function() {
        var read = syncSocket.read();

        expect(read).to.be.a("string");
        expect(read).to.equal(MESSAGE);

        syncSocket.destroy();
        done();
      });
    });

    syncSocket.connect(PORT);
  });

  it("should disconnect", function(done) {
    var syncSocket = new SyncSocket();

    server.on('connection', function(socket) {
      expect(syncSocket).to.have.own.property("connected", true);
      expect(syncSocket).to.have.own.property("destroyed", false);

      syncSocket.disconnect();

      expect(syncSocket).to.have.own.property("connected", false);
      expect(syncSocket).to.have.own.property("destroyed", true);

      syncSocket.destroy();
      done();
    });

    syncSocket.connect(PORT);
  });

  it("should handle being disconnected unexpectedly", function(done) {
    server.on('connection', function(socket) {
      socket.destroy(); // force disconnect when it connects

      server.close(function() {
          setTimeout(function() {
            // it's now disconnected, but we need to trigger that with a request
            expect(function() {
              syncSocket.read();
            }).to.throw(); // different errors are thrown based on OS, and OS detection is outside the scope of these simple unit tests

            // it should be disconnected now (not connected)
            expect(syncSocket).to.have.own.property("connected", false);
            // however we did not destroy it
            expect(syncSocket).to.have.own.property("destroyed", false);

            syncSocket.destroy();
            done();
          }, 100); // small wait so the async event can happen on the worker thread
        });
    });

    var syncSocket = new SyncSocket();
    syncSocket.connect(PORT);
    expect(syncSocket).to.have.own.property("connected", true);
  });

  it("should be destroyable", function(done) {
    var syncSocket = new SyncSocket();

    server.on('connection', function(socket) {
      expect(syncSocket).to.have.own.property("connected", true);
      expect(syncSocket).to.have.own.property("destroyed", false);

      syncSocket.destroy();

      expect(syncSocket).to.have.own.property("connected", false);
      expect(syncSocket).to.have.own.property("destroyed", true);

      done();
    });

    syncSocket.connect(PORT);
  });
});
