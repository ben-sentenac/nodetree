const { spawn, spawnSync } = require('node:child_process');
const colors = require('./colors');

async function* gitCommandGenerator(sourceDir, command, args) {
    const gitProcess = spawn(command, [...args], { cwd: sourceDir });
    let buffer = '';

    gitProcess.on('error', (error) => {
        if (error.code === 'EACCES') {
            console.error(`Permission denied: Cannot execute ${command}.`);
            //exit process for security reason 
            process.exit(1);
        } else {
            console.error(`Failed to start process: ${error.message}`);
        }
    });

    gitProcess.stderr.on('data', (data) => {
        console.error(`Error output from ${command}: ${data.toString()}`);
    });

    for await (const chunk of gitProcess.stdout) {
        buffer += chunk.toString();
        // Process each line separately
        let lines = buffer.split('\n');
        buffer = lines.pop();// Save any incomplete line back to buffer

        for (const line of lines) {
            yield line.trim();
        }
    }
    if (buffer.length > 0) {
        yield buffer.trim(); // Yield the last buffered line if it's not empty
    }


}


async function getGitStatus(sourceDir) {

    //TODO add color or legend on to untracked and modified
    const untracked = []; //untracked file  git ls-files . --exclude-standard --others

    try {
        //untracked
        for await (const line of gitCommandGenerator(sourceDir, 'git', ['ls-files', '--others', '--exclude-standard'])) {
            if (line) {
                untracked.push(line);
            }
        }

    } catch (error) {
        if (error === 'EACCES') {
            console.warn('forbidden directory', sourceDir)
        } else {
            throw error;
        }
    }


    return { untracked }
}

function setGitIndicator(file, gitStatus) {
    // Check if the file is in the modified list
   if (gitStatus?.untracked.includes(file)) {
       return colors.RESET + ' # Untracked file';
   }

   return '';
}



module.exports = { getGitStatus,setGitIndicator }