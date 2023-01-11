# Just for me as a reminder

* create a branch vx.y.z
* eventually create sub-branches and merge them into vx.y.z
* create a PR
  * triggers validate-pull-request git action (lint, build and test)
  * merge if it succeeded
* run 'npm run bump [patch|minor|major]
  * runs test and lint
  * sets the new version, creates a tag, commits and pushes to github
  * travis will lint, test, build and report code-coverage to coveralls
* create a release in github from the tag
  * triggers npm-publish github action (test, lint, npm publish)

