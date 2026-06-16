# BigQuery Release Notes Hub

A premium, interactive web application built with Python Flask and vanilla HTML, CSS, and JavaScript. It aggregates the Google Cloud BigQuery XML release notes feed, parses individual updates, and provides a sleek interface to search, filter, and share updates on X (Twitter).

## Features
- **Interactive Feed Aggregator**: Fetches and parses the official BigQuery Release Notes RSS/Atom feed directly.
- **Granular Parsing**: Splits daily releases into individual items (e.g. *Features*, *Issues*, *Changes*) for easy readability.
- **Interactive Tag Filters & Search**: Filter updates by category or query them instantly.
- **Sleek Dark Mode & Glassmorphism Design**: High-end look utilizing glowing background accents, clean typography, backdrop filters, and slide-in animations.
- **Twitter/X Composer & Preview**: Selecting any card automatically drafts a tweet conforming to Twitter's character limits, with custom hashtags and URLs. Includes a real-time character limit counter (adjusts URL size for exact counting).
- **Responsive Layout**: Works flawlessly on desktops, tablets, and mobile devices (collapsible sharing drawer on smaller viewports).

## Requirements
- Python 3.12+
- Packages: `flask`, `requests`

## Getting Started

1. Clone or navigate to this project directory:
   ```bash
   cd C:\Users\Pavan\agy-cli-projects
   ```

2. Install the python dependencies:
   ```bash
   pip install -r requirements.txt
   # or manually:
   pip install flask requests
   ```

3. Run the Flask development server:
   ```bash
   python app.py
   ```

4. Open your web browser and navigate to:
   ```text
   http://127.0.0.1:5000
   ```

## Project Structure
- `app.py`: Flask server backend that fetches the BigQuery release feed and serves the API.
- `templates/index.html`: Modern, SEO-optimized page structure and HTML templates.
- `static/css/style.css`: Glassmorphic styling, animations, colors, variables, and responsive layout guidelines.
- `static/js/app.js`: DOM parsing, filter execution, tweet drafting logic, and UI interactions.
