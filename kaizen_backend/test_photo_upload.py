"""
Test script for photo upload / retrieval API endpoints.
Run as: python test_photo_upload.py
"""
import io, json, os, sys, http.client

sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kaizen_backend.settings')

import django
django.setup()

from kaizens.models import Kaizen

k = Kaizen.objects.first()
if not k:
    print('ERROR: No Kaizens in database. Seed some first.')
    sys.exit(1)

print(f'Testing photo upload for Kaizen: {k.sr_no} (ID: {k.id})')

# Minimal 1x1 red PNG bytes (valid PNG file)
PNG_1x1 = bytes([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
    0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
    0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC,
    0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
    0x44, 0xAE, 0x42, 0x60, 0x82
])

boundary = 'testrealboundary1234'

def make_multipart(photo_type, filename, file_bytes, content_type='image/png'):
    body = (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="photo_type"\r\n\r\n'
        f'{photo_type}\r\n'
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="image"; filename="{filename}"\r\n'
        f'Content-Type: {content_type}\r\n\r\n'
    ).encode() + file_bytes + f'\r\n--{boundary}--\r\n'.encode()
    return body

# Test: Upload BEFORE photo
print('\n--- Testing BEFORE photo upload ---')
body = make_multipart('before', 'test_before.png', PNG_1x1)
conn = http.client.HTTPConnection('127.0.0.1', 8000)
conn.request(
    'POST',
    f'/api/v1/kaizens/{k.id}/upload-photo/',
    body=body,
    headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
)
resp = conn.getresponse()
data = json.loads(resp.read())
print(f'Status: {resp.status}')
print(f'Response: {json.dumps(data, indent=2)}')

# Test: Upload AFTER photo
print('\n--- Testing AFTER photo upload ---')
body2 = make_multipart('after', 'test_after.png', PNG_1x1)
conn2 = http.client.HTTPConnection('127.0.0.1', 8000)
conn2.request(
    'POST',
    f'/api/v1/kaizens/{k.id}/upload-photo/',
    body=body2,
    headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
)
resp2 = conn2.getresponse()
data2 = json.loads(resp2.read())
print(f'Status: {resp2.status}')
print(f'Response: {json.dumps(data2, indent=2)}')

# Test: GET photo URLs
print('\n--- Testing GET /photo-urls/ ---')
conn3 = http.client.HTTPConnection('127.0.0.1', 8000)
conn3.request('GET', f'/api/v1/kaizens/{k.id}/photo-urls/')
resp3 = conn3.getresponse()
data3 = json.loads(resp3.read())
print(f'Status: {resp3.status}')
print(f'Response: {json.dumps(data3, indent=2)}')

# Test: Verify files exist on disk
print('\n--- Checking disk storage ---')
k.refresh_from_db()
print(f'photo_before field: {k.photo_before}')
print(f'photo_after field: {k.photo_after}')

if k.photo_before:
    exists = os.path.exists(k.photo_before.path)
    print(f'photo_before on disk: {k.photo_before.path} -> EXISTS={exists}')

if k.photo_after:
    exists = os.path.exists(k.photo_after.path)
    print(f'photo_after on disk: {k.photo_after.path} -> EXISTS={exists}')

print('\n=== ALL TESTS COMPLETE ===')
