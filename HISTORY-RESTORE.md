# Restore the available Git history

The archive contains the full source tree and cleanproof-history.bundle. It deliberately excludes a raw .git directory and remote credentials. The bundle includes the authoritative deployed application's available history and this delivery branch. SOURCE-COMMIT.txt records the exact delivery commit and branch.

From the extracted CleanProof folder:

```sh
git bundle verify cleanproof-history.bundle
git clone --branch fix/signup-policy-layout cleanproof-history.bundle ../CleanProof-with-history
cd ../CleanProof-with-history
git log -5 --oneline
git status --short
npm ci
npm ci --prefix backend
```

A standalone `git bundle verify` requires a Git repository; if the extracted directory is not a repository, run `git init` there first (no files are removed), or clone first and run verification from the cloned checkout. Compare HEAD with SOURCE-COMMIT.txt. The ZIP source manifest includes file hashes; delivery evidence outside the commit is under delivery-evidence/. The bundle and SOURCE-COMMIT are generated after commit and therefore not themselves tracked in that commit.

Baseline: 148cd2085a354f9fce3818e01ec3c5c4a2cc9564, deployed Site version 14, 34 available commits. Prior documentation-only local commits 46d19d7 and 3c962ae were not pushed and their objects were pruned; they cannot be claimed preserved or fabricated with the original hashes. Their observed results are restored in current documentation. This delivery preserves all recovered application history and explicitly records that gap. GitHub sintecai/Cleanproof was inspected on 26 October: size 0; no newer application history was available there.

Do not force-push or overwrite an existing remote. Inspect its current history, use a feature branch/review, and retain Sicy International Ltd proprietary ownership. No upload to GitHub is claimed by this source ZIP delivery.
