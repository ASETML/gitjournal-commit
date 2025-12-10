# gitjournal-commit
A bash script to create commit that respect etml-inf/gitjournal commit convention to get an easy jdt

## Todo:
- Binary
- Documentation

## How to use
You should first stage the changes to be commited with git add.
After cloning this repo, execute the script with `source gitjournal-commit.sh` in a git bash. This command execute the script without the need to clone the repository: `bash <(curl -s https://raw.githubusercontent.com/ASETML/gitjournal-commit/main/gitjournal-commit.sh)` <br>
You will then be prompted several things:
- The commit name: feat(a): do b
- If the auto-calculated duration is correct: if you answer no, you have the possibility to change it. You can either:
	- Enter an absolute value: for example it is the first commit of the day: 30
	- Enter time to substract: for example to remove break time: -15
	- Enter time to add: for example to round up: +3
- The status of the commit: Usually `Done` or `WIP` (can also use default value in `config.yml`)
- The project name: Either you enter a project name or enter `n` not to add one (can also use default value in `config.yml`)
- If you want to add a description. If the answer is yes, you will be asked if you want to add another line after every description line added.

Please note that commit can be empty, so here is some useful commands if you made a mistake:
- `git reset --soft HEAD~1` to delete last commit
- `git commit --ammend` to modify last commit
