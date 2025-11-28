# gitjournal-commit
A bash script to create commit that respect etml-inf/gitjournal commit convention to get an easy jdt

## Todo:
- Binary
- Documentation

## 📘 How to Use This Commit Helper Script

This Bash script simplifies your Git commit workflow by interactively building a structured commit message that includes:

A commit title

Time spent since the last commit (auto-calculated, editable)

A status tag

An optional project tag

Optional multi-line description

It then runs git commit with all these components included.

### 🚀 1. Save the Script

Save the script into a file:

nano git-helper.sh


Make it executable:

chmod +x git-helper.sh

### 📂 2. Use It Inside a Git Repository

Before running the script, stage your changes:

git add .


or manually:

git add <files>


Run the script:

./git-helper.sh

### 🖥️ 3. Interactive Steps

The script will guide you through several prompts:

① Commit Name

You will be asked for the main commit message title:

Commit name: Fix login redirect bug

② Auto Duration Calculation

The script calculates the minutes since your last commit:

Commit duration: 42 min. Is this correct ? (Y/n)


Press Enter if correct.

Type n to change it manually:

Absolute value: 30

Add minutes: +5

Subtract minutes: -10

③ Commit Status

Add a short status tag (e.g., done, wip, fix):

Commit status: fix


This produces a segment like:

[42] [fix]

④ Project Tag (optional)
Do you want to add a project (name of the project/N):


Enter a project name or press Enter / N to skip.

⑤ Description (optional, multi-line)

You can add one or multiple description lines:

Do you want to add a description (y/N): y
Line 1 of the description: Adjusted redirect logic
Add another line? (Y/n): y
Line 2 of the description: Updated unit tests
Add another line? (Y/n): n

### 📦 4. Final Commit

The script prints the final command:

git commit -m "Fix login redirect bug" -m "[42] [fix]" -m "{myProject}" -m "Adjusted redirect logic" -m "Updated unit tests" --allow-empty


It then executes it automatically.

### 🔄 5. If You Make a Mistake

Undo the last commit but keep your changes:

git reset --soft HEAD~1


Edit (rebuild) the last commit:

git commit --rebase

### ✔️ Summary

This script helps you:

Create consistent commit messages

Track time between commits

Tag commits with status and project

Add rich multi-line descriptions

Avoid forgetting git add

Perfect for structured workflows and personal productivity tracking.