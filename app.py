import os
import requests
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Cache for the release notes
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        
        root = ET.fromstring(response.content)
        entries = []
        
        for entry in root.findall('atom:entry', namespaces):
            title_el = entry.find('atom:title', namespaces)
            id_el = entry.find('atom:id', namespaces)
            updated_el = entry.find('atom:updated', namespaces)
            content_el = entry.find('atom:content', namespaces)
            
            title = title_el.text if title_el is not None else "No Date"
            id_val = id_el.text if id_el is not None else ""
            updated = updated_el.text if updated_el is not None else ""
            content = content_el.text if content_el is not None else ""
            
            # Find the alternate link
            link = ""
            link_el = entry.find("atom:link[@rel='alternate']", namespaces)
            if link_el is not None:
                link = link_el.attrib.get('href', '')
            else:
                link_el = entry.find("atom:link", namespaces)
                if link_el is not None:
                    link = link_el.attrib.get('href', '')
            
            entries.append({
                'id': id_val,
                'title': title, # Date of the release notes
                'updated': updated,
                'link': link,
                'content': content
            })
            
        return {
            'success': True,
            'entries': entries
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def get_notes():
    data = fetch_and_parse_feed()
    return jsonify(data)

if __name__ == '__main__':
    # Use port 5000 or custom port
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
