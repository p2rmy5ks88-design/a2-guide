#!/usr/bin/env bash
# Least-privilege migration for the default service accounts of eko-estates. Run in Cloud Shell by the owner.
# Usage: bash iam-least-privilege.sh stage-a | stage-b | rollback-a | rollback-b | show
# Evidence (read-only audit, 6 Nov 2026): skylineCompetition and skylinePlayer RUN as their own custom accounts;
# both are BUILT by the default compute account; no App Engine app, no Cloud Scheduler jobs, nothing runs as the
# App Engine default account. Firebase deploys only need ActAs on it (already granted to the deployer).
set -euo pipefail
P=eko-estates; PN=668368365590
COMPUTE=$PN-compute@developer.gserviceaccount.com; APPSPOT=$P@appspot.gserviceaccount.com
roles(){ gcloud projects get-iam-policy $P --flatten=bindings --filter="bindings.members:serviceAccount:$1" --format="value(bindings.role)"; }
case "${1:-show}" in
  show) echo "compute: $(roles $COMPUTE | tr '\n' ' ')"; echo "appspot: $(roles $APPSPOT | tr '\n' ' ')";;
  stage-a) # builds: grant the minimal Cloud Build builder role FIRST, then remove Editor from the compute account
    gcloud projects add-iam-policy-binding $P --member=serviceAccount:$COMPUTE --role=roles/cloudbuild.builds.builder --condition=None >/dev/null
    gcloud projects remove-iam-policy-binding $P --member=serviceAccount:$COMPUTE --role=roles/editor --condition=None >/dev/null
    echo "stage-a applied. compute: $(roles $COMPUTE | tr '\n' ' ')";;
  rollback-a) gcloud projects add-iam-policy-binding $P --member=serviceAccount:$COMPUTE --role=roles/editor --condition=None >/dev/null; echo "Editor restored on compute";;
  stage-b) # nothing runs as the App Engine default account: remove Editor (ActAs grants for deploys stay)
    gcloud projects remove-iam-policy-binding $P --member=serviceAccount:$APPSPOT --role=roles/editor --condition=None >/dev/null
    echo "stage-b applied. appspot: $(roles $APPSPOT | tr '\n' ' ')";;
  rollback-b) gcloud projects add-iam-policy-binding $P --member=serviceAccount:$APPSPOT --role=roles/editor --condition=None >/dev/null; echo "Editor restored on appspot";;
  *) echo "usage: stage-a|stage-b|rollback-a|rollback-b|show"; exit 2;;
esac
