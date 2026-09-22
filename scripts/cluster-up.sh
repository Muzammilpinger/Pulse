#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
cluster=pulse-demo
kind get clusters | grep -qx "$cluster" || kind create cluster --name "$cluster" --config deploy/kind/cluster.yaml
image_tag="local-$(date +%s)"
for service in gateway client signaling; do
  docker build -t "pulse-$service:$image_tag" "$service"
  kind load docker-image "pulse-$service:$image_tag" --name "$cluster"
done
kubectl --context "kind-$cluster" create namespace pulse --dry-run=client -o yaml | kubectl --context "kind-$cluster" apply -f -
kubectl --context "kind-$cluster" label namespace pulse pod-security.kubernetes.io/enforce=restricted --overwrite
if ! kubectl --context "kind-$cluster" -n pulse get secret pulse-secrets >/dev/null 2>&1; then
  session_secret=$(openssl rand -hex 32)
  db_password=$(openssl rand -hex 20)
  kubectl --context "kind-$cluster" -n pulse create secret generic pulse-secrets \
    --from-literal="session-secret=$session_secret" \
    --from-literal="postgres-password=$db_password" \
    --from-literal="database-url=postgresql+asyncpg://pulse:$db_password@postgres:5432/pulse"
fi
helm upgrade --install pulse deploy/helm/pulse --kube-context "kind-$cluster" -n pulse --set "images.gateway=pulse-gateway:$image_tag" --set "images.client=pulse-client:$image_tag" --set "images.signaling=pulse-signaling:$image_tag" --wait --timeout 5m
kubectl --context "kind-$cluster" -n pulse get pods
printf '\nOpen the app: kubectl --context kind-pulse-demo -n pulse port-forward svc/client 8088:8080\n'
