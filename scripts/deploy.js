const fs = require('fs');
const path = require('path');
const { Client } = require('ssh2');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const HOST = process.env.SSH_HOST || 'tricia';
const PORT = parseInt(process.env.SSH_PORT, 10) || 22;
const USER = process.env.SSH_USER || 'slopex';
const PASSWORD = process.argv[2] || process.env.SSH_PASSWORD || 'L42d11ejXr';

const zipPath = path.join(__dirname, '../slopex.zip');

const conn = new Client();
conn.on('ready', () => {
    console.log('Client :: ready');
    conn.sftp((err, sftp) => {
        if (err) throw err;
        console.log('Uploading slopex.zip...');
        const readStream = fs.createReadStream(zipPath);
        const writeStream = sftp.createWriteStream('/home/slopex/slopex.zip');
        
        writeStream.on('close', () => {
            console.log('File transferred successfully.');
            // Command chain using Docker helper container to fix file ownership, preserve server data, and deploy
            const cmd = [
                // 1. Stop any container using port 8828
                'CONTAINERS_8828=$(docker ps -q --filter "publish=8828") && [ -n "$CONTAINERS_8828" ] && docker stop $CONTAINERS_8828 && docker rm $CONTAINERS_8828 || true',
                'cd ~/slopex-app 2>/dev/null && (docker-compose down || true) || true',
                'cd ~/slopex-web/web 2>/dev/null && (docker-compose down || true) || true',
                
                // 2. Backup server data directory before cleanup
                'mkdir -p /tmp/slopex_data_backup && (cp -r ~/slopex-web/web/data/* /tmp/slopex_data_backup/ 2>/dev/null || cp -r ~/slopex-app/data/* /tmp/slopex_data_backup/ 2>/dev/null || true)',

                // 3. Detect UID:GID and clean up slopex-app
                'docker run --rm -v /home/slopex:/target node:20-bullseye sh -c "OWNER=\\$(stat -c \'%u:%g\' /target) && rm -rf /target/slopex-app && mkdir -p /target/slopex-web/web && chown -R \\$OWNER /target/slopex-web"',
                'mv ~/slopex.zip ~/slopex-web/web/',
                'cd ~/slopex-web/web',

                // 4. Clean up old code files EXCLUDING data/ and whatsapp-bot/.wwebjs_auth
                'docker run --rm -v /home/slopex/slopex-web/web:/target node:20-bullseye sh -c "OWNER=\\$(stat -c \'%u:%g\' /target) && mkdir -p /target/whatsapp-bot /target/data && chown -R \\$OWNER /target /target/whatsapp-bot /target/data && chmod 777 /target/whatsapp-bot /target/data && rm -rf /target/config /target/controllers /target/middleware /target/models /target/public /target/routes /target/utils /target/server.js /target/package.json /target/package-lock.json /target/Dockerfile /target/docker-compose.yml /target/.dockerignore /target/.env /target/whatsapp-bot/index.js /target/test-model.js"',

                // 5. Restore data files from backup if any
                'mkdir -p data && (cp -r /tmp/slopex_data_backup/* data/ 2>/dev/null || true)',

                // 6. Unzip code package (without overwriting data/)
                'unzip -o slopex.zip',
                'rm -f slopex.zip',

                // 7. Build and start container on port 8828
                'docker-compose up -d --build'
            ].join(' && ');

            console.log('Executing remote migration and build commands with DATA PRESERVATION...');
            conn.exec(cmd, (err, stream) => {
                if (err) throw err;
                stream.on('close', (code, signal) => {
                    console.log('Command execution closed with code: ' + code);
                    conn.end();
                }).on('data', (data) => {
                    process.stdout.write(data.toString());
                }).stderr.on('data', (data) => {
                    process.stderr.write(data.toString());
                });
            });
        });

        writeStream.on('error', (err) => {
            console.error('SFTP WriteStream Error:', err);
            conn.end();
        });

        readStream.pipe(writeStream);
    });
}).on('error', (err) => {
    console.error('SSH Connection Error:', err);
}).connect({
    host: HOST,
    port: PORT,
    username: USER,
    password: PASSWORD
});
