import { status } from 'minecraft-server-util';

class Server {
    private host: string;
    private Sport: number;
    private Lport: number;
    private Rport: number;

    constructor(type: void) {
        this.host = "play.orangery.fr";
        this.Sport = 25565;
        this.Lport = 25567;
        this.Rport = 25568;
    }

    async getServerStatus(srv: string): Promise<any> {
        let port: number;

        switch (srv) {
            case "survie":
                port = this.Sport;
                break;

            case "lobby":
                port = this.Lport;
                break;

            case "ressource":
                port = this.Rport;
                break;

            default:
                throw new Error(`Serveur inconnu : ${srv}`);
        }

        try {
            const result = await status(this.host, port);

            return {
                online: true,
                ping: result.roundTripLatency,
                players: result.players.online,
                maxPlayers: result.players.max
            };

        } catch (error) {
            return {
                online: false,
                ping: -1,
                players: 0,
                maxPlayers: 0
            };
        }
    }
}

export default Server;