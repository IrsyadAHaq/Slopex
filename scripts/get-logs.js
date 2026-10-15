const path = require('path');
const { Client } = require('ssh2');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const HOST = process.env.SSH_HOST || 'tricia';
const PORT = parseInt(process.env.SSH_PORT, 10) || 22;
const USER = process.env.SSH_USER || 'slopex';
const PASSWORD = process.argv[2] || process.env.SSH_PASSWORD || 'L42d11ejXr';

const conn = new Client();
conn.on('ready', () => {
    console.log('Client :: ready');
    conn.exec('docker logs slopex-backend', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            conn.end();
        }).on('data', (data) => {
            process.stdout.write(data.toString());
        }).stderr.on('data', (data) => {
            process.stderr.write(data.toString());
        });
    });
}).on('error', (err) => {
    console.error('SSH Connection Error:', err);
}).connect({
    host: HOST,
    port: PORT,
    username: USER,
    password: PASSWORD
});
