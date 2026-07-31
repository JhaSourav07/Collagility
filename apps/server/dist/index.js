import Fastify from 'fastify';
import { pino } from 'pino';
export function createServer() {
    const logger = pino({ level: 'info' });
    const server = Fastify({ logger: true });
    server.get('/health', async () => {
        return { status: 'ok', service: 'collagility-server', timestamp: Date.now() };
    });
    return { server, logger };
}
if (process.env['NODE_ENV'] !== 'test' && import.meta.url === `file://${process.argv[1]}`) {
    const { server } = createServer();
    const PORT = Number(process.env['PORT'] || 8080);
    server.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log(`Collagility relay server listening on ${address}`);
    });
}
//# sourceMappingURL=index.js.map