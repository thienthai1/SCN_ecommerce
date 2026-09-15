#!/usr/bin/env python3
"""Local Linux app lifecycle manager. Uses only the Python standard library."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parent.parent
STATE = ROOT / '.run'
APPS = {
    'backend': ['npm', 'start'],
    'frontend': ['npm', 'run', 'dev'],
    'mockup': ['npm', 'run', 'dev'],
}


def process_info(pid):
    try:
        # comm may contain spaces or parentheses; fields after it start at state.
        fields = Path(f'/proc/{pid}/stat').read_text().rsplit(')', 1)[1].split()
        return {'state': fields[0], 'group': int(fields[2]),
                'session': int(fields[3]), 'start': int(fields[19])}
    except (OSError, ValueError, IndexError):
        return None


def members(record):
    """Match the saved session and birth time, including surviving npm children."""
    leader = process_info(record['pid'])
    if leader and leader['start'] != record['start']:
        return []  # PID has been reused: never signal this process/session.
    found = []
    for entry in Path('/proc').iterdir():
        if not entry.name.isdigit():
            continue
        info = process_info(entry.name)
        if (info and info['state'] != 'Z'
                and info['session'] == record['pid']
                and info['group'] == record['pid']
                and info['start'] >= record['start']):
            found.append(int(entry.name))
    return found


def state_path(app):
    return STATE / f'{app}.json'


def read_state(app):
    path = state_path(app)
    if not path.exists():
        return None
    try:
        record = json.loads(path.read_text())
        if (type(record['pid']) is not int or record['pid'] <= 1
                or type(record['start']) is not int):
            raise ValueError('invalid PID or start time')
        return record
    except (OSError, ValueError, KeyError, TypeError) as exc:
        raise RuntimeError(f'Cannot read {path}: {exc}') from exc


def running(app):
    record = read_state(app)
    return record if record and members(record) else None


def preflight(app, force=False):
    if not force and running(app):
        return []
    errors = []
    if not shutil.which('npm') or not shutil.which('node'):
        errors.append('Node.js and npm must be installed')
    if app == 'backend' and shutil.which('node'):
        version = subprocess.run(['node', '-p', 'process.versions.node'], capture_output=True, text=True)
        try:
            parts = tuple(int(part) for part in version.stdout.strip().split('.'))
            if version.returncode or parts < (22, 13, 0):
                errors.append('backend: Node.js 22.13+ is required for local SQLite')
        except ValueError:
            errors.append('backend: could not determine Node.js version')
    if not (ROOT / app / 'node_modules').is_dir():
        errors.append(f'{app}: dependencies missing; run npm --prefix {app} install')
    return errors


def stop(app):
    record = running(app)
    if not record:
        state_path(app).unlink(missing_ok=True)
        print(f'{app}: STOPPED (already stopped)', flush=True)
        return
    print(f'{app}: stopping...', flush=True)
    try:
        os.killpg(record['pid'], signal.SIGTERM)
    except ProcessLookupError:
        pass
    deadline = time.monotonic() + 10
    while members(record) and time.monotonic() < deadline:
        time.sleep(0.1)
    if members(record):
        # Recheck ownership before escalating to SIGKILL.
        try:
            os.killpg(record['pid'], signal.SIGKILL)
        except ProcessLookupError:
            pass
        deadline = time.monotonic() + 3
        while members(record) and time.monotonic() < deadline:
            time.sleep(0.1)
    if members(record):
        raise RuntimeError(f'{app}: could not stop; retained state for retry')
    state_path(app).unlink(missing_ok=True)
    print(f'{app}: STOPPED', flush=True)


def start(app):
    record = running(app)
    if record:
        print(f'{app}: RUNNING (already started, PID {record["pid"]})', flush=True)
        return False
    state_path(app).unlink(missing_ok=True)
    log_path = STATE / f'{app}.log'
    with log_path.open('ab', buffering=0) as log:
        log.write(f'\n--- start {time.strftime("%Y-%m-%d %H:%M:%S %z")} ---\n'.encode())
        child = subprocess.Popen(APPS[app], cwd=ROOT / app,
                                 stdin=subprocess.DEVNULL, stdout=log, stderr=log,
                                 start_new_session=True, close_fds=True)
    try:
        info = process_info(child.pid)
        if not info:
            raise RuntimeError(f'{app}: exited immediately; see {log_path}')
        record = {'pid': child.pid, 'start': info['start']}
        state_path(app).write_text(json.dumps(record) + '\n')
        # Catch immediate configuration errors; this is not a health check.
        time.sleep(2)
        if child.poll() is not None:
            stop(app)
            raise RuntimeError(f'{app}: startup failed; see {log_path}')
    except BaseException:
        if child.poll() is None:
            os.killpg(child.pid, signal.SIGTERM)
        raise
    print(f'{app}: RUNNING (PID {child.pid}); log: {log_path}', flush=True)
    return True


def main():
    parser = argparse.ArgumentParser(description='Start/stop local development apps (Linux + Python 3.8+).')
    parser.add_argument('action', choices=['start', 'stop', 'restart', 'status'])
    parser.add_argument('app', nargs='?', default='all',
                        choices=['all', 'backend', 'frontend', 'backoffice', 'mockup'])
    args = parser.parse_args()
    selected = list(APPS) if args.app == 'all' else [
        'frontend' if args.app == 'backoffice' else args.app]
    STATE.mkdir(mode=0o700, exist_ok=True)
    # Serialize lifecycle commands; children must not inherit this lock.
    with (STATE / 'manager.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if args.action == 'status':
            all_running = True
            for app in selected:
                record = running(app)
                if record:
                    print(f'{app}: RUNNING (PID {record["pid"]})')
                else:
                    print(f'{app}: STOPPED')
                    all_running = False
            return 0 if all_running else 1
        if args.action in ('start', 'restart'):
            # Check all selected apps before starting or stopping anything.
            errors = [error for app in selected for error in preflight(app, force=args.action == 'restart')]
            if errors:
                raise RuntimeError('\n'.join(errors))
        if args.action in ('stop', 'restart'):
            for app in reversed(selected):
                stop(app)
        if args.action in ('start', 'restart'):
            started = []
            try:
                for app in selected:
                    if start(app):
                        started.append(app)
            except BaseException:
                for app in reversed(started):
                    stop(app)
                raise
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (RuntimeError, OSError) as exc:
        print(f'Error: {exc}', file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        sys.exit(130)
