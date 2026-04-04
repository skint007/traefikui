#!/usr/bin/env bash
set -euo pipefail

USAGE="Usage: ./release.sh <major|minor|patch|VERSION>"

if [[ $# -ne 1 ]]; then
    echo "$USAGE"
    exit 1
fi

# Ensure working tree is clean
if [[ -n "$(git status --porcelain)" ]]; then
    echo "Error: Working tree is not clean. Commit or stash changes first."
    exit 1
fi

# Read current version from package.json
current=$(grep -oP '"version":\s*"\K[0-9]+\.[0-9]+\.[0-9]+' package.json)
if [[ -z "$current" ]]; then
    echo "Error: Could not read current version from package.json"
    exit 1
fi

IFS='.' read -r major minor patch <<< "$current"

case "$1" in
    major) new="$((major + 1)).0.0" ;;
    minor) new="${major}.$((minor + 1)).0" ;;
    patch) new="${major}.${minor}.$((patch + 1))" ;;
    *)
        if [[ ! "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "Error: Invalid version '$1'. Use major, minor, patch, or a semver like 1.2.3."
            exit 1
        fi
        new="$1"
        ;;
esac

if [[ "$new" == "$current" ]]; then
    echo "Error: New version ($new) is the same as current version."
    exit 1
fi

tag="v${new}"

if git rev-parse "$tag" >/dev/null 2>&1; then
    echo "Error: Tag $tag already exists."
    exit 1
fi

echo "Releasing: $current -> $new ($tag)"

# Update version in package.json
sed -i "s/\"version\": \"${current}\"/\"version\": \"${new}\"/" package.json

# Commit and tag
git add package.json
git commit -m "Release $tag"
git tag -a "$tag" -m "Release $tag"

# Push commit and tag
git push
git push origin "$tag"

echo "Done! Released $tag"
