#!/usr/bin/env bash
# Optional local portfolio lab. Install only into the dedicated Pulse kind cluster.
set -euo pipefail
context=kind-pulse-demo
kubectl --context "$context" get nodes
helm repo add traefik https://traefik.github.io/charts
helm repo add kyverno https://kyverno.github.io/kyverno
helm repo update
helm upgrade --install traefik traefik/traefik --version 41.6.0 --kube-context "$context" -n ingress-system --create-namespace --set service.spec.type=ClusterIP --set providers.kubernetesIngress.publishedService.enabled=false --set providers.kubernetesIngress.ingressEndpoint.ip=127.0.0.1 --wait
helm upgrade --install kyverno kyverno/kyverno --version 3.9.1 --kube-context "$context" -n kyverno --create-namespace --wait
kubectl --context "$context" apply -f https://github.com/bitnami/sealed-secrets/releases/download/v0.40.0/controller.yaml
kubectl --context "$context" apply -f https://github.com/kubernetes-sigs/metrics-server/releases/download/v0.8.0/components.yaml
# Self-signed kubelet certificates are a local kind-only exception.
kubectl --context "$context" -n kube-system patch deployment metrics-server --type=json -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
kubectl --context "$context" create namespace argocd --dry-run=client -o yaml | kubectl --context "$context" apply -f -
kubectl --context "$context" apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/v3.5.3/manifests/install.yaml
kubectl --context "$context" apply -f deploy/policies/require-resources.yaml
printf '\nInstall kubeseal v0.40.0, run scripts/seal-demo-secret.py, then apply deploy/argocd/application.yaml and manually sync after reviewing the pinned images.\n'
