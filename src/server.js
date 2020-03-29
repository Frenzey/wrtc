"use strict";
exports.__esModule = true;
var express= require("express");
var socket_io= require("socket.io");
var http= require("http");
var path= require("path");
var Server = /** @class */ (function () {
    function Server() {
        this.activeSockets = [];
        this.PORT = 4000;
        this.initialize();
    }
    Server.prototype.initialize = function () {
        this.app = express();
        this.httpServer = http.createServer(this.app);
        this.io = socket_io(this.httpServer);
        this.configureApp();
        this.configureRoutes();
        this.handleSocketConnection();
    };
    Server.prototype.configureApp = function () {
        this.app.use(express.static(path.join(__dirname, "../public")));
    };
    Server.prototype.configureRoutes = function () {
        this.app.get("/", function (req, res) {
            res.redirect("index.html");
        });
    };
    Server.prototype.handleSocketConnection = function () {
        var _this = this;
        this.io.on("connection", function (socket) {
            var existingSocket = _this.activeSockets.find(function (existingSocket) { return existingSocket === socket.id; });
            if (!existingSocket) {
                console.log(existingSocket);
                _this.activeSockets.push(socket.id);
                socket.emit("update-user-list", {
                    users: _this.activeSockets.filter(function (existingSocket) { return existingSocket !== socket.id; })
                });
                socket.broadcast.emit("update-user-list", {
                    users: [socket.id]
                });
            }
            socket.on("call-user", function (data) {
                socket.to(data.to).emit("call-made", {
                    offer: data.offer,
                    socket: socket.id
                });
            });
            socket.on("make-answer", function (data) {
                socket.to(data.to).emit("answer-made", {
                    socket: socket.id,
                    answer: data.answer
                });
            });
            socket.on("reject-call", function (data) {
                socket.to(data.from).emit("call-rejected", {
                    socket: socket.id
                });
            });
            var user = {};
            console.log("Un nouveau User est présent");
            socket.on('send-chat-message', function (message) {
                console.log(message);
                socket.broadcast.emit('chat-message', { message: message, name: user[socket.id] });
            });
            socket.on('new-user', function (name) {
                var idNumber = socket.id;
                user[socket.id] = name;
                socket.broadcast.emit('user-connected', { name: name, id: idNumber });
            });
            socket.on("disconnect", function () {
                _this.activeSockets = _this.activeSockets.filter(function (existingSocket) { return existingSocket !== socket.id; });
                socket.broadcast.emit("remove-user", {
                    socketId: socket.id
                });
                socket.broadcast.emit('user-disconnected', user[socket.id]);
                delete user[socket.id];
            });
        });
    };
    Server.prototype.listen = function (callback) {
        var _this = this;
        this.httpServer.listen(this.PORT, function () {
            callback(_this.PORT);
        });
    };
    return Server;
}());
exports.Server = Server;
