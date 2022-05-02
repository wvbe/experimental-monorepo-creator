export async function executeInDir(cwd: string, cmd: string[]): Promise<string> {
	console.log('Nerf!', cmd);
	const p = Deno.run({
		cmd: cmd,
		cwd: cwd,
		stdout: 'piped',
		stderr: 'piped',
		stdin: 'null'
	});
	return new TextDecoder().decode(await p.output());
}
