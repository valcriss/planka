const { execSync } = require('child_process');

const isWindows = process.platform === 'win32';

const pythonCommand = isWindows ? 'python' : 'python3';
const pipCommand = isWindows ? '.venv\\Scripts\\pip.exe' : '.venv/bin/pip3';

execSync(`${pythonCommand} -m venv .venv`, { stdio: 'inherit' });
execSync(`${pipCommand} install -r requirements.txt`, { stdio: 'inherit' });
