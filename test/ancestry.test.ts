import * as path from 'path';
import { assertEquals } from 'testing/asserts';

import { getCommitAncestry, getCommitList } from '../mod.ts';
import { executeInDir } from '../util/execute.ts';

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

/**
 * Create a repository with the following history by checking out a feature branch mid-way and
 * cherry-picking it again later;
 *
 *   Commit 1
 *     ↓
 *   Commit 3
 *     ↓
 *   Commit 2
 */
async function createRepoWithCommitsInReverseOrder(location: string) {
	await executeInDir(path.dirname(location), ['mkdir', path.basename(location)]);
	await executeInDir(location, ['git', 'init']);
	await executeInDir(location, ['git', 'checkout', '-b', 'alpha']);

	await Deno.writeTextFile(path.join(location, 'data-1.txt'), 'revision 1');
	await executeInDir(location, ['git', 'add', '.', '-A']);
	await executeInDir(location, ['git', 'commit', '-m', 'Commit #1', '--date', '3 minutes ago']);

	await executeInDir(location, ['git', 'checkout', '-b', 'beta']);
	await Deno.writeTextFile(path.join(location, 'data-2.txt'), 'revision 1');
	await executeInDir(location, ['git', 'add', '.', '-A']);
	await executeInDir(location, ['git', 'commit', '-m', 'Commit #2', '--date', '2 minutes ago']);

	await executeInDir(location, ['git', 'checkout', 'alpha']);
	await Deno.writeTextFile(path.join(location, 'data-1.txt'), 'revision 2');
	await executeInDir(location, ['git', 'add', '.', '-A']);
	await executeInDir(location, ['git', 'commit', '-m', 'Commit #3', '--date', '1 minutes ago']);

	await executeInDir(location, ['git', 'cherry-pick', 'beta']);

	return {
		destroy: async () =>
			await executeInDir(path.dirname(location), ['rm', '-rf', path.basename(location)]),
	};
}

Deno.test('Find the correct commit ancestry', async () => {
	const location = path.join(__dirname, 'scaffolded-test-repo-1');
	const { destroy } = await createRepoWithCommitsInReverseOrder(location);
	const commits = await getCommitList(location);
	const ancestry = getCommitAncestry(commits, commits[0]);
	await destroy();

	assertEquals(
		ancestry.map((commit) => commit.text),
		['Commit #2', 'Commit #3', 'Commit #1'],
	);
});
