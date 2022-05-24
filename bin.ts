import { getCommitAncestry, getCommitList } from './mod.ts';

const commits = await getCommitList(Deno.cwd());
console.log(getCommitAncestry(commits, commits[0]));
