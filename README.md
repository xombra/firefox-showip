# firefox-showip
Automatically exported from code.google.com/p/firefox-showip

What steps will reproduce the problem?
1. Use a packet sniffer like Wireshark to watch your DNS (udp.port == 53)
connections
2. Change your Firefox network settings to use a socks proxy, something
like tor with torbutton making it easier
3. Go to a site in your Firefox location bar that doesn't have its address
cached


What is the expected output? What do you see instead?

The expected output in Wireshark would be no DNS requests, but they happen
anyways.


What version of the product are you using? On what operating system?

Version 0.8.14, Vista Home Premium 64

Please provide any additional information below.

If this cannot be fixed a warning about using socks for DNS requests and
privacy would be useful.
