#!/usr/bin/env bash
# Creates the dedicated, keyless runtime identity for skylinePlayer (RELEASE-PREFLIGHT.md §G).
# Run in Cloud Shell as the project Owner, ONLY after the owner has approved the grants below.
# Safe to re-run. Changes nothing on the default compute service account.
set -euo pipefail
P=eko-estates
SA=skyline-player@$P.iam.gserviceaccount.com
gcloud config set project "$P" >/dev/null
gcloud iam service-accounts describe "$SA" >/dev/null 2>&1 || \
  gcloud iam service-accounts create skyline-player --display-name="Skyline player service runtime"
gcloud iam roles describe skylineAuthUserRemover --project="$P" >/dev/null 2>&1 || \
  gcloud iam roles create skylineAuthUserRemover --project="$P" --title="Skyline Auth User Remover" \
    --description="Read and delete Firebase Auth users (revocation checks, account removal)" \
    --permissions=firebaseauth.users.get,firebaseauth.users.delete --stage=GA
for ROLE in roles/datastore.user projects/$P/roles/skylineAuthUserRemover roles/logging.logWriter roles/monitoring.metricWriter; do
  gcloud projects add-iam-policy-binding "$P" --member="serviceAccount:$SA" --role="$ROLE" --condition=None >/dev/null
  echo "granted $ROLE"
done
for S in SKYLINE_APPLE_IAP_KEY SKYLINE_APPLE_IAP_KEY_ID SKYLINE_APPLE_IAP_ISSUER_ID; do
  gcloud secrets add-iam-policy-binding "$S" --member="serviceAccount:$SA" --role=roles/secretmanager.secretAccessor >/dev/null
  echo "granted secretAccessor on $S"
done
echo "Done. Next: deploy the reviewed function (DEPLOY.md), then run the checks in RELEASE-PREFLIGHT.md §G."
