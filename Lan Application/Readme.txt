-- Running the Application

-- Run Locally (Personal Network)

Start the Flask server:

-bash
python localServer.py


--Then open:

-text
http://127.0.0.1:5000

But if you want run online on web so you need to run both on same time locally. you can Run own [P-server] I use cloudflared its best for small projects:--
-- Run Online using Cloudflare Tunnel

Download Cloudflared and run:

-text
http://127.0.0.1:5000

-bash
cloudflared.exe tunnel --url http://localhost:5000


This will generate a public URL that can be shared online.
