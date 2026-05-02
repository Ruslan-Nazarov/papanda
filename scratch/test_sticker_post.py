import requests
import json

url = "http://localhost:4560/api/stickers/"
payload = {
    "text": "test",
    "title": "test",
    "color": "#fff9c4",
    "type": "text"
}
headers = {
    "Content-Type": "application/json"
}

try:
    response = requests.post(url, data=json.dumps(payload), headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
