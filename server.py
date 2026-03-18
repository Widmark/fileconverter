#!/usr/bin/env python3
"""
Valfri server för WLI-export med garanterad Windows-1252 (ANSI).
Om å, ä, ö inte visas korrekt vid export: kör "python server.py" och använd http://localhost:5000
"""
from flask import Flask, send_file, request, send_from_directory
from io import BytesIO

app = Flask(__name__, static_folder='.', static_url_path='')

def convert_pay_type_id(pid):
    return '217' if str(pid).strip() == '218' else str(pid).strip()

def format_date(iso):
    if not iso or len(str(iso).strip()) < 10:
        return '000000'
    t = str(iso).strip()
    return t[2:4] + t[5:7] + t[8:10]

def pad_left(val, length):
    s = str(val)
    return s.zfill(length)[-length:] if len(s) < length else s[:length]

def to_fixed_point(val, length):
    n = float(val) if val is not None else 0
    return pad_left(int(round(n * 100)), length)

def transform_tx(tx):
    return {
        'employmentId': pad_left(tx.get('employmentId', '0'), 13),
        'payTypeId': pad_left(convert_pay_type_id(tx.get('payTypeId', '')), 3),
        'quantity': to_fixed_point(tx.get('quantity'), 10),
        'price': to_fixed_point(tx.get('price'), 10),
        'amount': to_fixed_point(tx.get('amount'), 17),
        'periodStartDate': format_date(tx.get('periodStartDate')),
        'periodEndDate': format_date(tx.get('periodEndDate')),
        'note': (tx.get('note') or '')[:63]
    }

def build_row(tx):
    return ('214031' + tx['employmentId'] + tx['payTypeId'] + ' ' * 10 + ' ' * 14 +
            tx['quantity'] + tx['price'] + tx['amount'] + '00000' +
            tx['periodStartDate'] + tx['periodEndDate'] + tx['note'])

@app.route('/api/export-wli', methods=['POST'])
def export_wli():
    data = request.get_json()
    fi = data.get('fileInfo', {})
    tx_list = data.get('transactions', [])
    transformed = [transform_tx(t) for t in tx_list]
    lines = [
        '000000',
        ';Företag=' + (fi.get('companyName') or ''),
        ';Källa=' + (fi.get('softwareProduct') or ''),
        ';Datum=' + (fi.get('createdDate') or '')
    ] + [build_row(t) for t in transformed] + ['999999']
    content = '\r\n'.join(lines)
    return send_file(
        BytesIO(content.encode('windows-1252')),
        mimetype='text/plain',
        as_attachment=True,
        download_name='output.wli'
    )

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

if __name__ == '__main__':
    app.run(port=5000)
