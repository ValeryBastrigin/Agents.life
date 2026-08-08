import urllib.request
import json

# Create multipart form data manually
boundary = '----TestBoundary'
data = b''
data += b'------TestBoundary\r\n'
data += b'Content-Disposition: form-data; name="file"; filename="test.csv"\r\n'
data += b'Content-Type: text/csv\r\n\r\n'
data += b'Date,Description,Amount\n'
data += b'01.03.2026,Transfer from salary,150000\n'
data += b'02.03.2026,Rent payment,-35000\n'
data += b'03.03.2026,Grocery store,-8500\n'
data += b'04.03.2026,Restaurant,-3200\n'
data += b'05.03.2026,Internet bill,-1500\n'
data += b'06.03.2026,Pharmacy,-2400\n'
data += b'07.03.2026,Cash withdrawal,-10000\n'
data += b'08.03.2026,Freelance income,25000\n'
data += b'\r\n'
data += b'------TestBoundary--\r\n'

req = urllib.request.Request(
    'http://localhost:8001/api/accountant/statements/upload/1',
    data=data,
    headers={
        'Content-Type': 'multipart/form-data; boundary=----TestBoundary'
    },
    method='POST'
)
try:
    response = urllib.request.urlopen(req, timeout=60)
    result = json.loads(response.read())
    print('SUCCESS! Status:', result.get('status'))
    txns = result.get('transactions', [])
    print('Found', len(txns), 'transactions:')
    for t in txns:
        print(f'  [{t.get("type")}] {t.get("description")} - {t.get("amount")} ({t.get("category")})')
    print('Total income:', result.get('total_income'))
    print('Total expense:', result.get('total_expense'))
except urllib.error.HTTPError as e:
    print('HTTP Error:', e.code)
    print('Response:', e.read().decode())
except Exception as e:
    print('Error:', e)