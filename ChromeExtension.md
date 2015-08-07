#Document the Extension for Google Chrome and chromium

# Introduction #

DNS records and IP addresses of the current page, display your external IP and links to further information on dns.l4x.org all at your toolbar icon. From the author of the Firefox ShowIP extension.

# Details #

With the 'DNS.l4x.org Resolver' extension you can handily look-up DNS records of the page you're viewing. The extension can show you IPv4 and IPv6 addresses, mail-servers (MX), aliases (CNAME) and nameservers (NS). The addresses are retrieved and link to https://dns.l4x.org, where further information, like whois excerpts and screenshots can be found. The small badge next to the icon informs you in a blink of an eye of the number of found records. As an extra feature, the extension will also show you your externally visible IP address.

# Privacy #

The extension will securely contact https://dns.l4x.org (Run privately by the author of this extension) on each new domain you're visiting to retrieve the necessary data. No personal data is collected, and the IP addresses of the requests will not be linked to the retrieved domain names. If this concerns you, you may want to wait for the next version (due soon), where this behavior can be disabled.

Disclaimer: The data is provided as-is without any guarantee for correctness. The view-point of the returned data (for e.g. geographical load balancers) is a German IP address.

# FAQ #

**Why does it have to contact an external service?**

> Without a native plugin it is not possible to contact DNS servers directly
> from within chrome.