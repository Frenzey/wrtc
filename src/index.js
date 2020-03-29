"use strict";
exports.__esModule = true;
var server_1 = require("./server");
var server = new server_1.Server();
server.listen(function (port) {
    console.log("Serveur lanc\u00E9 sur http://localhost:" + port + "!");
});
