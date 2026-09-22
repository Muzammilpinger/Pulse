# Raw Kubernetes reference

`pulse.yaml` is the rendered default chart for learning and review. It is not an independently maintained deployment. Regenerate with:

```sh
helm template pulse deploy/helm/pulse -n pulse > deploy/raw/pulse.yaml
```

The namespace and `pulse-secrets` must already exist. For reproducible startup use the Helm path in the root runbook; do not apply the raw file and Helm-manage the same resources simultaneously.
