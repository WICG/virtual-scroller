#!/bin/bash -e
#
# @license
# Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
# This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
# The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
# The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
# Code distributed by Google as part of the polymer project is also
# subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
#
# Based on https://github.com/Polymer/tools/blob/master/bin/gp.sh

# This script pushes a demo-friendly version of your element and its
# dependencies to gh-pages.

# Run in a clean directory passing in a GitHub org and repo name
org="PolymerLabs"
repo="virtual-list"

rm -rf $repo
mkdir $repo
git clone https://github.com/$org/$repo.git --single-branch
# switch to gh-pages branch
pushd $repo >/dev/null
git checkout --orphan gh-pages
# remove all content
rm .gitignore
rm deploy-to-gh-pages.sh
npm install

# send it all to github
git add -A .
git commit -am 'seed gh-pages'
git push -u origin gh-pages --force

popd >/dev/null
rm -rf $repo