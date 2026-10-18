const fs = require('fs');
const path = require('path');
const { ZipArchive } = require('archiver');

const rootDir = path.join(__dirname, '..');
const zipOutput = path.join(rootDir, 'slopex.zip');

function createZip() {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipOutput);
        const archive = new ZipArchive({ zlib: { level: 9 } });

        output.on('close', () => {
            console.log('Zip file created successfully:', archive.pointer() + ' total bytes');
            resolve();
        });

        archive.on('error', (err) => reject(err));
        archive.pipe(output);

        // We glob all files including hidden ones, but IGNORE node_modules, git, data, docs, and whatsapp auth cache
        archive.glob('**/*', {
            cwd: rootDir,
            ignore: [
                'node_modules/**',
                '.git/**',
                'whatsapp-bot/.wwebjs_auth/**',
                'whatsapp-bot/.wwebjs_cache/**',
                'data/**', // EXCLUDE data directory to prevent wiping out server database!
                'docs/**',
                'scripts/create_docs.py',
                'scratch/**',
                'slopex.zip'
            ],
            dot: true
        });

        archive.finalize();
    });
}

module.exports = { createZip };

if (require.main === module) {
    createZip().catch(console.error);
}
