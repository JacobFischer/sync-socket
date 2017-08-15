var expect = require("chai").expect;
var net = require("net");
var Buffer = require("buffer").Buffer;
var SyncSocket = require("../src/");
var PORT = 1337;

var echoServer;
function onDataReceived(callback) {
};

describe("sync-socket", function() {
  it("should initialize", function() {
    expect(SyncSocket).to.be.a('function');

    var syncSocket = new SyncSocket();

    expect(syncSocket).to.be.an('Object');
    expect(syncSocket).to.be.an.instanceof(SyncSocket);
    expect(syncSocket).to.have.own.property("destroyed", false);
    expect(syncSocket).to.have.own.property("connecting", false);
    expect(syncSocket).to.have.own.property("connected", false);

    syncSocket.destroy();
  });

  it("should connect", function(done) {
    var syncSocket;

    var server = net.createServer(function(socket) {
      expect(socket).to.exist;

      syncSocket.destroy();
      server.close();

      done();
    });

    server.listen(PORT, "127.0.0.1", function() {
      syncSocket = new SyncSocket();
      syncSocket.connect(PORT);

      expect(syncSocket).to.have.own.property("destroyed", false);
      expect(syncSocket).to.have.own.property("connecting", false);
      expect(syncSocket).to.have.own.property("connected", true);
    });
  });

  it("should have the correct address", function(done) {
    var syncSocket;

    var server = net.createServer(function(socket) {
      syncSocket.destroy();
      server.close();
      done();
    });

    server.listen(PORT, "127.0.0.1", function() {
      syncSocket = new SyncSocket();
      syncSocket.connect(PORT);

      expect(syncSocket).to.have.property("address");

      var address = syncSocket.address();
      expect(address).to.have.own.property("family");
      expect(address).to.have.own.property("address", "127.0.0.1");
      expect(address).to.have.own.property("port", PORT);
    });
  });

  it("should send data", function(done) {
    var syncSocket;
    var message = "This is just a test message";

    var server = net.createServer(function(socket) {
      socket.on('data', function(data) {
        //socket.pipe(socket);
        expect(data).to.be.an.instanceof(Buffer);
        expect(data.toString()).to.equal(message);

        syncSocket.destroy();
        server.close();

        done();
      });
    });

    server.listen(PORT, "127.0.0.1", function() {
      syncSocket = new SyncSocket();
      syncSocket.connect(PORT);
      syncSocket.write(message);
    });
  });

  it("should receive data", function(done) {
    var syncSocket;
    var message = "This is just a test message";

    var server = net.createServer(function(socket) {
      socket.on('data', function(data) {
        socket.write(data, undefined, function() {
          var read = syncSocket.read();

          expect(read).to.be.a("string");
          expect(read).to.equal(message);

          syncSocket.destroy();
          server.close();

          done();
        });
      });
    });

    server.listen(PORT, "127.0.0.1", function() {
      syncSocket = new SyncSocket();
      syncSocket.connect(PORT);
      syncSocket.write(message);
    });
  });

  it("should disconnect", function(done) {
    var server = net.createServer(function(socket) {
      socket.pipe(socket);
    });

    server.listen(PORT, "127.0.0.1", function() {
      var syncSocket = new SyncSocket();
      syncSocket.connect(PORT);
      expect(syncSocket).to.have.own.property("connected", true);

      syncSocket.write("This is just a test message");
      syncSocket.disconnect();

      expect(syncSocket).to.have.own.property("connected", false);
      expect(syncSocket).to.have.own.property("destroyed", true);

      server.close();

      done();
    });
  });

  it("should handle being disconnected unexpectedly", function(done) {
    var server = net.createServer(function(socket) {
      socket.end(); // force disconnect when it connects
    });

    server.listen(PORT, "127.0.0.1", function() {
      var syncSocket = new SyncSocket();
      syncSocket.connect(PORT);
      expect(syncSocket).to.have.own.property("connected", true);
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
  });

  it("should be destroyable", function(done) {
    var server = net.createServer(function(socket) {
      socket.pip(socket);
    });

    server.listen(PORT, "127.0.0.1", function() {
      var syncSocket = new SyncSocket();
      syncSocket.connect(PORT);

      expect(syncSocket).to.have.own.property("connected", true);
      expect(syncSocket).to.have.own.property("destroyed", false);

      syncSocket.destroy();

      expect(syncSocket).to.have.own.property("connected", false);
      expect(syncSocket).to.have.own.property("destroyed", true);

      server.close();
      done();
    });
  });
});
