"""Host-test bridge only. No key, private file or payload is printed in diagnostics."""
import json, sys
from sqlcipher3 import dbapi2 as sqlite

connection = sqlite.connect(sys.argv[1], isolation_level=None)
connection.row_factory = sqlite.Row
for line in sys.stdin:
    request = json.loads(line)
    try:
        method = request['method']
        if method == 'close':
            connection.close()
            print(json.dumps({'id': request['id'], 'result': None}), flush=True)
            break
        sql = request['sql']
        params = request.get('params', [])
        if method == 'exec':
            # executescript can commit a transaction implicitly. Preserve caller's boundary.
            statement = ''
            for character in sql:
                statement += character
                if character == ';' and sqlite.complete_statement(statement):
                    connection.execute(statement)
                    statement = ''
            if statement.strip():
                connection.execute(statement)
            result = None
        else:
            cursor = connection.execute(sql, params)
            if method == 'first':
                row = cursor.fetchone()
                result = dict(row) if row is not None else None
            elif method == 'all':
                result = [dict(row) for row in cursor.fetchall()]
            elif method == 'run':
                result = {'changes': max(cursor.rowcount, 0)}
            else:
                raise ValueError('Unknown method')
        print(json.dumps({'id': request['id'], 'result': result}), flush=True)
    except Exception:
        print(json.dumps({'id': request['id'], 'error': 'Host SQLCipher operation failed'}), flush=True)
