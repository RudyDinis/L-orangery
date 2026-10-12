const { Launch, Microsoft } = require('minecraft-java-core');
import fs from 'fs';
import { getDataDir } from '../utils';
import settings from '../Settings/Settings';
import path from 'path';

const launcher = new Launch();

const DATA_DIR = getDataDir();
const ACCOUNT_FILE = path.join(DATA_DIR, 'account.json');
const GAME_DIR = path.join(DATA_DIR, 'minecraft');

type Send = (status: string, data?: unknown) => void;

const pct = (progress: number, size: number) => (size > 0 ? (progress / size) * 100 : 0);

class Launcher {
    private mc: any;
    private send: Send = () => { };
    private started = false;
    private lastTime = 0;
    private lastBytes = 0;
    private speed = 0;   // octets/s, lissé

    constructor() {
        launcher.on('check', (progress: number, size: number) => {
            this.send('check', pct(progress, size));
        });

        launcher.on('progress', (progress: number, size: number) => {
            const now = Date.now();

            if (this.lastTime === 0 || progress < this.lastBytes) {
                this.lastTime = now;
                this.lastBytes = progress;
                this.speed = 0;
            }

            const dt = (now - this.lastTime) / 1000;
            if (dt >= 0.5) {
                const instant = (progress - this.lastBytes) / dt;
                this.speed = this.speed === 0 ? instant : this.speed * 0.7 + instant * 0.3;
                this.lastTime = now;
                this.lastBytes = progress;
            }

            const eta = this.speed > 0 ? (size - progress) / this.speed : null;

            this.send('progress', {
                percent: pct(progress, size),
                speed: this.speed,
                eta
            });
        });

        launcher.on('extract', () => this.send('extract'));
        launcher.on('patch', () => this.send('patch'));

        launcher.on('data', (line: string) => {
            process.stdout.write(line);
            if (!this.started) {
                this.started = true;
                this.send('started');
            }
        });

        launcher.on('close', () => this.send('closed'));

        launcher.on('error', (err: any) => {
            console.error(err);
            const msg = typeof err === 'string' ? err : this.friendlyError(err?.error ?? err);
            this.send('error', msg);
        });

        process.on('unhandledRejection', (err: any) => {
            console.error('Promesse non gérée :', err?.message);
            for (const e of err?.cause?.errors ?? []) {
                console.error(' →', e.address, e.port, e.code);
            }
        });
    }

    async logout(): Promise<void> {
        this.mc = undefined;
        if (fs.existsSync(ACCOUNT_FILE)) fs.unlinkSync(ACCOUNT_FILE);
    }

    async checkAccount(): Promise<number> {
        if (!fs.existsSync(ACCOUNT_FILE)) return 0;

        let saved: any;
        try {
            saved = JSON.parse(fs.readFileSync(ACCOUNT_FILE, 'utf-8'));
        } catch {
            return -2;
        }
        if (!saved?.refresh_token) return -2;

        this.mc = saved;

        try {
            const refreshed = await new Microsoft().refresh(saved);
            if (!refreshed || refreshed.error) {
                console.log('Rafraîchissement impossible :', refreshed?.error);
                return -1;   // on ne touche PAS au fichier
            }
            this.mc = refreshed;
            fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(refreshed, null, 4));
        } catch (err) {
            console.log('Rafraîchissement impossible :', (err as Error).message);
            return -1;
        }
        return 0;
    }

    async connect(): Promise<void> {
        let saved: any = null;
        if (fs.existsSync(ACCOUNT_FILE)) {
            try { saved = JSON.parse(fs.readFileSync(ACCOUNT_FILE, 'utf-8')); } catch { }
        }

        if (saved?.refresh_token) {
            const refreshed = await new Microsoft().refresh(saved);

            if (refreshed && !refreshed.error) {
                this.mc = refreshed;
                fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(refreshed, null, 4));
                return;
            }
            if (refreshed?.error === 'fetch failed') {
                throw new Error('Connexion Microsoft impossible. Vérifie ta connexion internet.');
            }
        }

        const auth = await new Microsoft().getAuth();
        if (!auth || auth.error) throw new Error('Connexion Microsoft impossible.');
        this.mc = auth;
        fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(auth, null, 4));
    }

    async getHeadSkin(): Promise<string[]> {
        if (!this.mc?.name) return ["./assets/steve.png", "Déconnecté"];
        return [`https://api.mcheads.org/head/${this.mc.name}/128`, this.mc.name];
    }

    getInstance(): string {
        return this.mc?.uuid === 'f034c8503c36479db2f7fa7ddb6ee4a8' ? 'admin' : 'orangery';
    }

    private friendlyError(err: any): string {
        const code = err?.cause?.code ?? err?.code;
        if (['ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET'].includes(code) || err?.message === 'fetch failed') {
            return 'Serveur de fichiers injoignable. Vérifie ta connexion.';
        }
        return err?.message ?? 'Erreur inconnue';
    }

    async launch(send: Send): Promise<void> {
        this.send = send;
        this.started = false;
        this.lastTime = 0;
        this.lastBytes = 0;
        this.speed = 0;

        const s = settings.get();
        const instance = this.getInstance();

        const opt = {
            url: `https://launcher.orangery.fr/files/?instance=${instance}`,
            path: GAME_DIR,
            authenticator: this.mc,
            version: '1.21.1',
            intelEnabledMac: true,
            instance,
            ignored: ["config", "logs", "resourcepacks", "options.txt", "optionsof.txt"],
            loader: {
                type: 'neoforge',
                build: '21.1.250',
                enable: true
            },
            memory: {
                min: `${s.ramMin}G`,
                max: `${s.ramMax}G`
            },
        };

        Promise.resolve(launcher.Launch(opt)).catch((err: any) => {
            console.error(err);
            this.send('error', this.friendlyError(err));
        });
    }
}

export default Launcher;