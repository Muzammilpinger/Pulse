#!/usr/bin/env bash
set -euo pipefail
context=kind-pulse-demo
for deployment in gateway signaling; do
  kubectl --context "$context" -n pulse rollout status "deployment/$deployment" --timeout=180s
done
# These checks are observations, not assumed from the manifests.
kubectl --context "$context" -n pulse exec deployment/gateway -- python -c 'import socket; s=socket.socket(); s.settimeout(3); code=s.connect_ex(("redis",6379)); print("gateway -> redis:",code); assert code == 0'
kubectl --context "$context" -n pulse exec deployment/signaling -- python -c 'import socket; s=socket.socket(); s.settimeout(3); code=s.connect_ex(("redis",6379)); print("signaling -> redis:",code); assert code != 0'
if kubectl --context "$context" auth can-i get secrets --as=system:serviceaccount:pulse:pulse -n pulse; then
  echo 'FAIL: application service account can read secrets'; exit 1
fi
printf 'PASS: allowed path works, forbidden path fails, application cannot read secrets.\n'
