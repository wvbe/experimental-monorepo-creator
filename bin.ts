import { executeInDir } from './util/execute.ts';

type CommitHash = string;
type CommitInfo = {
	hash: CommitHash;
	parents: CommitHash[];
	text: string;
	author: {
		name: string;
		email: string;
		date: Date;
	};
	committer: {
		name: string;
		email: string;
		date: Date;
	};
};

type RichCommitInfo = {
	parents: RichCommitInfo[];
	children: RichCommitInfo[];
}&Omit<CommitInfo, 'parents'>;

const COMMIT_DELINEATION = '#+-=+-=+-=+-=+-=+-=+-=+-=+-=+-=+-=+-=+-=+-=+-=+-=+-=+-=+-=#';

async function getCommitList(cwd: string) {
	const format = [
		'%P', // The parent commit
		'%an', // author name
		'%ae', // author email
		'%at', // author time
		'%cn', // committer name
		'%ce', // committer email
		'%ct', // commit timestamp
		'%B', // Subject line (unsanitized),
		COMMIT_DELINEATION
	];
	const result = await executeInDir(cwd, [
		'git',
		'rev-list',
		'--remotes',
		`--format=${format.join('\n')}`
	]);
	return result
		.substring(0, result.length - COMMIT_DELINEATION.length - 1)
		.split(COMMIT_DELINEATION)
		.map(str => str.trim().split('\n'))
		.map(
			([
				commit,
				parents,
				authorName,
				authorEmail,
				authorTimestamp,
				committerName,
				committerEmail,
				committerTimestamp,
				...text
			]): CommitInfo => ({
				hash: commit.substring('commit '.length),
				parents: parents.split(' ').filter(Boolean),
				text: text.join('\n'),
				author: {
					name: authorName,
					email: authorEmail,
					date: new Date(parseInt(authorTimestamp, 10) * 1000)
				},
				committer: {
					name: committerName,
					email: committerEmail,
					date: new Date(parseInt(committerTimestamp, 10) * 1000)
				}
			})
		);
}

function sortByCommitDate(a: CommitInfo, b: CommitInfo) {
	return b.author.date.getTime() - a.author.date.getTime();
}
function getCommitAncestry(list: CommitInfo[], end: CommitInfo) {
	const map = new Map<string, CommitInfo>();
	list.forEach(commit => {
		map.set(commit.hash, commit);
	});

	const collected = [end];
	const single: CommitInfo[] = [];

	function pickNextCommit() {
		collected.sort(sortByCommitDate);
		const next = collected.shift();
		if (!next) {
			return false;
		}
		single.push(next);
		collected.unshift(...next.parents.map(parent => map.get(parent)).filter((commit): commit is CommitInfo => Boolean(commit)).filter(commit => !single.includes(commit) && !collected.includes(commit)));
		return true;
	}

	while (pickNextCommit()) {
		const last = single[single.length - 1];
		const lastlast = single[single.length - 2];
		console.log([
			last.hash,
			last.author.date.toISOString(),
			(last.committer.date.getTime() !== last.author.date.getTime() ? ' *' : ''),
			(lastlast && lastlast.committer.date.getTime() < last.committer.date.getTime() ? ' <--' : ''),
			// last.text
		].join('\t'));
	}
}

function getCommitTree(list: CommitInfo[]) {
	const map = new Map<string, CommitInfo>();
	const children = new Map<string, string[]>();
	list.forEach(commit => {
		map.set(commit.hash, commit);
		commit.parents.forEach(parent => {
			const childs = children.get(parent) || [];
			childs.push(commit.hash);
			children.set(parent, childs);
		});
	});

	const seen: string[] = [];
	const queue = list
		.filter(commit => !commit.parents.length);

	let commit: CommitInfo | undefined;
	while (commit = queue.shift()) {
		if (seen.includes(commit?.hash)) {
			console.log(`> Seen ${commit.hash}`);
			continue;
		}
		seen.push(commit.hash);
		const children = commit.parents.map(hash => map.get(hash) as CommitInfo)
	}
	console.log('End of loop');

	return
		// .map(function recurse(commit): RichCommitInfo {
		// 	const richCommit = {
		// 		...commit,
		// 		parents: commit.parents.map(hash => map.get(hash) as CommitInfo).map(recurse),
		// 		children: (children.get(commit.hash) || []).map(hash => map.get(hash) as CommitInfo).map(recurse)
		// 	};
		// 	return richCommit;
		// });
}

const commits = await getCommitList(Deno.cwd());
getCommitAncestry(commits, commits[0]);