import smtplib
import socket
import ssl
import sys

host = 'smtp.gmail.com'
port = 465
user = 'ixteriaagents@gmail.com'
pw = 'owvaablzwuezdven'

print(f"1. Resolving {host}...")
try:
    ips = socket.getaddrinfo(host, port)
    for ip in ips:
        print(f"   {ip[4]}")
except Exception as e:
    print(f"   DNS ERROR: {e}")
    sys.exit(1)

print(f"\n2. Connecting to {host}:{port} with timeout=10...")
try:
    ctx = ssl.create_default_context()
    s = socket.create_connection((host, port), timeout=10)
    print(f"   TCP connected: {s.getpeername()}")
    ss = ctx.wrap_socket(s, server_hostname=host)
    print(f"   SSL handshake OK: {ss.version()}")
    ss.close()
    print("   SSL socket OK")
except Exception as e:
    print(f"   SOCKET FAIL: {type(e).__name__}: {e}")
    sys.exit(1)

print(f"\n3. Trying SMTP_SSL...")
try:
    s = smtplib.SMTP_SSL(host, port, timeout=10)
    print(f"   SMTP_SSL created, ehlo: {s.ehlo_resp}")
    s.login(user, pw)
    print("   LOGIN OK")
    s.quit()
except Exception as e:
    print(f"   SMTP_SSL FAIL: {type(e).__name__}: {e}")
    sys.exit(1)