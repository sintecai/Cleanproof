# Restore this delivery

Extract the ZIP. The source tree is the delivery commit; DELIVERY-COMMIT.txt identifies it. The archive excludes runtime databases, private credentials, dependencies and generated builds.

To inspect preserved history without overwriting files:

    git clone history.bundle cleanproof-history
    cd cleanproof-history
    git switch release/final-publishing-package
    git log -5 --oneline

Use git bundle verify history.bundle from an existing Git repository to verify bundle structure. The bundle contains the available delivery branch and recovered deployed main history, not unrelated branches. This does not restore any unavailable customer/device keys or databases.

Install locked dependencies with Node24 using npm ci and npm ci --prefix backend. Read README.md and release/STORE-PREPARATION.md before configuring environments. Never copy actual .env files, signing keys or customer backups into this repository. No store upload has happened.

The source input also had remote-tracking refs, including the deployed public-showcase commit. They are retained under refs/archive/input/ in this bundle so cloning one branch does not discard them. After the clone above, preserve those extra refs explicitly:

    git fetch ../history.bundle 'refs/archive/input/*:refs/archive/input/*'
    git for-each-ref refs/archive/input/

This is local history restoration only, not a push to GitHub and not a deployment. Do not force-push or replace unrelated remote work.
