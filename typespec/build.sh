#!/bin/bash

set -eu

rm -rf tsp-output
npx tsp compile .

mkdir -p tsp-output/typescript

for f in tsp-output/schema/openapi.*.yaml; do
  out=$(echo $f | sed 's/.*\/openapi\.\(.*\)\.yaml$/\1.d.ts/')
  npx openapi-typescript $f -o tsp-output/typescript/$out
done
