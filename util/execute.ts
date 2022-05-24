export async function executeInDir(cwd: string, cmd: string[], verbose?: boolean): Promise<string> {
	if (verbose) {
		console.group('$', cmd.join(' '));
	}
	const p = Deno.run({
		cmd: cmd,
		cwd: cwd,
		stdout: 'piped',
		stderr: 'piped',
		stdin: 'null',
	});
	const out = new TextDecoder().decode(await p.output());
	p.close();
	p.stderr.close();
	if (verbose) {
		console.log(out);
		console.groupEnd();
	}
	return out;
}
