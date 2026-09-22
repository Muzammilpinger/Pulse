"""Drain one demo worker through the eviction API; always uncordon it."""
import json
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

K = ['kubectl', '--context', 'kind-pulse-demo']

def call(*args):
    return subprocess.check_output(K + list(args), text=True)

pods = json.loads(call('-n', 'pulse', 'get', 'pods', '-o', 'json'))['items']
postgres_node = next(p['spec']['nodeName'] for p in pods if p['metadata']['name'] == 'postgres-0')
workers = [n for n in call('get', 'nodes', '-o', 'jsonpath={.items[*].metadata.name}').split() if 'control-plane' not in n and n != postgres_node]
assert workers, 'No worker can be drained without moving the local PostgreSQL volume'
node = workers[0]
start = time.monotonic()
result = {'date': datetime.now(timezone.utc).isoformat(), 'node': node, 'postgresNodeExcluded': postgres_node}
try:
    drain = subprocess.run(K + ['drain', node, '--ignore-daemonsets', '--delete-emptydir-data', '--timeout=120s'], text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    result['exitCode'] = drain.returncode
    result['output'] = drain.stdout
    result['seconds'] = round(time.monotonic() - start, 2)
    if drain.returncode == 0:
        call('-n', 'pulse', 'rollout', 'status', 'deployment/gateway', '--timeout=120s')
        result['readyGateways'] = json.loads(call('-n', 'pulse', 'get', 'deployment', 'gateway', '-o', 'json'))['status'].get('readyReplicas', 0)
        assert result['readyGateways'] >= 2
finally:
    call('uncordon', node)
result['scope'] = 'Voluntary local worker drain with eviction/PDB enforcement. PostgreSQL local-volume node excluded. Not an abrupt node-loss or database-HA test.'
Path('docs/evidence/node-drain.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
