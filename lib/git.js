async function* gitCommandGenerator(sourceDir, command, args) {
    const gitProcess = spawn(command, [...args], { cwd: sourceDir });

    let buffer = '';

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
    const modified = []; //modified but not commited 'git diff --name-status'

    for await (const line of gitCommandGenerator(sourceDir, 'git', ['ls-files', '--others', '--exclude-standard'])) {
        if (line) untracked.push(line);
    }

    return { untracked, modified }
}


module.exports = { getGitStatus }