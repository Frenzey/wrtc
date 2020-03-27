import { Server } from "./server";

const server = new Server();

server.listen(port => {
    console.log(`Serveur lancé sur http://localhost:${port}!`);
});