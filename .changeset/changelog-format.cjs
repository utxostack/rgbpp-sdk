// @ts-check
/**
 * Based on the following format:
 * - https://github.com/changesets/changesets/blob/main/packages/changelog-github/src/index.ts
 * - https://github.com/stylelint/stylelint/blob/main/.changeset/changelog-stylelint.cjs
 */

const { getInfo, getInfoFromPullRequest } = require('@changesets/get-github-info');

/**
 * @type {import('@changesets/types').ChangelogFunctions}
 */
const changelogFunctions = {
  async getReleaseLine(changeset, _type, options) {
    if (!options || !options.repo) {
      throw new Error(
        'Please provide a repo to this changelog generator like this:\n"changelog": ["@changesets/changelog-github", { "repo": "org/repo" }]',
      );
    }

    /**
     * @type {number | undefined}
     */
    let prFromSummary;
    /**
     * @type {string | undefined}
     */
    let commitFromSummary;
    /**
     * @type {string[]}
     */
    let usersFromSummary = [];

    const replacedChangelog = changeset.summary
      .replace(/^\s*(?:pr|pull|pull\s+request):\s*#?(\d+)/im, (_, pr) => {
        let num = Number(pr);
        if (!isNaN(num)) {
          prFromSummary = num;
        }
        return '';
      })
      .replace(/^\s*commit:\s*([^\s]+)/im, (_, commit) => {
        commitFromSummary = commit;
        return '';
      })
      .replace(/^\s*(?:author|user):\s*@?([^\s]+)/gim, (_, user) => {
        usersFromSummary.push(user);
        return '';
      })
      .trim();

    const [firstLine, ...futureLines] = replacedChangelog
      .split('\n')
      .map((l) => l.trimRight());

    const links = await (async () => {
      if (prFromSummary !== undefined) {
        let { links } = await getInfoFromPullRequest({
          repo: options.repo,
          pull: prFromSummary,
        });
        if (commitFromSummary) {
          const shortCommitId = commitFromSummary.slice(0, 7);
          links = {
            ...links,
            commit: `[\`${shortCommitId}\`](https://github.com/${options.repo}/commit/${commitFromSummary})`,
          };
        }
        return links;
      }
      const commitToFetchFrom = commitFromSummary || changeset.commit;
      if (commitToFetchFrom) {
        let { links } = await getInfo({
          repo: options.repo,
          commit: commitToFetchFrom,
        });
        return links;
      }
      return {
        commit: null,
        pull: null,
        user: null,
      };
    })();

    const users = usersFromSummary.length
      ? usersFromSummary
        .map((userFromSummary) => `[@${userFromSummary}](https://github.com/${userFromSummary})`)
        .join(', ')
      : links.user;

    const pull = links.pull !== null ? links.pull : '';
    const commit = links.commit !== null ? links.commit : '';
    const prefix = pull || commit ? `${pull || commit}:` : '';
    const mention = users !== null ? `(${users})` : users;
    const fullFirstLine = `${prefix} ${firstLine} ${mention}`;
    const futureLinesText = futureLines.map((l) => `  ${l}`).join('\n');

    return `\n\n - ${fullFirstLine}\n${futureLinesText}`;
  },
  async getDependencyReleaseLine(changesets, deps, options) {
    if (!options.repo) {
      throw new Error(
        'Please provide a repo to this changelog generator like this:\n"changelog": ["@changesets/changelog-github", { "repo": "org/repo" }]',
      );
    }
    if (deps.length === 0) {
      return '';
    }

    const commits = Promise.all(
      changesets.map(async (cs) => {
        if (cs.commit) {
          let { links } = await getInfo({
            repo: options.repo,
            commit: cs.commit,
          });
          return links.commit;
        }
      }),
    );

    const changesetLink = `- Updated dependencies [${commits.join(', ')}]:`;
    const updatedDeps = deps.map((dep) => `  - ${dep.name}@${dep.newVersion}`);

    return [changesetLink, ...updatedDeps].join('\n');
  },
};

module.exports = changelogFunctions;
