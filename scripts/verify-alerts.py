"""Observe the real Prometheus gateway-down alert, always restoring demo gateways."""
import json
import subprocess
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


def alerts():
    with urllib.request.urlopen('http://localhost:9090/api/v1/alerts') as r:
        return [a for a in json.load(r)['data']['alerts'] if a['labels']['alertname'] == 'PulseGatewayUnavailable']


def wait(firing, timeout):
    start = time.monotonic()
    while time.monotonic() - start < timeout:
        rows = alerts()
        if any(a['state'] == 'firing' for a in rows) == firing:
            return {'seconds': round(time.monotonic() - start, 2), 'alerts': rows}
        time.sleep(3)
    raise TimeoutError('Alert state not observed')


result = {'date': datetime.now(timezone.utc).isoformat()}
try:
    subprocess.run(['docker', 'compose', 'stop', 'gateway', 'gateway-2'], check=True)
    result['outage'] = wait(True, 150)
finally:
    subprocess.run(['docker', 'compose', 'start', 'gateway', 'gateway-2'], check=True)
result['restored'] = wait(False, 90)
Path('docs/evidence/monitoring-alert.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
