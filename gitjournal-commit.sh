#!/bin/bash
command="git commit"
line=1

echo "Dont forget to git add"

# --- Commit name ---
read -p "Commit name: " name
command+=" -m \"$name\""

# --- Duration calculation ---
commitTime=$(git log -1 --format="%at")
time=$(date +%s)

duration=$(( (time - commitTime) / 60 ))  # convert seconds → minutes

read -p "Commit duration: $duration min. Is this correct ? (Y/n) " changeDuration
changeDuration=${changeDuration:-y}

if [[ "$changeDuration" != "y" && "$changeDuration" != "Y" ]]; then
    read -p "New commit duration (+/-value or absolute): " newDuration

    # If the user typed +X or -X
    if [[ "$newDuration" =~ ^\+[0-9]+$ ]]; then
        duration=$(( duration + ${newDuration:1} ))
    elif [[ "$newDuration" =~ ^-[0-9]+$ ]]; then
        duration=$(( duration - ${newDuration:1} ))
    elif [[ "$newDuration" =~ ^[0-9]+$ ]]; then
        duration=$newDuration
    else
        echo "Invalid duration format."
        exit 1
    fi
fi

echo "Final duration: $duration"

# --- Status ---
read -p "Commit status: " status
command+=" -m \"[$duration] [$status]\""

# --- Project ---
read -p "Do you want to add a project (name of the project/N): " addProject
addProject=${addProject:-n}
if [[ ! "$addProject" =~ ^[nN]$ ]]; then
	command+=" -m \"{$addProject}\""
fi

# --- Description (optional) ---
read -p "Do you want to add a description (y/N): " addDescription
addDescription=${addDescription:-n}

if [[ "$addDescription" =~ ^[yY]$ ]]; then
    while [[ "$addDescription" =~ ^[yY]$ ]]; do
        read -p "Line $line of the description: " desc
        command+=" -m \"$desc\""
        ((line++))
        read -p "Add another line? (Y/n): " addDescription
		addDescription=${addDescription:-y}
    done
fi

command+=" --allow-empty"

echo "$command"
eval "$command"

echo ""
echo "If mistake:"
echo "  git reset --soft HEAD~1 to delete last commit"
echo "  git commit --rebase to modify last commit"