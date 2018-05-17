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
org="valdrinkoshi"
repo="virtual-scroller"
branch="master" # default to master when branch isn't specified

# make folder (same as input, no checking!)
rm -rf $repo
mkdir $repo
git clone https://github.com/$org/$repo.git --single-branch

# switch to gh-pages branch
pushd $repo >/dev/null
git checkout --orphan gh-pages

# remove all content
git rm -rf -q .

# use npm to install runtime deployment
# copy the package.json from master here, remove module name so
# we can install it
git show ${branch}:package.json | sed /\"$repo\"/d > package.json

# install the npm deps and also this repo so we can copy the demo
npm install
npm install $org/$repo#$branch

# Manual copy of demo dependencies.
mkdir components
mv node_modules/lit-html components/
mv node_modules/preact components/
mv node_modules/streaming-spec components/
# replace node_modules/ with components/
find node_modules/$repo -name '*.js' -exec sed -i '' 's/node_modules\//components\//g' {} \;
mv node_modules/$repo/* .
rm -rf node_modules/

# Allow github to use README.md as main page.

# send it all to github
git add -A .
git commit -am 'seed gh-pages'
git push -u origin gh-pages --force

popd >/dev/null
rm -rf $repo