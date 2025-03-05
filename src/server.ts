import express, {Application} from "express";
import socketIO, { Server as SocketIOServer } from "socket.io";
import { createServer, Server as HTTPServer} from "http";
import path from "path";
import { off } from "process";

export class Server{
    private httpServer!: HTTPServer;
    private app!: Application;
    private io!: SocketIOServer;

    private readonly DEFAULT_PORT=5555;

    private activeSockets: string[]=[];

    constructor(){
        this.initialize();
        this.configureApp();
        this.handleRoutes();
        this.handleSocketConnection();
    }

    private initialize(): void{
        this.app=express();
        this.httpServer=createServer(this.app);
        this.io = new SocketIOServer(this.httpServer);        
    }

    private handleRoutes(): void{
        this.app.get("/", (req, res)=>{
            res.send(`<h1>Hello World</h1>`);
        });
    }

    private handleSocketConnection(): void{
        this.io.on("connection", socket => {
            console.log(`Connected: ${socket.id}`);
            
            const existingSocket = this.activeSockets.find(
                existingSocket => existingSocket === socket.id
            );
        
            if (!existingSocket) {
                this.activeSockets.push(socket.id);
                
                // send the event to the current user
                socket.emit("update-user-list", {
                    users: this.activeSockets.filter(
                        existingSocket => existingSocket !== socket.id
                    )
                });
        
                socket.broadcast.emit("update-user-list", {
                    users: [socket.id]
                });
            }

            socket.on('disconnect', ()=>{
                this.activeSockets=this.activeSockets.filter(
                    existingSocket=>existingSocket!==socket.id
                );
    
                socket.broadcast.emit('remove-user', {
                    socketId: socket.id
                })
            });
    
            socket.on('call-user', data=>{
                socket.to(data.to).emit('call-made', {
                    offer: data.offer,
                    socket: socket.id
                })
            });

            socket.on('make-answer', data=>{
                socket.to(data.to).emit('answer-made', {
                    socket: socket.id,
                    answer: data.answer
                })
            })

        });


    }

    public listen(callback: (port: number)=>void): void{
        this.httpServer.listen(this.DEFAULT_PORT, ()=>{
            callback(this.DEFAULT_PORT)
        })
    }

    private configureApp(): void{
        this.app.use(express.static(path.join(__dirname, "../public")));
    }
}