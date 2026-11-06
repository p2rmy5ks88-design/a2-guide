#!/usr/bin/env bash
# Run in Google Cloud Shell (project eko-estates) by the project owner. No keys are created or printed.
#  1. deploys ONLY the isolated competition function from the latest main (Living City online stays off);
#  2. creates keyless GitHub -> Google deployment (Workload Identity Federation) limited to
#     p2rmy5ks88-design/a2-guide on refs/heads/main, impersonating a deploy-only service account.
set -euo pipefail
P=eko-estates; REPO=p2rmy5ks88-design/a2-guide; POOL=github; PROV=a2-guide; DEP=skyline-competition-deployer
RUNTIME=skyline-competition@$P.iam.gserviceaccount.com
gcloud config set project $P >/dev/null
PN=$(gcloud projects describe $P --format='value(projectNumber)')

echo "== 1/2 Deploy the competition backend from main"
rm -rf ~/skyline-deploy && git clone --depth 1 https://github.com/$REPO ~/skyline-deploy
cd ~/skyline-deploy/skyline-estates
node tests/competition-service.cjs | tail -1
node security/service/ruleset.test.cjs
cd competition-functions && npm install --no-audit --no-fund >/dev/null
npx --yes firebase-tools@latest deploy --non-interactive --project $P --config firebase.json --only functions:skyline-competition
curl -s https://europe-west1-eko-estates.cloudfunctions.net/skylineCompetition/v1/competition/capabilities | python3 -c 'import json,sys;x=json.load(sys.stdin);print("capabilities rulesets:",x.get("rulesets"))'

echo "== 2/2 Keyless GitHub deployment connection"
gcloud iam workload-identity-pools describe $POOL --location=global >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools create $POOL --location=global --display-name="GitHub Actions"
gcloud iam workload-identity-pools providers describe $PROV --location=global --workload-identity-pool=$POOL >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools providers create-oidc $PROV --location=global --workload-identity-pool=$POOL \
    --display-name="a2-guide main" --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition="assertion.repository=='$REPO' && assertion.ref=='refs/heads/main'"
gcloud iam service-accounts describe $DEP@$P.iam.gserviceaccount.com >/dev/null 2>&1 || \
  gcloud iam service-accounts create $DEP --display-name="Skyline competition deployer (GitHub, deploy only)"
SA=$DEP@$P.iam.gserviceaccount.com
for R in roles/cloudfunctions.developer roles/run.admin roles/artifactregistry.writer roles/cloudbuild.builds.editor roles/firebase.viewer roles/serviceusage.serviceUsageConsumer; do
  gcloud projects add-iam-policy-binding $P --member="serviceAccount:$SA" --role=$R --condition=None >/dev/null; done
# may act as the function runtime identity and the default build identity only
gcloud iam service-accounts add-iam-policy-binding $RUNTIME --member="serviceAccount:$SA" --role=roles/iam.serviceAccountUser >/dev/null
gcloud iam service-accounts add-iam-policy-binding $PN-compute@developer.gserviceaccount.com --member="serviceAccount:$SA" --role=roles/iam.serviceAccountUser >/dev/null
# the Firebase CLI also checks ActAs on the App Engine default identity
gcloud iam service-accounts add-iam-policy-binding $P@appspot.gserviceaccount.com --member="serviceAccount:$SA" --role=roles/iam.serviceAccountUser >/dev/null
gcloud iam service-accounts add-iam-policy-binding $SA --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$PN/locations/global/workloadIdentityPools/$POOL/attribute.repository/$REPO" >/dev/null
echo
echo "Set these two GitHub repository VARIABLES (Settings > Secrets and variables > Actions > Variables). They are not secrets:"
echo "SKYLINE_COMPETITION_WIF_PROVIDER = projects/$PN/locations/global/workloadIdentityPools/$POOL/providers/$PROV"
echo "SKYLINE_COMPETITION_SERVICE_ACCOUNT = $SA"
