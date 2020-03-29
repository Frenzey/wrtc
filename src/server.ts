import express, { Application } from "express";
import socketIO, { Server as SocketIOServer } from "socket.io";
import { createServer, Server as HTTPServer } from "http";
import path from "path";

export class Server {
    private httpServer: HTTPServer;
    private app: Application;
    private io: SocketIOServer;

    private activeSockets: string[] = [];

    private readonly PORT = 4000;

    constructor() {
        this.initialize();
    }

    private initialize(): void {
        this.app = express();
        this.httpServer = createServer(this.app);
        this.io = socketIO(this.httpServer);

        this.configureApp();
        this.configureRoutes();
        this.handleSocketConnection();
    }

    private configureApp(): void {
        this.app.use(express.static(path.join(__dirname, "../public")));
    }

    private configureRoutes(): void {
        this.app.get("/", (req, res) => {
            res.sendFile("index.html");
        });
    }

    private handleSocketConnection(): void {
        this.io.on("connection", socket => {
            const existingSocket = this.activeSockets.find(
                existingSocket => existingSocket === socket.id
            );

            if (!existingSocket) {
                this.activeSockets.push(socket.id);

                socket.emit("update-user-list", {
                    users: this.activeSockets.filter(
                        existingSocket => existingSocket !== socket.id
                    )
                });

                socket.broadcast.emit("update-user-list", {
                    users: [socket.id]
                });
            }

            socket.on("call-user", (data: any) => {
                socket.to(data.to).emit("call-made", {
                    offer: data.offer,
                    socket: socket.id
                });
            });

            socket.on("make-answer", data => {
                socket.to(data.to).emit("answer-made", {
                    socket: socket.id,
                    answer: data.answer
                });
            });

            socket.on("reject-call", data => {
                socket.to(data.from).emit("call-rejected", {
                    socket: socket.id
                });
            });

            const user = {}
            console.log("Un nouveau User est présent")
            socket.on('send-chat-message', message => {
                console.log(message)
                socket.broadcast.emit('chat-message', { message: message, name: user[socket.id]})
            })

            socket.on('new-user', name => {
                const idNumber = socket.id
                user[socket.id] = name
                socket.broadcast.emit('user-connected', {name: name, id: idNumber})
            })

            socket.on("disconnect", () => {
                this.activeSockets = this.activeSockets.filter(
                    existingSocket => existingSocket !== socket.id
                );
                socket.broadcast.emit("remove-user", {
                    socketId: socket.id
                });
                socket.broadcast.emit('user-disconnected', user[socket.id])
                delete user[socket.id]
            });
        });
    }

    public listen(callback: (port: number) => void): void {
        this.httpServer.listen(this.PORT, () => {
            callback(this.PORT);
        });
    }
}
